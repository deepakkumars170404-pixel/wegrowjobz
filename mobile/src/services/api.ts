import { CallRecord, Lead } from "../types";
import { StorageService } from "./storage";
import { supabaseMobile, isSupabaseReady } from "./supabase";
import { TelephonyService } from "./telephony";

export const ApiService = {
  async getBaseUrl(): Promise<string> {
    const activeMode = await StorageService.getAppMode();
    const settings = await StorageService.getSettings();
    let url = activeMode === "admission"
      ? (settings.admissionServerUrl || "https://wegrowcrm.vercel.app")
      : (settings.jobzServerUrl || "http://192.168.1.41:3001");
    if (!url || url.includes("192.168.29.60")) {
      url = activeMode === "admission" ? "https://wegrowcrm.vercel.app" : "http://192.168.1.41:3001";
    }
    if (url.endsWith("/")) url = url.slice(0, -1);
    return url;
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
          return { success: true, leads: dedupedLeads };
        } else if (dbLeads && dbLeads.length === 0) {
          // Table exists but has 0 leads
          return { success: true, leads: [] };
        }
      } catch (sbErr) {
        console.warn("Supabase fetch queue error:", sbErr);
      }
    }

    // 2. Try Local CRM Server Wi-Fi (Strict 2-second timeout to prevent 4G freezing)
    try {
      const baseUrl = await this.getBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
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
        }
        return { success: true, leads: dedupedLeads };
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
    const seenCallKeys = new Set<string>();

    const addUniqueCall = (c: CallRecord) => {
      const cleanPhone = (c.phone || c.studentPhone || "").replace(/\D/g, "").slice(-10);
      const key = c.id || `${cleanPhone}_${c.callDate || ""}_${c.callTime || ""}_${c.duration || c.formattedDuration || ""}`;
      if (!seenCallKeys.has(key)) {
        seenCallKeys.add(key);
        collectedCalls.push(c);
      }
    };

    // 1. First fetch directly from Supabase Cloud calls table (Mode aware: jobz_calls vs calls)
    if (isSupabaseReady() && supabaseMobile) {
      try {
        const activeMode = await StorageService.getAppMode();
        const callsTable = activeMode === "jobz" ? "jobz_calls" : "calls";
        const leadsTable = activeMode === "jobz" ? "jobz_leads" : "leads";
        const callsRel = activeMode === "jobz" ? "calls:jobz_calls(*)" : "calls(*)";

        const { data: dbCalls, error: cErr } = await supabaseMobile
          .from(callsTable)
          .select("*")
          .order("created_at", { ascending: false });

        if (!cErr && dbCalls && dbCalls.length > 0) {
          dbCalls.forEach((c: any) => {
            const rawDur = c.duration_seconds ?? c.durationSeconds;
            const parsedDur = typeof rawDur === "number" ? rawDur : (typeof c.duration === "string" && c.duration.includes(":") ? c.duration.split(":").reduce((acc: number, time: string) => (60 * acc) + +time, 0) : 0);
            const formatted = c.duration || `${Math.floor(parsedDur / 60).toString().padStart(2, "0")}:${(parsedDur % 60).toString().padStart(2, "0")}`;
            const timeVal = c.call_time || c.from_time || "";
            const dateVal = c.call_date || "";

            addUniqueCall({
              id: c.id || `cr-${Date.now()}-${Math.random()}`,
              leadId: c.lead_id || "",
              studentName: c.student_name || "Student Inquiry",
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

      // Also fetch leads with calls to catch any calls embedded in lead call history
      try {
        const activeMode = await StorageService.getAppMode();
        const leadsTable = activeMode === "jobz" ? "jobz_leads" : "leads";
        const callsRel = activeMode === "jobz" ? "calls:jobz_calls(*)" : "calls(*)";

        const { data: dbLeads, error: lErr } = await supabaseMobile
          .from(leadsTable)
          .select(`*, ${callsRel}`)
          .order("created_at", { ascending: false });

        if (!lErr && dbLeads && dbLeads.length > 0) {
          dbLeads.forEach((lead: any) => {
            if (Array.isArray(lead.calls)) {
              lead.calls.forEach((c: any) => {
                const rawDur = c.duration_seconds ?? c.durationSeconds;
                const parsedDur = typeof rawDur === "number" ? rawDur : 0;
                const formatted = c.duration || "00:00";
                addUniqueCall({
                  id: c.id,
                  leadId: lead.id,
                  studentName: c.student_name || lead.student_name || "Student",
                  phone: c.phone || lead.phone || "",
                  studentPhone: lead.phone || c.phone || "",
                  callerName: c.caller_name || lead.assigned_caller || "Staff",
                  disposition: c.mindset || c.outcome || "Interested",
                  outcome: c.outcome || (parsedDur > 0 ? "Attended Call" : "Not Attended Call"),
                  mindset: c.mindset || c.outcome || "",
                  durationSeconds: parsedDur,
                  duration_seconds: parsedDur,
                  formattedDuration: formatted,
                  duration: formatted,
                  qualification: c.qualification || lead.qualification || "",
                  passedOutYear: c.passed_out_year || lead.passed_out_year || "",
                  collegeName: c.college_name || lead.college_name || "",
                  courseInterested: c.course_interested || lead.course_interested || "",
                  studentCourse: lead.course_interested || "",
                  callDate: c.call_date || "",
                  callTime: c.call_time || "",
                  fromTime: c.from_time || "",
                  endTime: c.end_time || "",
                  notes: c.remarks || "",
                  remarks: c.remarks || "",
                  timestamp: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
                  syncedToCrm: true,
                });
              });
            }
          });
        }
      } catch (sbLeadsErr) {
        console.warn("Supabase fetch leads calls error:", sbLeadsErr);
      }
    }

    // 2. Fallback / Merge with CRM Server API (/api/leads) with strict 2-second timeout
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
          const rawLeads = Array.isArray(data) ? data : data.leads || [];
          rawLeads.forEach((lead: any) => {
            if (Array.isArray(lead.callHistory)) {
              lead.callHistory.forEach((c: any) => {
                const rawDur = String(c.duration || "").replace(/[^\d:]/g, "");
                let durSec = 0;
                if (rawDur.includes(":")) {
                  const parts = rawDur.split(":").map(Number);
                  durSec = (parts[0] || 0) * 60 + (parts[1] || 0);
                } else {
                  durSec = parseInt(rawDur, 10) || 0;
                }
                addUniqueCall({
                  id: c.id || `cr-${Date.now()}-${Math.random()}`,
                  leadId: lead.id,
                  studentName: c.studentName || lead.studentName || "Student",
                  phone: lead.phone || c.studentPhone || "",
                  studentPhone: lead.phone || "",
                  callerName: c.callerName || lead.assignedCaller || "Staff",
                  disposition: c.mindset || c.outcome || "Interested",
                  outcome: c.outcome || (durSec > 0 ? "Attended Call" : "Not Attended Call"),
                  mindset: c.mindset || c.outcome || "",
                  durationSeconds: durSec,
                  duration_seconds: durSec,
                  formattedDuration: c.duration || "00:00",
                  duration: c.duration || "00:00",
                  qualification: c.qualification || lead.qualification || "",
                  passedOutYear: c.passedOutYear || lead.passedOutYear || "",
                  collegeName: c.collegeName || lead.collegeName || "",
                  courseInterested: c.courseInterested || lead.courseInterested || "",
                  studentCourse: lead.courseInterested || "",
                  callDate: c.callDate || "",
                  callTime: c.callTime || "",
                  fromTime: c.fromTime || "",
                  endTime: c.endTime || "",
                  notes: c.remarks || "",
                  remarks: c.remarks || "",
                  timestamp: c.id && c.id.replace(/\D/g, "") ? parseInt(c.id.replace(/\D/g, ""), 10) : Date.now(),
                  syncedToCrm: true,
                });
              });
            }
          });
        }
      }
    } catch {}

    // 3. Merge with local offline calls so unsynced calls also show up immediately
    try {
      const localCalls = await StorageService.getCallHistory();
      localCalls.forEach((local) => {
        addUniqueCall(local);
      });
    } catch {}

    // Sort calls newest first
    collectedCalls.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (collectedCalls.length > 0) {
      await StorageService.saveCallHistory(collectedCalls);
      return { success: true, calls: collectedCalls };
    }

    // 4. Final offline fallback to cached local calls
    const cachedHistory = await StorageService.getCallHistory();
    return { success: false, calls: cachedHistory, error: "Offline mode. Showing saved calls." };
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

    // Ensure a safe, valid lead ID exists
    const safeLeadId = record.leadId || `LD-MOB-${Date.now()}`;
    record.leadId = safeLeadId;

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
        const activeMode = await StorageService.getAppMode();
        const isJobz = activeMode === "jobz";
        const leadsTable = isJobz ? "jobz_leads" : "leads";
        const callsTable = isJobz ? "jobz_calls" : "calls";
        const followUpsTable = isJobz ? "jobz_follow_ups" : "follow_ups";

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
        const callId = record.id || `cr-mob-${Date.now()}`;
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

        if (!cErr && !lErr) {
          cloudSynced = true;
        }
      } catch (sbErr) {
        console.warn("Mobile Supabase direct sync error:", sbErr);
      }
    }

    // 2. Also try CRM Server API (Vercel or local Wi-Fi) with timeout
    try {
      const baseUrl = await this.getBaseUrl();
      if (baseUrl && baseUrl.startsWith("http")) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${baseUrl}/api/calls/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
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

    record.syncedToCrm = cloudSynced;
    await StorageService.addCallRecord(record);

    if (cloudSynced) {
      return { success: true };
    } else {
      // Offline fallback: save into pending queue
      await StorageService.addPendingCall(record);
      return { success: false, error: "Saved locally. Will sync when online." };
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
      const attTable = activeMode === "jobz" ? "jobz_attendance" : "staff_attendance";

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
};
