import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppSettings, CallRecord, Lead, AttendanceRecord, AppMode } from "../types";

const KEYS = {
  SETTINGS: "@wegrow_settings",
  LEADS_CACHE_ADMISSION: "@wegrow_leads_cache_admission",
  LEADS_CACHE_JOBZ: "@wegrow_leads_cache_jobz",
  CALL_HISTORY_ADMISSION: "@wegrow_call_history_admission",
  CALL_HISTORY_JOBZ: "@wegrow_call_history_jobz",
  PENDING_CALLS: "@wegrow_pending_calls",
  ATTENDANCE: "@wegrow_attendance",
  APP_MODE: "@wegrow_app_mode",
  STAFF_AVATARS: "@wegrow_staff_avatars",
};

export const DEFAULT_SETTINGS: AppSettings = {
  crmServerUrl: "http://192.168.1.41:3001",
  admissionServerUrl: "https://wegrowcrm.vercel.app",
  jobzServerUrl: "http://192.168.1.41:3001",
  callerName: "MuthuSelvi",
  autoPopupDisposition: true,
  strictSafetyBlock: true,
  vibrateOnCall: true,
  activeAppMode: "jobz",
  localRecordingEnabled: true,
};

export const StorageService = {
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTINGS);
      if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data), localRecordingEnabled: true };
    } catch {}
    return { ...DEFAULT_SETTINGS, localRecordingEnabled: true };
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await StorageService.getSettings();
    const merged = { ...current, ...settings, localRecordingEnabled: true };
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
  },

  async getAppMode(): Promise<AppMode> {
    try {
      const mode = await AsyncStorage.getItem(KEYS.APP_MODE);
      if (mode === "admission" || mode === "jobz") return mode;
    } catch {}
    return "jobz";
  },

  async setAppMode(mode: AppMode): Promise<void> {
    await AsyncStorage.setItem(KEYS.APP_MODE, mode);
    const settings = await StorageService.getSettings();
    const targetUrl =
      mode === "admission"
        ? (settings.admissionServerUrl || "https://wegrowcrm.vercel.app")
        : (settings.jobzServerUrl || "http://192.168.1.41:3001");

    await StorageService.saveSettings({
      activeAppMode: mode,
      crmServerUrl: targetUrl,
    });
  },

  async getCachedLeads(): Promise<Lead[]> {
    try {
      const mode = await StorageService.getAppMode();
      const cacheKey = mode === "admission" ? KEYS.LEADS_CACHE_ADMISSION : KEYS.LEADS_CACHE_JOBZ;
      const data = await AsyncStorage.getItem(cacheKey);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  },

  async saveCachedLeads(leads: Lead[]): Promise<void> {
    try {
      const mode = await StorageService.getAppMode();
      const cacheKey = mode === "admission" ? KEYS.LEADS_CACHE_ADMISSION : KEYS.LEADS_CACHE_JOBZ;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(leads));
    } catch {}
  },

  // Feature: Cross-Database Caller ID Lookup (Searches BOTH Jobz & Admission databases + Call History)
  async lookupLeadUnified(rawPhone: string): Promise<Lead | null> {
    if (!rawPhone) return null;
    const cleanDigits = rawPhone.replace(/\D/g, "");
    const last10 = cleanDigits.slice(-10);
    if (!last10) return null;

    try {
      let matchedLead: Lead | null = null;
      let appMode: AppMode = "jobz";

      // 1. Search Jobz Cache first
      const jobzData = await AsyncStorage.getItem(KEYS.LEADS_CACHE_JOBZ);
      if (jobzData) {
        const jobzLeads: Lead[] = JSON.parse(jobzData);
        const match = jobzLeads.find((l) => (l.phone || "").replace(/\D/g, "").slice(-10) === last10);
        if (match) {
          matchedLead = match;
          appMode = "jobz";
        }
      }

      // 2. Search Admission Cache if not found
      if (!matchedLead) {
        const admData = await AsyncStorage.getItem(KEYS.LEADS_CACHE_ADMISSION);
        if (admData) {
          const admLeads: Lead[] = JSON.parse(admData);
          const match = admLeads.find((l) => (l.phone || "").replace(/\D/g, "").slice(-10) === last10);
          if (match) {
            matchedLead = match;
            appMode = "admission";
          }
        }
      }

      // 3. Search Call History (for previous callers who called as incoming calls and were saved)
      const allHistoryCalls: CallRecord[] = [];
      try {
        const jCallsStr = await AsyncStorage.getItem(KEYS.CALL_HISTORY_JOBZ);
        if (jCallsStr) allHistoryCalls.push(...JSON.parse(jCallsStr));
        const aCallsStr = await AsyncStorage.getItem(KEYS.CALL_HISTORY_ADMISSION);
        if (aCallsStr) allHistoryCalls.push(...JSON.parse(aCallsStr));
      } catch {}

      const matchingCalls = allHistoryCalls.filter(
        (c) => (c.phone || c.studentPhone || "").replace(/\D/g, "").slice(-10) === last10
      );

      // Sort matching calls newest first
      matchingCalls.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const latestCall = matchingCalls[0];

      if (!matchedLead && latestCall) {
        // Construct lead from call history record
        const isJobz = latestCall.appMode === "jobz" || Boolean(latestCall.preferredDomain);
        matchedLead = {
          id: latestCall.leadId || latestCall.id,
          studentName: latestCall.studentName || "Previous Caller",
          phone: latestCall.phone,
          email: "",
          courseInterested: latestCall.preferredDomain || latestCall.courseInterested || "Inquiry",
          preferredDomain: latestCall.preferredDomain || "",
          experienceYears: latestCall.experienceYears || "",
          expectedSalary: latestCall.expectedSalary || "",
          qualification: latestCall.qualification || "",
          passedOutYear: latestCall.passedOutYear || "",
          collegeName: latestCall.collegeName || "",
          leadSource: "Direct Phone Call",
          enquiryDate: latestCall.callDate || "",
          nextFollowUpDate: latestCall.nextFollowUpDate || "",
          nextFollowUpTime: latestCall.nextFollowUpTime || "",
          assignedCaller: latestCall.callerName || "",
          status: (latestCall.disposition as any) || "Interested",
          priority: "Warm",
          stage: "New Enquiry",
          appMode: isJobz ? "jobz" : "admission",
        };
        appMode = isJobz ? "jobz" : "admission";
      }

      if (matchedLead) {
        // Enrich lead with full call history stats (Count, Last Date, Last Outcome, Remarks)
        const callCount = Math.max(matchedLead.callCount || 0, matchingCalls.length);
        const lastCallDate = latestCall?.callDate || latestCall?.callStartTime || matchedLead.lastCallDate || "";
        const lastCallOutcome = latestCall?.disposition || latestCall?.outcome || matchedLead.lastCallOutcome || "";
        const lastCallNotes = latestCall?.notes || latestCall?.remarks || (matchedLead.notes && matchedLead.notes[0]) || "";
        const lastCallDuration = latestCall?.formattedDuration || latestCall?.duration || "";

        return {
          ...matchedLead,
          callCount,
          lastCallDate,
          lastCallOutcome,
          lastCallNotes,
          lastCallDuration,
          appMode,
        };
      }
    } catch {}

    return null;
  },

  async getPendingCalls(): Promise<CallRecord[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_CALLS);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  },

  async addPendingCall(call: CallRecord): Promise<void> {
    const pending = await StorageService.getPendingCalls();
    pending.unshift(call);
    await AsyncStorage.setItem(KEYS.PENDING_CALLS, JSON.stringify(pending));
  },

  async savePendingCalls(calls: CallRecord[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.PENDING_CALLS, JSON.stringify(calls));
  },

  async clearPendingCalls(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.PENDING_CALLS);
  },

  async getCallHistory(): Promise<CallRecord[]> {
    try {
      const mode = await StorageService.getAppMode();
      const historyKey = mode === "admission" ? KEYS.CALL_HISTORY_ADMISSION : KEYS.CALL_HISTORY_JOBZ;
      const data = await AsyncStorage.getItem(historyKey);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  },

  async saveCallHistory(calls: CallRecord[]): Promise<void> {
    try {
      const mode = await StorageService.getAppMode();
      const historyKey = mode === "admission" ? KEYS.CALL_HISTORY_ADMISSION : KEYS.CALL_HISTORY_JOBZ;
      const sliced = calls.slice(0, 500);
      await AsyncStorage.setItem(historyKey, JSON.stringify(sliced));
    } catch {}
  },

  async addCallRecord(call: CallRecord): Promise<void> {
    const history = await StorageService.getCallHistory();
    const exists = history.findIndex((h) => h.id === call.id);
    if (exists >= 0) {
      history[exists] = call;
    } else {
      history.unshift(call);
    }
    const mode = await StorageService.getAppMode();
    const historyKey = mode === "admission" ? KEYS.CALL_HISTORY_ADMISSION : KEYS.CALL_HISTORY_JOBZ;
    const sliced = history.slice(0, 500);
    await AsyncStorage.setItem(historyKey, JSON.stringify(sliced));
  },

  // Attendance Management
  async getTodayAttendance(callerName: string): Promise<AttendanceRecord | null> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await AsyncStorage.getItem(`${KEYS.ATTENDANCE}_${today}_${callerName}`);
      if (data) return JSON.parse(data);
    } catch {}
    return null;
  },

  async punchInAttendance(callerName: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const nowTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    const record: AttendanceRecord = {
      id: `att-${today}-${callerName}`,
      callerName,
      date: today,
      loginTime: nowTime,
      punchInTimestamp: now.getTime(),
      totalCallsToday: 0,
      spokenSeconds: 0,
      status: "Punched In",
    };
    await AsyncStorage.setItem(`${KEYS.ATTENDANCE}_${today}_${callerName}`, JSON.stringify(record));
    return record;
  },

  async updateAttendanceSpokenSeconds(callerName: string, additionalSeconds: number): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const existing = await StorageService.getTodayAttendance(callerName);
      if (existing) {
        existing.spokenSeconds = (existing.spokenSeconds || 0) + additionalSeconds;
        existing.totalCallsToday = (existing.totalCallsToday || 0) + 1;
        await AsyncStorage.setItem(`${KEYS.ATTENDANCE}_${today}_${callerName}`, JSON.stringify(existing));
      }
    } catch (e) {
      console.warn("[Storage] updateAttendanceSpokenSeconds error:", e);
    }
  },

  async punchOutAttendance(
    callerName: string,
    totalCalls: number,
    spokenSeconds: number
  ): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const nowTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    const existing = await StorageService.getTodayAttendance(callerName);

    const punchInMs = existing?.punchInTimestamp || (now.getTime() - 28800000); // fallback ~8 hrs
    const diffMs = Math.max(0, now.getTime() - punchInMs);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const workingHoursFormatted = `${diffHours} hrs ${diffMinutes} mins`;

    const updated: AttendanceRecord = {
      id: existing?.id || `att-${today}-${callerName}`,
      callerName,
      date: today,
      loginTime: existing?.loginTime || nowTime,
      logoutTime: nowTime,
      punchInTimestamp: punchInMs,
      punchOutTimestamp: now.getTime(),
      workingHoursFormatted,
      totalCallsToday: totalCalls,
      spokenSeconds,
      status: "Punched Out",
    };
    await AsyncStorage.setItem(`${KEYS.ATTENDANCE}_${today}_${callerName}`, JSON.stringify(updated));
    return updated;
  },

  // Staff Avatar Photos
  async getStaffAvatars(): Promise<Record<string, string>> {
    try {
      const data = await AsyncStorage.getItem(KEYS.STAFF_AVATARS);
      if (data) return JSON.parse(data);
    } catch {}
    return {};
  },

  async saveStaffAvatar(staffName: string, photoUrl: string): Promise<void> {
    try {
      const avatars = await StorageService.getStaffAvatars();
      avatars[staffName] = photoUrl;
      await AsyncStorage.setItem(KEYS.STAFF_AVATARS, JSON.stringify(avatars));
    } catch {}
  },
};
