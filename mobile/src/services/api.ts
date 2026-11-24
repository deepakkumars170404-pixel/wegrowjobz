import { CallRecord, Lead } from "../types";
import { StorageService } from "./storage";
import { supabaseMobile, isSupabaseReady } from "./supabase";
import { TelephonyService } from "./telephony";

export const ApiService = {
  async getBaseUrl(): Promise<string> {
    const activeMode = await StorageService.getAppMode();
    const settings = await StorageService.getSettings();
    if (activeMode === "jobz") {
      // In Jobz CRM, Supabase Cloud handles 100% of data. Do not fallback to Admission Vercel URL.
      const url = settings.jobzServerUrl || "";
      if (!url || url.includes("wegrowcrm.vercel.app") || url.includes("192.168.1.41")) {
        return "";
      }
      return url.endsWith("/") ? url.slice(0, -1) : url;
    }
    let url = settings.admissionServerUrl || "https://wegrowcrm.vercel.app";
    if (!url || url.includes("192.168.1.41")) {
      url = "https://wegrowcrm.vercel.app";
    }
    if (url.endsWith("/")) url = url.slice(0, -1);
    return url;
  },

  async getTodayStaffMetrics(callerName: string): Promise<{ totalCalls: number; spokenSeconds: number }> {
    const today = new Date().toISOString().split("T")[0];
    let totalCalls = 0;
    let spokenSeconds = 0;

    if (isSupabaseReady() && supabaseMobile) {
      try {
        const { data, error } = await supabaseMobile
          .from("jobz_calls")
          .select("duration_seconds, outcome")
          .eq("call_date", today)
          .ilike("caller_name", `%${callerName}%`);

        if (!error && data && data.length > 0) {
          const attended = data.filter(
            (c: any) => (c.duration_seconds || 0) > 0 || c.outcome === "Attended Call"
          );
          totalCalls = attended.length;
          spokenSeconds = data.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0);
          return { totalCalls, spokenSeconds };
        }
      } catch (err) {
        console.warn("Supabase getTodayStaffMetrics error:", err);
      }
    }

    // Fallback: check local storage
    try {
      const history = await StorageService.getCallHistory();
      const todayCalls = history.filter(
        (c) =>
          c.callDate === today &&
          (!c.callerName || c.callerName.toLowerCase().includes(callerName.toLowerCase()))
      );
      const attended = todayCalls.filter(
        (c) => (c.durationSeconds || 0) > 0 || c.outcome === "Attended Call"
      );
      totalCalls = attended.length;
      spokenSeconds = todayCalls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0);
    } catch {}

    return { totalCalls, spokenSeconds };
  },

  async fetchTodayQueue(): Promise<{ success: boolean; leads: Lead[]; error?: string }> {
    const activeMode = await StorageService.getAppMode();
    const isJobz = activeMode === "jobz";
    const leadsTable = isJobz ? "jobz_leads" : "leads";
    const followUpsTable = isJobz ? "jobz_follow_ups" : "follow_ups";
    const callsRelation = isJobz ? "jobz_calls(*)" : "calls(*)";

    // 1. First try Supabase Cloud (Works from ANYWHERE on 4G/5G mobile data or Wi-Fi)
    if (isSupabaseReady() && supabaseMobile) {
      try {
        let dbLeads: any[] | null = null;
        let dbFollowUps: any[] = [];

        // Fetch from target table
        const { data, error } = await supabaseMobile
          .from(leadsTable)
          .select(`*, ${callsRelation}`)
          .order("created_at", { ascending: false });

        if (!error && data) {
          dbLeads = data;
        }

        // Fetch follow ups
        try {
          const { data: fuData, error: fuErr } = await supabaseMobile
            .from(followUpsTable)
            .select("*")
            .neq("status", "Completed");
          if (!fuErr && fuData) {
            dbFollowUps = fuData;
          }
        } catch {}

        if (dbLeads && dbLeads.length > 0) {
          const leads: Lead[] = dbLeads.map((l: any) => {
            const clean = (l.phone || "").replace(/\D/g, "").slice(-10);
            const matchingFu = dbFollowUps.find(
              (fu: any) =>
                fu.lead_id === l.id ||
                (fu.phone && String(fu.phone).replace(/\D/g, "").endsWith(clean))
            );

            const fuDate = l.next_follow_up_date || (matchingFu ? matchingFu.scheduled_date || matchingFu.follow_up_date : "") || "";
            const fuTime = l.next_follow_up_time || (matchingFu ? matchingFu.scheduled_time || matchingFu.follow_up_time : "") || "";

            return {
              id: l.id,
              studentName: l.student_name,
              phone: l.phone,
              email: l.email || "",
              courseInterested: l.course_interested || l.preferred_domain || "",
              preferredDomain: l.preferred_domain || l.course_interested || "",
              experienceYears: l.experience_years || "",
              currentCompany: l.current_company || "",
              expectedSalary: l.expected_salary || "",
              noticePeriod: l.notice_period || "",
              leadSource: l.lead_source || (isJobz ? "Job Portal" : "Phone"),
              enquiryDate: l.enquiry_date || "",
              nextFollowUpDate: fuDate,
              nextFollowUpTime: fuTime,
              assignedCaller: l.assigned_caller || (matchingFu ? matchingFu.caller_name : "") || "",
              status: l.status || "Interested",
              priority: l.priority || "Warm",
              stage: l.stage || (fuDate ? "Call Scheduled" : "Interested"),
              callCount: l.call_count || (l.calls ? l.calls.length : 0),
              qualification: l.qualification || "",
              passedOutYear: l.passed_out_year || "",
              collegeName: l.college_name || "",
              notes: [],
              appMode: activeMode,
              callRecordingUri: l.call_recording_uri || "",
            };
          });

          const seenPhones = new Set<string>();
          const dedupedLeads: Lead[] = [];
          for (const l of leads) {
            const cleanPhone = (l.phone || "").replace(/\D/g, "").slice(-10);
            const lowerName = (l.studentName || "").toLowerCase().trim();
            // Filter out dummy test numbers and test names
            if (cleanPhone === "1234567890" || cleanPhone === "9876543210" || lowerName === "test" || lowerName === "dummy") {
              continue;
            }

            const key = cleanPhone || l.id;
            if (!seenPhones.has(key)) {
              seenPhones.add(key);
              dedupedLeads.push(l);
            }
          }

          await StorageService.saveCachedLeads(dedupedLeads);
          // Auto-register callers present in downloaded leads
          const callersInLeads = Array.from(new Set(dedupedLeads.map(l => (l.assignedCaller || '').trim()).filter(Boolean)));
          for (const c of callersInLeads) {
            await StorageService.addStaffMember(c);
          }
          return { success: true, leads: dedupedLeads };
        } else if (dbLeads && dbLeads.length === 0) {
          // Table exists but has 0 leads
          return { success: true, leads: [] };
        }
      } catch (sbErr) {
        console.warn("Supabase fetch queue error:", sbErr);
      }
    }

    // 2. Try Local CRM Server Wi-Fi (Only if baseUrl configured, with 2-second timeout)
    try {
      const baseUrl = await this.getBaseUrl();
      if (baseUrl && baseUrl.startsWith("http")) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${baseUrl}/api/leads`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const rawLeads: any[] = Array.isArray(data) ? data : data.leads || [];
          const rawFu: any[] = Array.isArray(data.followUps) ? data.followUps : [];

          const seenPhones = new Set<string>();
          const dedupedLeads: Lead[] = [];
          for (const l of rawLeads) {
            const cleanPhone = (l.phone || "").replace(/\D/g, "").slice(-10);
            const matchingFu = rawFu.find(
              (fu: any) =>
                fu.leadId === l.id ||
                (fu.phone && String(fu.phone).replace(/\D/g, "").endsWith(cleanPhone))
            );

            const fuDate = l.nextFollowUpDate || (matchingFu ? matchingFu.followUpDate || matchingFu.scheduled_date : "") || "";
            const fuTime = l.nextFollowUpTime || (matchingFu ? matchingFu.followUpTime || matchingFu.scheduled_time : "") || "";

            const formattedLead: Lead = {
              ...l,
              nextFollowUpDate: fuDate,
              nextFollowUpTime: fuTime,
              stage: l.stage || (fuDate ? "Call Scheduled" : "Interested"),
            };

            const key = cleanPhone || l.id;
            if (!seenPhones.has(key)) {
              seenPhones.add(key);
              dedupedLeads.push(formattedLead);
            }
          }
          if (dedupedLeads.length > 0) {
            await StorageService.saveCachedLeads(dedupedLeads);
            const callersInLeads = Array.from(new Set(dedupedLeads.map(l => (l.assignedCaller || '').trim()).filter(Boolean)));
            for (const c of callersInLeads) {
              await StorageService.addStaffMember(c);
            }
          }
          return { success: true, leads: dedupedLeads };
        }
      }
    } catch {}

    // 3. Fallback to offline cached leads on phone storage
    const cached = await StorageService.getCachedLeads();
    return {
      success: false,
      leads: cached,
      error: "Loaded offline cache.",
    };
  },

  async fetchAllCalls(): Promise<{ success: boolean; calls: CallRecord[]; error?: string }> {
    const collectedCalls: CallRecord[] = [];
    const seenSignatures = new Set<string>();

    const makeCallSig = (phone?: string, date?: string, time?: string) => {
      const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
      const cleanDate = String(date || "").trim();
      const cleanTime = String(time || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
      return `${cleanPhone}_${cleanDate}_${cleanTime}`;
    };

    const addUniqueCall = (c: CallRecord) => {
      const sig = makeCallSig(
        c.phone || c.studentPhone,
        c.callDate,
        c.callTime || c.fromTime || c.callStartTime
      );
      const idKey = c.id || sig;
      if (!seenSignatures.has(idKey) && (!sig || !seenSignatures.has(sig))) {
        seenSignatures.add(idKey);
        if (sig) seenSignatures.add(sig);
        collectedCalls.push(c);
      }
    };

    // 1. Fetch directly from Supabase Cloud (jobz_calls)
    if (isSupabaseReady() && supabaseMobile) {
      try {
        const activeMode = await StorageService.getAppMode();
        const callsTable = activeMode === "jobz" ? "jobz_calls" : "calls";

        const { data: dbCalls, error: cErr } = await supabaseMobile
          .from(callsTable)
          .select("*")
          .order("created_at", { ascending: false });

        if (!cErr && dbCalls && dbCalls.length > 0) {
          dbCalls.forEach((c: any) => {
            const rawDur = c.duration_seconds ?? c.durationSeconds;
            const parsedDur =
              typeof rawDur === "number"
                ? rawDur
                : typeof c.duration === "string" && c.duration.includes(":")
                ? c.duration.split(":").reduce((acc: number, time: string) => 60 * acc + +time, 0)
                : 0;
            const formatted =
              c.duration ||
              `${Math.floor(parsedDur / 60)
                .toString()
                .padStart(2, "0")}:${(parsedDur % 60).toString().padStart(2, "0")}`;
            const timeVal = c.call_time || c.from_time || "";
            const dateVal = c.call_date || "";

            addUniqueCall({
              id: c.id,
              leadId: c.lead_id || "",
              studentName: c.student_name || "Candidate",
              phone: c.phone || "",
              studentPhone: c.phone || "",
              callerName: c.caller_name || "Staff",
              disposition: c.mindset || c.outcome || "Interested",
              outcome: c.outcome || (parsedDur > 0 ? "Attended Call" : "Not Attended Call"),
              mindset: c.mindset || c.outcome || "",
              durationSeconds: parsedDur,
              duration_seconds: parsedDur,
              formattedDuration: formatted,
              duration: formatted,
              durationFormatted: c.duration_formatted || `${parsedDur} seconds`,
              qualification: c.qualification || "",
              passedOutYear: c.passed_out_year || "",
              collegeName: c.college_name || "",
              courseInterested: c.course_interested || c.preferred_domain || "",
              preferredDomain: c.preferred_domain || c.course_interested || "",
              experienceYears: c.experience_years || "",
              studentCourse: c.course_interested || "",
              callStartTime: c.from_time || timeVal,
              callEndTime: c.end_time || timeVal,
              callDate: dateVal,
              callTime: timeVal,
              fromTime: c.from_time || timeVal,
              endTime: c.end_time || timeVal,
              notes: c.remarks || "",
              remarks: c.remarks || "",
              timestamp: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
              syncedToCrm: true,
              callRecordingUri: c.call_recording_uri || "",
            });
          });
        }
      } catch (sbCallsErr) {
        console.warn("Supabase fetch calls error:", sbCallsErr);
      }
    }

    // 2. Merge pending offline calls (so offline calls appear immediately)
    try {
      const pendingCalls = await StorageService.getPendingCalls();
      pendingCalls.forEach((local) => {
        addUniqueCall(local);
      });
    } catch {}

    // Sort calls newest first
    collectedCalls.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (collectedCalls.length > 0) {
      await StorageService.saveCallHistory(collectedCalls);
      return { success: true, calls: collectedCalls };
    }

    // 3. Fallback: cached local calls if completely offline
    const cachedHistory = await StorageService.getCallHistory();
    return { success: false, calls: cachedHistory, error: "Offline mode. Showing cached calls." };
  },

  async fetchCallStatus(): Promise<{ success: boolean; data?: any }> {
    try {
      const baseUrl = await this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/mobile/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  },

  async logCallOutcome(record: CallRecord): Promise<{ success: boolean; error?: string }> {
    let cloudSynced = false;

    const activeMode = await StorageService.getAppMode();
    const isJobz = activeMode === "jobz";
    const leadsTable = isJobz ? "jobz_leads" : "leads";
    const callsTable = isJobz ? "jobz_calls" : "calls";
    const followUpsTable = isJobz ? "jobz_follow_ups" : "follow_ups";

    let safeLeadId = record.leadId;
    const cleanDigits = (record.phone || "").replace(/\D/g, "");
    const last10 = cleanDigits.slice(-10);

    // If Supabase is ready, check if this phone already exists in leadsTable to use existing lead ID
    if (isSupabaseReady() && supabaseMobile && last10) {
      try {
        const { data: existingLeads } = await supabaseMobile
          .from(leadsTable)
          .select("id")
          .like("phone", `%${last10}`)
          .limit(1);
        if (existingLeads && existingLeads.length > 0 && existingLeads[0].id) {
          safeLeadId = existingLeads[0].id;
        }
      } catch {}
    }
    if (!safeLeadId || safeLeadId.startsWith("inq-")) {
      safeLeadId = `LD-MOB-${Date.now()}`;
    }
    record.leadId = safeLeadId;
    const callId = record.id || `cr-mob-${Date.now()}`;

    const mappedStatus =
      record.disposition === "Not Interested"
        ? "Lost"
        : record.disposition === "Visit to Institute"
        ? "Counselling Scheduled"
        : record.disposition === "Joined"
        ? "Admitted"
        : record.disposition;

    const dateStr = new Date().toISOString().split("T")[0];
    const endMs = record.timestamp || Date.now();
    const durSec = typeof record.durationSeconds === "number" ? record.durationSeconds : 0;
    const startMs = endMs - durSec * 1000;
    const formatTimeWithSec = (d: Date) =>
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

    const validStartTime =
      record.callStartTime &&
      record.callStartTime !== "11:59 AM" &&
      record.callStartTime !== record.callEndTime
        ? record.callStartTime
        : formatTimeWithSec(new Date(startMs));

    const validEndTime =
      record.callEndTime && record.callEndTime !== "11:59 AM"
        ? record.callEndTime
        : formatTimeWithSec(new Date(endMs));

    // 1. DIRECT SYNC TO SUPABASE CLOUD (Zero dependency on same Wi-Fi!)
    // Works wherever phone is connected: Jio/Airtel 4G/5G, Hotspot, or any Wi-Fi!
    if (isSupabaseReady() && supabaseMobile) {
      try {
        // Build composite course/domain & remarks info
        const targetDomain = record.preferredDomain || record.courseInterested || "General Enquiry";
        const academicInfo = [
          record.qualification ? `Qual: ${record.qualification}` : "",
          record.passedOutYear ? `Year: ${record.passedOutYear}` : "",
          record.collegeName ? `College: ${record.collegeName}` : "",
          record.experienceYears ? `Exp: ${record.experienceYears}` : "",
          record.expectedSalary ? `Salary: ${record.expectedSalary}` : "",
        ]
          .filter(Boolean)
          .join(" • ");

        const combinedRemarks = record.notes
          ? `${record.notes}${academicInfo ? ` [${academicInfo}]` : ""}`
          : `Inquiry handled by ${record.callerName}. Spoke for ${record.formattedDuration} (${validStartTime} - ${validEndTime}). Mindset: ${record.disposition}${academicInfo ? ` [${academicInfo}]` : ""}`;

        // STEP 1: UPSERT LEAD FIRST (CRITICAL: Satisfies foreign key constraint in calls table!)
        const leadPayload: any = {
          id: safeLeadId,
          student_name: record.studentName || "Candidate",
          phone: record.phone,
          course_interested: targetDomain,
          status: mappedStatus,
          stage: mappedStatus,
          assigned_caller: record.callerName || "Staff",
          last_call_date: dateStr,
          last_call_outcome: record.disposition,
          qualification: record.qualification || null,
          passed_out_year: record.passedOutYear || null,
          college_name: record.collegeName || null,
          next_follow_up_date: record.nextFollowUpDate || null,
          next_follow_up_time: record.nextFollowUpTime || null,
          updated_at: new Date().toISOString(),
        };

        const { error: lErr } = await supabaseMobile.from(leadsTable).upsert(
          leadPayload,
          { onConflict: "id" }
        );

        if (lErr) {
          console.warn(`Mobile Supabase ${leadsTable} upsert error:`, lErr);
        }

        // STEP 2: UPSERT CALL SECOND (with valid lead_id)
        const callPayload: any = {
          id: callId,
          lead_id: safeLeadId,
          student_name: record.studentName || "Candidate",
          phone: record.phone,
          caller_name: record.callerName || "Staff",
          call_date: dateStr,
          call_time: validStartTime,
          duration: record.formattedDuration,
          duration_formatted: `${record.durationSeconds} seconds`,
          duration_seconds: record.durationSeconds,
          from_time: validStartTime,
          end_time: validEndTime,
          outcome: record.durationSeconds > 0 ? "Attended Call" : "Not Attended Call",
          mindset: record.disposition,
          course_interested: targetDomain,
          qualification: record.qualification || null,
          passed_out_year: record.passedOutYear || null,
          college_name: record.collegeName || null,
          remarks: combinedRemarks,
        };

        const { error: cErr } = await supabaseMobile.from(callsTable).upsert(
          callPayload,
          { onConflict: "id" }
        );

        if (cErr) {
          console.warn(`Mobile Supabase ${callsTable} call upsert error:`, cErr);
        }

        // STEP 3: UPSERT FOLLOW-UP TASK IF SCHEDULED
        if (record.nextFollowUpDate) {
          const fuPayload: any = {
            id: `fu-${safeLeadId}-${Date.now()}`,
            lead_id: safeLeadId,
            student_name: record.studentName,
            phone: record.phone,
            caller_name: record.callerName,
            course: targetDomain,
            scheduled_date: record.nextFollowUpDate,
            scheduled_time: record.nextFollowUpTime || "10:30 AM",
            status: "Pending",
            remarks: combinedRemarks,
          };
          await supabaseMobile.from(followUpsTable).upsert(
            fuPayload,
            { onConflict: "id" }
          );
        }

        if (!cErr) {
          cloudSynced = true;
        }
      } catch (sbErr) {
        console.warn("Mobile Supabase direct sync error:", sbErr);
      }
    }

    // 2. Secondary CRM Server sync:
    // If already synced via Supabase direct, run secondary notification in background without blocking (<200ms save time)
    if (cloudSynced) {
      this.getBaseUrl().then((baseUrl) => {
        if (baseUrl && baseUrl.startsWith("http")) {
          fetch(`${baseUrl}/api/calls/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: callId,
              leadId: safeLeadId,
              studentName: record.studentName,
              phone: record.phone,
              callerName: record.callerName,
              disposition: record.disposition,
              durationSeconds: record.durationSeconds,
              courseInterested: record.courseInterested,
              preferredDomain: record.preferredDomain || record.courseInterested,
              experienceYears: record.experienceYears,
              expectedSalary: record.expectedSalary,
              callStartTime: validStartTime,
              callEndTime: validEndTime,
              qualification: record.qualification,
              passedOutYear: record.passedOutYear,
              collegeName: record.collegeName,
              notes: record.notes,
              nextFollowUpDate: record.nextFollowUpDate,
              nextFollowUpTime: record.nextFollowUpTime,
              channel: "Mobile SIM Dialer",
            }),
          }).catch(() => {});
        }
      }).catch(() => {});
    } else {
      // If Supabase failed (or offline), try baseUrl synchronously with a fast 1500ms timeout
      try {
        const baseUrl = await this.getBaseUrl();
        if (baseUrl && baseUrl.startsWith("http")) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);

          const res = await fetch(`${baseUrl}/api/calls/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              id: callId,
              leadId: safeLeadId,
              studentName: record.studentName,
              phone: record.phone,
              callerName: record.callerName,
              disposition: record.disposition,
              durationSeconds: record.durationSeconds,
              courseInterested: record.courseInterested,
              preferredDomain: record.preferredDomain || record.courseInterested,
              experienceYears: record.experienceYears,
              expectedSalary: record.expectedSalary,
              callStartTime: validStartTime,
              callEndTime: validEndTime,
              qualification: record.qualification,
              passedOutYear: record.passedOutYear,
              collegeName: record.collegeName,
              notes: record.notes,
              nextFollowUpDate: record.nextFollowUpDate,
              nextFollowUpTime: record.nextFollowUpTime,
              channel: "Mobile SIM Dialer",
            }),
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            cloudSynced = true;
          }
        }
      } catch {}
    }

    record.syncedToCrm = cloudSynced;
    await StorageService.addCallRecord(record);

    if (cloudSynced) {
      return { success: true };
    } else {
      // Offline fallback: save into pending queue so it auto-syncs when online
      await StorageService.addPendingCall(record);
      return { success: true, error: "Saved locally. Auto-syncing to cloud." };
    }
  },

  async syncPendingCalls(): Promise<{ syncedCount: number }> {
    const pending = await StorageService.getPendingCalls();
    if (pending.length === 0) return { syncedCount: 0 };

    let successCount = 0;
    const remaining: CallRecord[] = [];

    for (const record of pending) {
      const res = await this.logCallOutcome(record);
      if (res.success) {
        successCount++;
      } else {
        remaining.push(record);
      }
    }

    if (remaining.length === 0) {
      await StorageService.clearPendingCalls();
    } else {
      await StorageService.savePendingCalls(remaining);
    }
    return { syncedCount: successCount };
  },

  async syncAttendanceRecord(att: any): Promise<boolean> {
    if (!isSupabaseReady() || !supabaseMobile) return false;
    try {
      const activeMode = await StorageService.getAppMode();
      const attTable = "jobz_attendance";

      const payload: any = {
        id: att.id || `att-${att.date}-${att.callerName}`,
        caller_name: att.callerName,
        date: att.date,
        login_time: att.loginTime,
        logout_time: att.logoutTime || null,
        total_calls_today: att.totalCallsToday || 0,
        spoken_seconds: att.spokenSeconds || 0,
        working_hours_formatted: att.workingHoursFormatted || null,
        status: att.status || "Punched In",
        updated_at: new Date().toISOString(),
      };
      await supabaseMobile.from(attTable).upsert(payload, { onConflict: "id" });
      return true;
    } catch {
      return false;
    }
  },

  // Instant Cloud Search across BOTH Jobz & Admission databases for incoming caller ID
  async lookupLeadFromCloudUnified(rawPhone: string): Promise<Lead | null> {
    if (!rawPhone || !isSupabaseReady() || !supabaseMobile) return null;
    const cleanDigits = rawPhone.replace(/\D/g, "");
    const last10 = cleanDigits.slice(-10);
    if (!last10) return null;

    try {
      // 1. Search Supabase Jobz Leads
      const { data: jobzData } = await supabaseMobile
        .from("jobz_leads")
        .select("*")
        .ilike("phone", `%${last10}%`)
        .limit(1);

      if (jobzData && jobzData.length > 0) {
        const l = jobzData[0];
        // Fetch latest call outcome and notes for this candidate
        let latestOutcome = l.last_call_outcome || "";
        let latestDate = l.last_call_date || "";
        let latestNotes = "";
        let count = l.call_count || 1;

        try {
          const { data: callsData } = await supabaseMobile
            .from("jobz_calls")
            .select("*")
            .ilike("phone", `%${last10}%`)
            .order("created_at", { ascending: false })
            .limit(1);
          if (callsData && callsData.length > 0) {
            latestOutcome = callsData[0].mindset || callsData[0].outcome || latestOutcome;
            latestDate = callsData[0].call_date || latestDate;
            latestNotes = callsData[0].remarks || "";
          }
        } catch {}

        return {
          id: l.id,
          studentName: l.student_name,
          phone: l.phone,
          email: l.email || "",
          courseInterested: l.preferred_domain || l.course_interested || "Job Candidate",
          preferredDomain: l.preferred_domain || "",
          experienceYears: l.experience_years || "",
          currentCompany: l.current_company || "",
          expectedSalary: l.expected_salary || "",
          leadSource: l.lead_source || "Job Portal",
          enquiryDate: l.enquiry_date || "",
          nextFollowUpDate: l.next_follow_up_date || "",
          nextFollowUpTime: l.next_follow_up_time || "",
          assignedCaller: l.assigned_caller || "",
          status: l.status || "Interested",
          priority: l.priority || "Warm",
          stage: l.stage || "Interested",
          qualification: l.qualification || "",
          passedOutYear: l.passed_out_year || "",
          collegeName: l.college_name || "",
          callCount: count,
          lastCallDate: latestDate,
          lastCallOutcome: latestOutcome,
          lastCallNotes: latestNotes,
          appMode: "jobz",
        };
      }

      // 2. Search Supabase Admission Leads
      const { data: admData } = await supabaseMobile
        .from("leads")
        .select("*")
        .ilike("phone", `%${last10}%`)
        .limit(1);

      if (admData && admData.length > 0) {
        const l = admData[0];
        let latestOutcome = l.last_call_outcome || "";
        let latestDate = l.last_call_date || "";
        let latestNotes = "";
        let count = l.call_count || 1;

        try {
          const { data: callsData } = await supabaseMobile
            .from("calls")
            .select("*")
            .ilike("phone", `%${last10}%`)
            .order("created_at", { ascending: false })
            .limit(1);
          if (callsData && callsData.length > 0) {
            latestOutcome = callsData[0].mindset || callsData[0].outcome || latestOutcome;
            latestDate = callsData[0].call_date || latestDate;
            latestNotes = callsData[0].remarks || "";
          }
        } catch {}

        return {
          id: l.id,
          studentName: l.student_name,
          phone: l.phone,
          email: l.email || "",
          courseInterested: l.course_interested || "Course Inquiry",
          leadSource: l.lead_source || "Phone",
          enquiryDate: l.enquiry_date || "",
          nextFollowUpDate: l.next_follow_up_date || "",
          nextFollowUpTime: l.next_follow_up_time || "",
          assignedCaller: l.assigned_caller || "",
          status: l.status || "Interested",
          priority: l.priority || "Warm",
          stage: l.stage || "Interested",
          qualification: l.qualification || "",
          passedOutYear: l.passed_out_year || "",
          collegeName: l.college_name || "",
          callCount: count,
          lastCallDate: latestDate,
          lastCallOutcome: latestOutcome,
          lastCallNotes: latestNotes,
          appMode: "admission",
        };
      }
    } catch {}

    return null;
  },

  async checkAppUpdate(): Promise<{
    hasUpdate: boolean;
    latestVersion?: string;
    latestVersionCode?: number;
    currentVersion?: string;
    currentVersionCode?: number;
    releaseNotes?: string[];
    apkUrl?: string;
    forceUpdate?: boolean;
  }> {
    try {
      const baseUrl = await this.getBaseUrl();
      const current = await TelephonyService.getAppVersionInfo();
      const currentCode = current?.versionCode || 1;
      const currentName = current?.versionName || "1.0.0";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${baseUrl}/api/app-version`, {
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" },
      });
      clearTimeout(timeoutId);

      if (!res.ok) return { hasUpdate: false, currentVersion: currentName, currentVersionCode: currentCode };

      const data = await res.json();
      const latestCode = Number(data.versionCode || 1);
      const hasUpdate = latestCode > currentCode;

      return {
        hasUpdate,
        latestVersion: data.versionName || "1.0.1",
        latestVersionCode: latestCode,
        currentVersion: currentName,
        currentVersionCode: currentCode,
        releaseNotes: data.releaseNotes || [],
        apkUrl: data.apkUrl || data.fallbackApkUrl || `${baseUrl}/api/download-apk`,
        forceUpdate: !!data.forceUpdate,
      };
    } catch (e) {
      return { hasUpdate: false };
    }
  },

  async syncStaffMembers(): Promise<string[]> {
    const cached = await StorageService.getStaffMembers();
    const staffSet = new Set<string>(cached);

    // 1. Try fetching from server /api/staff
    try {
      const baseUrl = await this.getBaseUrl();
      const candidateUrls = [
        baseUrl ? `${baseUrl}/api/staff` : "",
        "http://192.168.29.60:3001/api/staff",
      ].filter(Boolean);

      for (const targetUrl of candidateUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(targetUrl, {
            signal: controller.signal,
            headers: { "Cache-Control": "no-cache" },
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.staffNames) && data.staffNames.length > 0) {
              // Server list is authoritative: clear stale deleted members
              staffSet.clear();
              data.staffNames.forEach((n: string) => {
                if (n && typeof n === "string") staffSet.add(n.trim());
              });
            }
            if (data && Array.isArray(data.telecallers)) {
              for (const t of data.telecallers) {
                if (t.name) staffSet.add(t.name.trim());
                if (t.name && t.password) {
                  await StorageService.saveStaffPassword(t.name.trim(), t.password);
                }
                if (t.name && t.avatar) {
                  await StorageService.saveStaffAvatar(t.name.trim(), t.avatar);
                }
              }
            }
            break;
          }
        } catch {}
      }
    } catch {}

    // 2. Also check Supabase jobz_leads for any assigned telecallers
    if (isSupabaseReady() && supabaseMobile) {
      try {
        const { data, error } = await supabaseMobile
          .from("jobz_leads")
          .select("assigned_caller")
          .not("assigned_caller", "is", null)
          .limit(100);

        if (!error && data) {
          data.forEach((row: any) => {
            const name = (row.assigned_caller || "").trim();
            if (name && name.toLowerCase() !== "unassigned") {
              staffSet.add(name);
            }
          });
        }
      } catch {}
    }

    const merged = Array.from(staffSet);
    await StorageService.saveStaffMembers(merged);
    return merged;
  },
};
