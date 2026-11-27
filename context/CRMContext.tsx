"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  startIndianRingbackCadence,
  stopRingbackCadence,
  playCallEndTone,
} from "@/utils/softphoneAudio";
import {
  Lead,
  FollowUpTask,
  WhatsAppChat,
  Course,
  Telecaller,
  AppUser,
  LeadStatus,
  LeadPriority,
  PipelineStage,
  CallRecord,
} from "@/types";
import {
  initialLeads,
  initialFollowUps,
  initialWhatsAppChats,
  initialCourses,
  initialTelecallers,
  initialUsers,
} from "@/data/dummy-data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message?: string;
}

export interface TelephonyStatus {
  connected: boolean;
  status: "online" | "wifi_disconnected" | "connecting" | "offline";
  message: string;
  wifiSSID: string;
  wifiState: string;
  gatewayReachable: boolean;
  microsipRunning: boolean;
  account: string;
  checkedAt?: string;
}

export type TelephonyMode = "mobile" | "jio" | "airtel" | "presentation";

interface CRMContextType {
  leads: Lead[];
  followUps: FollowUpTask[];
  whatsappChats: WhatsAppChat[];
  courses: Course[];
  telecallers: Telecaller[];
  users: AppUser[];
  currentUser: AppUser;
  setCurrentUser: (user: AppUser) => void;
  loginAsUser: (userIdOrName: string, passwordAttempt: string) => {
    success: boolean;
    requirePasswordChange?: boolean;
    user?: AppUser;
    error?: string;
  };
  updateUserPassword: (userId: string, newPassword: string, oldPassword?: string) => { success: boolean; error?: string };
  updateUserProfile: (userId: string, data: Partial<AppUser>) => { success: boolean; error?: string };
  triggerUserPasswordReset: (userId: string) => { success: boolean };
  toggleUserFreeze: (userId: string) => { success: boolean; isFrozen: boolean };
  setSelfNewPassword: (userId: string, newPassword: string) => { success: boolean; error?: string };
  logoutUser: () => void;
  activeUserRole: string;
  setActiveUserRole: (role: string) => void;
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  addToast: (title: string, type?: "success" | "info" | "warning" | "error") => void;
  dismissToast: (id: string) => void;

  // Live Calling Session State
  activeCallLead: Lead | null;
  setActiveCallLead: (lead: Lead | null) => void;
  isCallModalOpen: boolean;
  openCallModal: () => void;
  closeCallModal: () => void;
  isCallConnected: boolean;
  setIsCallConnected: (connected: boolean) => void;
  callPhase: "idle" | "ringing" | "connected" | "ended";
  callDuration: number;
  lastCallDuration: string | null;
  setLastCallDuration: (dur: string | null) => void;
  activePhoneNumber: string;
  initiateCall: (lead: Lead) => void;
  answerCall: () => void;
  endCallSession: () => void;

  // Telephony Presence & Reconnect
  telephonyStatus: TelephonyStatus;
  telephonyMode: TelephonyMode;
  setTelephonyMode: (mode: TelephonyMode) => void;
  refreshTelephonyStatus: (force?: boolean) => Promise<void>;
  reconnectTelephony: () => Promise<void>;

  
  // Leads & Data Actions
  addLead: (lead: Omit<Lead, "id" | "callCount">) => void;
  addLeadsBulk: (newLeads: Omit<Lead, "id" | "callCount">[]) => void;
  updateLead: (id: string, updated: Partial<Lead>) => void;
  updateLeadStatus: (id: string, status: LeadStatus, stage?: PipelineStage) => void;
  assignCaller: (leadId: string, callerName: string) => void;
  addLeadNote: (leadId: string, note: string, author?: string) => void;
  addCallRecord: (
    leadId: string,
    record: {
      callerName: string;
      outcome: string;
      mindset?: string;
      duration: string;
      remarks: string;
      nextFollowUpDate?: string;
      nextFollowUpTime?: string;
      qualification?: string;
      passedOutYear?: string;
      collegeName?: string;
      studentName?: string;
      preferredDomain?: string;
      experienceYears?: string;
      expectedSalary?: string;
    }
  ) => void;
  markFollowUpCompleted: (id: string) => void;
  completeLeadFollowUp: (leadId: string) => void;
  rescheduleFollowUp: (id: string, newDate: string, newTime: string, remarks?: string) => void;
  addNewFollowUp: (task: Omit<FollowUpTask, "id">) => void;
  sendWhatsAppMessage: (chatId: string, text: string) => void;
  addUser: (user: Omit<AppUser, "id" | "assignedLeads" | "joinedDate" | "lastActive">) => void;
  updateUserRole: (id: string, newRole: AppUser["role"]) => void;
  toggleUserStatus: (id: string) => void;
  updateStaffAvatar: (staffName: string, avatarUrl: string) => void;

  // Admin & Floor Supervisor Methods
  addTelecaller: (callerData: {
    name: string;
    phone: string;
    email: string;
    dailyTarget?: number;
    role?: "Senior Telecaller" | "Telecalling Executive" | "Admissions Counsellor";
    password?: string;
  }) => void;
  toggleTelecallerStatus: (id: string) => void;
  updateTelecallerTarget: (id: string, targetCalls: number) => void;
  deleteTelecaller: (idOrName: string) => void;
  distributeLeadsBulk: (leadIds: string[], targetCaller: string) => Promise<void>;
  reassignStaffLeads: (fromCaller: string, toCaller: string) => Promise<void>;
  auditCallRecord: (
    leadId: string,
    callTimestampOrId: string,
    auditStatus: "verified" | "suspicious" | "needs_review",
    auditNote?: string,
    auditRating?: number
  ) => Promise<void>;

  // Security PIN & Access Protection
  isManagementUnlocked: boolean;
  verifySecurityPin: (pin: string) => boolean;
  updateSecurityPin: (oldPin: string, newPin: string) => { success: boolean; error?: string };
  lockManagementSession: () => void;
  unlockManagementSession: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const LOCAL_STORAGE_LEADS_KEY = "wegrow_jobz_leads_v6";
const LOCAL_STORAGE_FOLLOWUPS_KEY = "wegrow_jobz_followups_v6";

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const leadsRef = useRef<Lead[]>(initialLeads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  const [followUps, setFollowUps] = useState<FollowUpTask[]>(initialFollowUps);
  const [whatsappChats, setWhatsappChats] = useState<WhatsAppChat[]>(initialWhatsAppChats);
  const [courses] = useState<Course[]>(initialCourses);
  const [telecallers, setTelecallers] = useState<Telecaller[]>(initialTelecallers);
  const [users, setUsers] = useState<AppUser[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("wegrow_jobz_users_v2");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const seen = new Set<string>();
            const deduped: AppUser[] = [];
            for (const u of parsed) {
              const key = (u.name || "").toLowerCase().trim();
              if (key && !seen.has(key)) {
                seen.add(key);
                deduped.push(u);
              }
            }
            return deduped;
          }
        }
      } catch {}
    }
    return initialUsers;
  });
  const [currentUser, setCurrentUser] = useState<AppUser>(initialUsers[0]);
  const [activeUserRole, setActiveUserRole] = useState<string>("Owner");
  const [securityPin, setSecurityPin] = useState<string>("7708");
  const [isManagementUnlocked, setIsManagementUnlocked] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem("wegrow_jobz_users_v2");
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const deduped: AppUser[] = [];
          for (const u of parsed) {
            const key = (u.name || "").toLowerCase().trim();
            if (key && !seen.has(key)) {
              seen.add(key);
              deduped.push(u);
            }
          }
          localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(deduped));
          setUsers(deduped);
          const sessionUserId = sessionStorage.getItem("wegrow_current_user_id");
          if (sessionUserId) {
            const found = deduped.find((u: AppUser) => u.id === sessionUserId);
            if (found) {
              setCurrentUser(found);
              setActiveUserRole(found.role);
            }
          }
        }
      }
      const stored = localStorage.getItem("wegrow_security_pin");
      if (stored && /^\d{4}$/.test(stored)) {
        setSecurityPin(stored);
      } else {
        localStorage.setItem("wegrow_security_pin", "7708");
      }
      const sessionUnlocked = sessionStorage.getItem("wegrow_mgmt_unlocked");
      if (sessionUnlocked === "true") {
        setIsManagementUnlocked(true);
      }
    } catch {}
  }, []);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = "t-" + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  }, [dismissToast]);

  const addToast = useCallback((title: string, type: "success" | "info" | "warning" | "error" = "info") => {
    showToast({ title, type });
  }, [showToast]);

  // Live Calling Session State
  const [activeCallLead, setActiveCallLeadState] = useState<Lead | null>(null);
  const activeCallLeadRef = useRef<Lead | null>(null);
  const setActiveCallLead = useCallback((lead: Lead | null) => {
    activeCallLeadRef.current = lead;
    setActiveCallLeadState(lead);
  }, []);

  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [callPhase, setCallPhase] = useState<"idle" | "ringing" | "connected" | "ended">("idle");
  const callPhaseRef = useRef<"idle" | "ringing" | "connected" | "ended">("idle");
  const callConnectedAtRef = useRef<number | null>(null);
  const consecutiveIdleCountRef = useRef<number>(0);

  const setCallPhaseSynced = useCallback((phase: "idle" | "ringing" | "connected" | "ended") => {
    callPhaseRef.current = phase;
    setCallPhase(phase);
  }, []);

  const [callDuration, setCallDuration] = useState(0);
  const [lastCallDuration, setLastCallDuration] = useState<string | null>(null);
  const [activePhoneNumber, setActivePhoneNumber] = useState<string>("");
  const ringingTimeoutRef = useRef<any>(null);
  const callStartTimeRef = useRef<number>(0);
  const activePhoneRef = useRef<string>("");
  const callDurationRef = useRef<number>(0);
  const lastProcessedCallTimestampRef = useRef<number>(0);

  
  // Live Telephony & Network Presence (Mobile SIM Bridge / MicroSIP / Demo)
  const [telephonyMode, setTelephonyModeState] = useState<TelephonyMode>("mobile");
  const telephonyModeRef = useRef<TelephonyMode>("mobile");

  const [telephonyStatus, setTelephonyStatus] = useState<TelephonyStatus>({
    connected: true,
    status: "online",
    message: "Mobile SIM Bridge Online • Direct SIM Calling Ready",
    wifiSSID: "Mobile Bridge (ADB)",
    wifiState: "connected",
    gatewayReachable: true,
    microsipRunning: false,
    account: "Android SIM Dialer",
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const savedMode = localStorage.getItem("wegrow_telephony_mode") as TelephonyMode;
        if (savedMode === "airtel" || savedMode === "presentation" || savedMode === "mobile") {
          setTelephonyModeState(savedMode);
          telephonyModeRef.current = savedMode;
        } else {
          // Default to mobile (Mobile Phone SIM Bridge)
          setTelephonyModeState("mobile");
          telephonyModeRef.current = "mobile";
          try {
            localStorage.setItem("wegrow_telephony_mode", "mobile");
          } catch {}
        }
      }
    } catch {}
  }, []);

  const setTelephonyMode = (mode: TelephonyMode) => {
    setTelephonyModeState(mode);
    telephonyModeRef.current = mode;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("wegrow_telephony_mode", mode);
      }
    } catch {}
    if (mode === "mobile") {
      setTelephonyStatus({
        connected: true,
        status: "online",
        message: "Mobile SIM Bridge Online • Direct SIM Calling Ready",
        wifiSSID: "Mobile Bridge (ADB)",
        wifiState: "connected",
        gatewayReachable: true,
        microsipRunning: false,
        account: "Android SIM Dialer",
      });
      addToast("Switched to Mobile Phone SIM Bridge (No MicroSIP)", "success");
      fetch("/api/mobile/status")
        .then((res) => res.json())
        .then((data) => {
          if (data.connected) {
            setTelephonyStatus((prev) => ({
              ...prev,
              message: `Mobile SIM Bridge Online (${data.model || "Android"} • ${data.device})`,
            }));
          } else {
            addToast("Warning: No mobile device connected via ADB.", "warning");
          }
        })
        .catch(() => {});
    } else if (mode === "airtel") {
      setTelephonyStatus({
        connected: true,
        status: "online",
        message: "Main Office Airtel Mode • Presentation Ready",
        wifiSSID: "Airtel Office Wi-Fi",
        wifiState: "connected",
        gatewayReachable: true,
        microsipRunning: true,
        account: "Airtel Office / Presentation SIP",
      });
      addToast("Switched to Main Office (Airtel Wi-Fi Mode)", "success");
    } else if (mode === "presentation") {
      setTelephonyStatus({
        connected: true,
        status: "online",
        message: "Presentation / Demo Mode • 100% Reliable",
        wifiSSID: "Any Network / Wi-Fi",
        wifiState: "connected",
        gatewayReachable: true,
        microsipRunning: true,
        account: "Interactive Presentation Mode",
      });
      addToast("Switched to Presentation / Demo Mode", "success");
    } else {
      addToast("Switched to Local Branch (JioFiber SIP MicroSIP)", "info");
      refreshTelephonyStatus(true);
    }
  };

  // 1. Initial Load of persistent leads from localStorage and /api/leads
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        // Clear any old legacy dummy localStorage caches from previous tests
        ["wegrow_crm_leads_v1", "wegrow_crm_leads_v2", "wegrow_crm_leads_v3", "wegrow_crm_leads_v4", "wegrow_crm_leads_v5_clean", "wegrow_crm_followups_v1", "wegrow_crm_followups_v2", "wegrow_crm_followups_v5"].forEach((k) => {
          localStorage.removeItem(k);
        });

        const localLeads = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
        if (localLeads) {
          const parsed = JSON.parse(localLeads);
          const isDummy = Array.isArray(parsed) && parsed.some((l: any) => l.id?.startsWith("LD-00") || l.studentName?.includes("Ramesh"));
          if (!isDummy && Array.isArray(parsed) && parsed.length > 0) {
            setLeads(parsed);
          }
        }
        const localFu = localStorage.getItem(LOCAL_STORAGE_FOLLOWUPS_KEY);
        if (localFu) {
          const parsedFu = JSON.parse(localFu);
          if (Array.isArray(parsedFu) && parsedFu.length > 0) {
            setFollowUps(parsedFu);
          }
        }
      }
    } catch {}

    // Also fetch server storage (Supabase backed)
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.leads)) {
          setLeads(data.leads);
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(data.leads));
              if (data.followUps) {
                localStorage.setItem(LOCAL_STORAGE_FOLLOWUPS_KEY, JSON.stringify(data.followUps));
              }
            }
          } catch {}
        }
      })
      .catch(() => {});

    // Sync telecallers from server storage (and reconcile unsynced localStorage Telecallers + deleted tombstones)
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.telecallers)) {
          const deletedSet = new Set<string>(
            Array.isArray(data.deletedStaffNames)
              ? data.deletedStaffNames.map((n: string) => String(n || "").toLowerCase().trim()).filter(Boolean)
              : []
          );
          const serverCallers: Telecaller[] = [...data.telecallers];
          const serverNames = new Set(
            serverCallers.map((t) => (t.name || "").toLowerCase().trim()).filter(Boolean)
          );

          setUsers((prev) => {
            // 1. Prune explicitly deleted staff from browser localStorage
            const next: AppUser[] = prev.filter((u) => {
              const nm = (u.name || "").toLowerCase().trim();
              if (u.role === "Telecaller" && deletedSet.has(nm)) return false;
              return true;
            });

            // 2. Self-heal any local Telecaller added in browser before server/cloud sync existed
            const unsyncedLocal = next.filter(
              (u) =>
                u.role === "Telecaller" &&
                u.name &&
                !serverNames.has(u.name.toLowerCase().trim()) &&
                !deletedSet.has(u.name.toLowerCase().trim())
            );
            for (const localTc of unsyncedLocal) {
              const payload: Telecaller = {
                id: localTc.id,
                name: localTc.name.trim(),
                email: localTc.email || `${localTc.name.toLowerCase().replace(/\s+/g, "")}@wegrowjobz.com`,
                phone: localTc.phone || "",
                avatar: localTc.avatar || "",
                role: "Telecalling Executive",
                assignedLeads: localTc.assignedLeads || 0,
                dailyTarget: 50,
                callsCompleted: 0,
                connectedCalls: 0,
                interestedLeads: 0,
                followUpsCompleted: 0,
                admissionsGenerated: 0,
                conversionRate: 0,
                rank: serverCallers.length + 1,
                status: localTc.status || "Active",
                isPunchedIn: true,
                password: localTc.password || "1234",
                isFrozen: localTc.isFrozen ?? false,
                mustChangePassword: localTc.mustChangePassword ?? false,
              };
              serverCallers.push(payload);
              serverNames.add(localTc.name.toLowerCase().trim());
              fetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }).catch(() => {});
            }

            // 3. Merge authoritative server callers + any locally stored avatars into browser users
            let localAvatarsMap: Record<string, string> = {};
            try {
              const avRaw = localStorage.getItem("wegrow_staff_avatars");
              if (avRaw) localAvatarsMap = JSON.parse(avRaw) || {};
            } catch {}

            const findLocalAvatar = (name: string) => {
              const lower = (name || "").toLowerCase().trim();
              const match = Object.entries(localAvatarsMap).find(
                ([k, v]) => k.toLowerCase().trim() === lower && Boolean(v)
              );
              return match ? match[1] : "";
            };

            for (let i = 0; i < serverCallers.length; i++) {
              const tc = serverCallers[i];
              const tcNameLower = (tc.name || "").toLowerCase().trim();
              if (!tcNameLower) continue;
              const existingIdx = next.findIndex(
                (u) => (u.name || "").toLowerCase().trim() === tcNameLower
              );
              const existingLocalUser = existingIdx >= 0 ? next[existingIdx] : undefined;
              const resolvedAvatar =
                tc.avatar ||
                findLocalAvatar(tc.name) ||
                existingLocalUser?.avatar ||
                "";

              // If server missed an avatar saved locally, heal it up to server!
              if (!tc.avatar && resolvedAvatar) {
                serverCallers[i] = { ...tc, avatar: resolvedAvatar };
                fetch("/api/staff", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: tc.name.trim(), avatar: resolvedAvatar }),
                }).catch(() => {});
              }

              if (existingIdx >= 0) {
                next[existingIdx] = {
                  ...next[existingIdx],
                  phone: tc.phone || next[existingIdx].phone || "",
                  email: tc.email || next[existingIdx].email || "",
                  whatsapp: tc.whatsapp || next[existingIdx].whatsapp || "",
                  languages: (Array.isArray(tc.languages) && tc.languages.length > 0) ? tc.languages : next[existingIdx].languages,
                  specialization: tc.specialization || next[existingIdx].specialization || "",
                  bio: tc.bio || next[existingIdx].bio || "",
                  password: tc.password || next[existingIdx].password || "1234",
                  status: tc.status || next[existingIdx].status || "Active",
                  isFrozen: tc.isFrozen ?? next[existingIdx].isFrozen ?? false,
                  mustChangePassword: tc.mustChangePassword ?? next[existingIdx].mustChangePassword ?? false,
                  avatar: resolvedAvatar,
                };
              } else {
                next.push({
                  id: tc.id || `usr-${tcNameLower.replace(/[^a-z0-9]/g, "")}`,
                  name: tc.name.trim(),
                  email: tc.email || `${tcNameLower.replace(/[^a-z0-9]/g, "")}@wegrowjobz.com`,
                  phone: tc.phone || "",
                  whatsapp: tc.whatsapp || "",
                  languages: tc.languages,
                  specialization: tc.specialization || "",
                  bio: tc.bio || "",
                  role: "Telecaller",
                  assignedLeads: tc.assignedLeads || 0,
                  status: tc.status || "Active",
                  joinedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
                  avatar: resolvedAvatar,
                  lastActive: "Synced",
                  password: tc.password || "1234",
                  isFrozen: tc.isFrozen ?? false,
                  mustChangePassword: tc.mustChangePassword ?? false,
                });
              }
            }

            // Apply saved local avatars to non-telecaller users (Owner / Admin) too!
            for (let j = 0; j < next.length; j++) {
              const av = findLocalAvatar(next[j].name);
              if (av && !next[j].avatar) {
                next[j] = { ...next[j], avatar: av };
              }
            }

            try {
              localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(next));
              const sessionUserId = sessionStorage.getItem("wegrow_current_user_id");
              if (sessionUserId) {
                const updatedCurrent = next.find((u) => u.id === sessionUserId);
                if (updatedCurrent) setCurrentUser(updatedCurrent);
              }
            } catch {}
            return next;
          });

          if (serverCallers.length > 0) {
            setTelecallers(serverCallers);
          }
        }
      })
      .catch(() => {});

    // Supabase Cloud Realtime Channel for instant live updates across devices (Jobz tables)
    let channel: any = null;
    const sb = supabase;
    if (isSupabaseConfigured() && sb) {
      channel = sb
        .channel("realtime:crm-jobz-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jobz_leads" },
          (payload: any) => {
            if (payload?.new?.id === "SYS-STAFF-REGISTRY") {
              fetch("/api/staff")
                .then((res) => res.json())
                .then((data) => {
                  if (data && Array.isArray(data.telecallers) && data.telecallers.length > 0) {
                    setTelecallers(data.telecallers);
                  }
                })
                .catch(() => {});
              return;
            }
            fetch("/api/leads")
              .then((res) => res.json())
              .then((data) => {
                if (data && Array.isArray(data.leads)) setLeads(data.leads);
                if (data && Array.isArray(data.followUps)) setFollowUps(data.followUps);
              })
              .catch(() => {});
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jobz_calls" },
          () => {
            fetch("/api/leads")
              .then((res) => res.json())
              .then((data) => {
                if (data && Array.isArray(data.leads)) setLeads(data.leads);
              })
              .catch(() => {});
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jobz_follow_ups" },
          () => {
            fetch("/api/leads")
              .then((res) => res.json())
              .then((data) => {
                if (data && Array.isArray(data.followUps)) setFollowUps(data.followUps);
              })
              .catch(() => {});
          }
        )
        .subscribe();
    }

    // Auto-sync polling every 3 seconds so calls/leads saved on Mobile App instantly appear on Web CRM
    const syncInterval = setInterval(() => {
      fetch("/api/leads", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.leads)) {
            setLeads((prev) => {
              if (prev.length !== data.leads.length || JSON.stringify(prev) !== JSON.stringify(data.leads)) {
                try {
                  if (typeof window !== "undefined") {
                    localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(data.leads));
                  }
                } catch {}
                return data.leads;
              }
              return prev;
            });
          }
          if (data && Array.isArray(data.followUps)) {
            setFollowUps((prev) => {
              if (prev.length !== data.followUps.length || JSON.stringify(prev) !== JSON.stringify(data.followUps)) {
                try {
                  if (typeof window !== "undefined") {
                    localStorage.setItem(LOCAL_STORAGE_FOLLOWUPS_KEY, JSON.stringify(data.followUps));
                  }
                } catch {}
                return data.followUps;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      clearInterval(syncInterval);
      if (sb && channel) {
        sb.removeChannel(channel);
      }
    };
  }, []);

  // Helper to persist leads to localStorage and backend
  const persistLeads = useCallback((updatedLeads: Lead[], updatedFu?: FollowUpTask[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(updatedLeads));
        if (updatedFu) {
          localStorage.setItem(LOCAL_STORAGE_FOLLOWUPS_KEY, JSON.stringify(updatedFu));
        }
      } catch {}
    }
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leads: updatedLeads,
        ...(updatedFu ? { followUps: updatedFu } : {}),
      }),
    }).catch(() => {});
  }, []);

  // Telephony Refresh Function
  const refreshTelephonyStatus = useCallback(async (force = false) => {
    if (telephonyModeRef.current === "mobile") {
      try {
        const res = await fetch("/api/mobile/status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setTelephonyStatus({
              connected: true,
              status: "online",
              message: `Mobile SIM Bridge Online (${data.model || "Android"} • ${data.device})`,
              wifiSSID: "Mobile Bridge (ADB)",
              wifiState: "connected",
              gatewayReachable: true,
              microsipRunning: false,
              account: "Android SIM Dialer",
            });
            return;
          }
        }
      } catch {}

      setTelephonyStatus({
        connected: false,
        status: "offline",
        message: "Mobile Phone Disconnected (ADB)",
        wifiSSID: "Mobile Bridge",
        wifiState: "disconnected",
        gatewayReachable: false,
        microsipRunning: false,
        account: "Android SIM Dialer",
      });
      return;
    }

    try {
      const url = force ? "/api/microsip/status?force=true" : "/api/microsip/status";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTelephonyStatus(data);
        return;
      }
    } catch {}

    // Fallback configurations if JioFiber is not reachable
    if (telephonyModeRef.current === "airtel") {
      setTelephonyStatus({
        connected: false,
        status: "wifi_disconnected",
        message: "Main Office Airtel Mode (Simulation)",
        wifiSSID: "Airtel Office Wi-Fi",
        wifiState: "connected",
        gatewayReachable: false,
        microsipRunning: true,
        account: "Airtel Office / Presentation SIP",
      });
      return;
    }
    if (telephonyModeRef.current === "presentation") {
      setTelephonyStatus({
        connected: false,
        status: "wifi_disconnected",
        message: "Presentation / Demo Mode (Simulation)",
        wifiSSID: "Any Network / Wi-Fi",
        wifiState: "connected",
        gatewayReachable: false,
        microsipRunning: false,
        account: "Interactive Presentation Mode",
      });
      return;
    }

    setTelephonyStatus((prev) => ({
      ...prev,
      connected: false,
      status: "offline",
      message: "MicroSIP Telephony Offline",
    }));
  }, []);

  // Reconnect Function (Mobile Phone Bridge or Office Wi-Fi)
  const reconnectTelephony = useCallback(async () => {
    if (telephonyModeRef.current === "mobile") {
      showToast({
        type: "info",
        title: "Connecting Mobile Bridge...",
        message: "Checking ADB connection to Android Phone SIM...",
      });
      try {
        const res = await fetch("/api/mobile/status?refresh=true", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setTelephonyStatus({
              connected: true,
              status: "online",
              message: `Mobile SIM Bridge Online (${data.model || "Android"} • ${data.device})`,
              wifiSSID: "Mobile Bridge (ADB)",
              wifiState: "connected",
              gatewayReachable: true,
              microsipRunning: false,
              account: "Android SIM Dialer",
            });
            showToast({
              type: "success",
              title: "Mobile Phone Connected!",
              message: `Device: ${data.model || "Android Phone"} • SIM Call Ready`,
            });
            return;
          }
        }
      } catch {}
      showToast({
        type: "error",
        title: "Phone Disconnected",
        message: "Please check Wireless Debugging or plug phone via USB.",
      });
      return;
    }

    showToast({
      type: "info",
      title: "Connecting to Office JioFiber...",
      message: "Probing JioFiber gateway & starting MicroSIP telephony...",
    });
    try {
      const res = await fetch("/api/microsip/status?force=true&reconnect=true");
      if (res.ok) {
        const data = await res.json();
        setTelephonyStatus(data);
        if (data.connected) {
          showToast({
            type: "success",
            title: "Connected to Office JioFiber!",
            message: `SSID: ${data.wifiSSID} • Landline ready (+91 4562 355214)`,
          });
        } else {
          showToast({
            type: "warning",
            title: "JioFiber Wi-Fi Not Detected",
            message: "Please ensure your laptop is connected to your Office JioFiber Wi-Fi network.",
          });
        }
      }
    } catch {
      showToast({
        type: "error",
        title: "Connection Failed",
        message: "Could not reach local telephony server.",
      });
    }
  }, []);

  // Periodic status poll (every 30 seconds, ultra-lightweight via route memory cache)
  useEffect(() => {
    refreshTelephonyStatus();
    const interval = setInterval(() => {
      refreshTelephonyStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshTelephonyStatus]);

  // Synchronized Call Timer (ticks continuously while in call)
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Convert seconds into human-readable duration like "1 minute 30 seconds"
  const formatHumanDuration = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return "0 seconds";
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0 && s > 0) {
      return `${m} minute${m > 1 ? "s" : ""} ${s} second${s > 1 ? "s" : ""}`;
    }
    if (m > 0) {
      return `${m} minute${m > 1 ? "s" : ""}`;
    }
    return `${s} second${s > 1 ? "s" : ""}`;
  };

  // Master Monotonic Call Timer - Strictly derived from hardware wall-clock (Date.now())
  // Never jumps backwards, never resets to 0 mid-call
  useEffect(() => {
    let timer: any = null;
    if (isCallConnected && callPhase === "connected") {
      if (!callConnectedAtRef.current) {
        callConnectedAtRef.current = Date.now();
      }
      timer = setInterval(() => {
        const elapsed = Math.max(
          1,
          Math.floor((Date.now() - (callConnectedAtRef.current || Date.now())) / 1000)
        );
        setCallDuration(elapsed);
        callDurationRef.current = elapsed;
      }, 500);
    } else if (callPhase === "idle") {
      callConnectedAtRef.current = null;
    }
    return () => clearInterval(timer);
  }, [isCallConnected, callPhase]);

  // Real-time Mobile SIM Call State & Remote Cut / Hangup Detector
  useEffect(() => {
    let interval: any = null;
    if (isCallConnected) {
      interval = setInterval(async () => {
        try {
          const targetPhone = activePhoneRef.current || "";
          const url =
            telephonyModeRef.current === "mobile"
              ? `/api/mobile/status?_t=${Date.now()}`
              : `/api/microsip/call-state?phone=${encodeURIComponent(targetPhone)}&_t=${Date.now()}`;
          const res = await fetch(url, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
          });
          if (!res.ok) return;
          const data = await res.json();

          const timeSinceStart = Date.now() - (callStartTimeRef.current || 0);

          // CRITICAL SAFETY GUARD:
          // If the phone is NOT connected via ADB (Wi-Fi drop, packet loss, or proximity sleep),
          // NEVER cut the call! The user is actively speaking on their mobile SIM card!
          if (!data.connected) {
            consecutiveIdleCountRef.current = 0;
            return;
          }

          // 1. If call is IDLE on phone -> user cut call on phone, or remote party hung up!
          if (data.state === "idle") {
            const isCallActive = callPhaseRef.current === "connected";

            // If still in dialing/ringing phase, give modem initial 5s to dispatch dialing
            if (!isCallActive && timeSinceStart < 5000) {
              return;
            }

            // Once the call was connected (active talk), fast instant cut:
            // 2 consecutive confirmed idle polls (~800ms) is enough to immediately cut the web call!
            consecutiveIdleCountRef.current += 1;
            const requiredIdlePolls = isCallActive ? 2 : 3;
            if (consecutiveIdleCountRef.current < requiredIdlePolls) {
              return;
            }

            consecutiveIdleCountRef.current = 0;
            stopRingbackCadence();
            playCallEndTone();

            // Accurate duration: ALWAYS prioritize the phone's official hardware duration if > 0!
            const spokenSecs = callConnectedAtRef.current
              ? Math.max(1, Math.floor((Date.now() - callConnectedAtRef.current) / 1000))
              : callDurationRef.current || 0;
            const finalSecs =
              data.lastCallDurationSeconds && data.lastCallDurationSeconds > 0
                ? data.lastCallDurationSeconds
                : spokenSecs;
            const formatted = formatTimer(finalSecs);

            setLastCallDuration(formatted);
            callDurationRef.current = finalSecs;
            setCallDuration(finalSecs);
            callConnectedAtRef.current = null;
            setCallPhaseSynced("idle");
            setIsCallConnected(false);

            // Stamp baseline so background poller NEVER adds a duplicate record!
            if (data.lastCallTimestamp) {
              lastProcessedCallTimestampRef.current = data.lastCallTimestamp;
            } else {
              lastProcessedCallTimestampRef.current = Date.now();
            }

            // IMMEDIATELY AUTO-ADD TALK TIMING TO CRM Call History
            const currentLead =
              activeCallLeadRef.current ||
              leadsRef.current.find((l) => {
                const targetDigits = (data.lastCallNumber || activePhoneRef.current || "").replace(/\D/g, "");
                return targetDigits && l.phone.replace(/\D/g, "").endsWith(targetDigits.slice(-10));
              });

            if (currentLead) {
              const endNow = new Date();
              const startNow = new Date(endNow.getTime() - Math.max(1, finalSecs) * 1000);
              const dateStr = endNow.toISOString().split("T")[0];
              const fromTime = startNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              const endTime = endNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              const timeStr = fromTime;
              const durationLong = formatHumanDuration(finalSecs);

              const autoCallRecord: CallRecord = {
                id: "ch-" + Date.now(),
                callDate: dateStr,
                callTime: timeStr,
                callerName: currentLead.assignedCaller || telecallers?.[0]?.name || "Muthumeena",
                duration: formatted,
                durationFormatted: durationLong,
                fromTime: fromTime,
                endTime: endTime,
                outcome: finalSecs > 0 ? "Attended Call" : "Not Attended Call",
                remarks:
                  finalSecs > 0
                    ? `Mobile SIM Call (Attended): Spoke for ${durationLong} (${fromTime} - ${endTime}).`
                    : "Mobile SIM Call (Not Attended): Cut before connecting.",
              };

              setLeads((prevLeads) => {
                const targetDigits = (currentLead.phone || data.lastCallNumber || activePhoneRef.current || "").replace(/\D/g, "");
                const exists = prevLeads.some(
                  (l) => l.id === currentLead.id || (targetDigits && l.phone.replace(/\D/g, "").endsWith(targetDigits.slice(-10)))
                );
                let updated: Lead[];
                if (exists) {
                  updated = prevLeads.map((l) => {
                    if (l.id === currentLead.id || (targetDigits && l.phone.replace(/\D/g, "").endsWith(targetDigits.slice(-10)))) {
                      return {
                        ...l,
                        callCount: (l.callCount || 0) + 1,
                        lastCallDate: dateStr,
                        lastCallOutcome: autoCallRecord.outcome,
                        callHistory: [autoCallRecord, ...(l.callHistory || [])],
                      };
                    }
                    return l;
                  });
                } else {
                  // Direct Dial New Lead: Auto-create permanently in CRM database
                  const newCreatedLead: Lead = {
                    ...currentLead,
                    id: currentLead.id && !currentLead.id.startsWith("LD-DIRECT") ? currentLead.id : `LD-${Date.now()}`,
                    phone: currentLead.phone.startsWith("+91") ? currentLead.phone : `+91 ${targetDigits.slice(-10)}`,
                    callCount: 1,
                    lastCallDate: dateStr,
                    lastCallOutcome: autoCallRecord.outcome,
                    callHistory: [autoCallRecord],
                  };
                  activeCallLeadRef.current = newCreatedLead;
                  updated = [newCreatedLead, ...prevLeads];
                }
                persistLeads(updated);
                return updated;
              });

              addToast(
                `⚡ Talk time (${formatted}) automatically added to ${currentLead.studentName}'s CRM profile!`,
                "success"
              );
            } else {
              addToast(`Call ended (${formatted}). Duration: ${formatted}`, "info");
            }
            return;
          }

          // Reset idle count when phone is in call
          consecutiveIdleCountRef.current = 0;

          // 2. Call answered: explicit connected state from Android modem
          const isAnswered = data.state === "connected";

          if (isAnswered) {
            if (callPhaseRef.current !== "connected") {
              stopRingbackCadence();
              if (!callConnectedAtRef.current) {
                callConnectedAtRef.current = Date.now();
              }
              setCallPhaseSynced("connected");
              setCallDuration(1);
              callDurationRef.current = 1;
            }
          } else {
            // Still ringing / dialing on phone - NEVER downgrade if already answered/connected!
            if (callPhaseRef.current === "idle") {
              setCallPhaseSynced("ringing");
            }
          }
        } catch {}
      }, 400);
    } else {
      consecutiveIdleCountRef.current = 0;
      setCallPhaseSynced("idle");
    }
    return () => clearInterval(interval);
  }, [isCallConnected, setCallPhaseSynced]);

  // Explicitly Answer Call (User clicks Pick Up button or Auto-connects)
  const answerCall = useCallback(() => {
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    stopRingbackCadence();
    if (!callConnectedAtRef.current) {
      callConnectedAtRef.current = Date.now();
    }
    setCallPhaseSynced("connected");
    setIsCallConnected(true);
    setCallDuration(1);
    callDurationRef.current = 1;
    addToast("📞 Call Connected! Live conversation active.", "success");
  }, [addToast, setCallPhaseSynced]);

  // Unified Call Initiator with Real Indian Telecom Audio Cadence & Softphone
  const initiateCall = (lead: Lead) => {
    callStartTimeRef.current = Date.now();
    callDurationRef.current = 0;
    callConnectedAtRef.current = null;
    consecutiveIdleCountRef.current = 0;
    setActiveCallLead(lead);
    setIsCallConnected(true);
    setCallPhaseSynced("ringing");
    setCallDuration(0);
    setLastCallDuration(null);
    setIsCallModalOpen(true);

    // Play authentic Indian Ringback audio cadence (Trrrr... Trrrr...)
    stopRingbackCadence();
    startIndianRingbackCadence();

    // In demo/presentation mode only: auto-connect after ~3.2s
    if (telephonyModeRef.current !== "mobile") {
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
      }
      ringingTimeoutRef.current = setTimeout(() => {
        answerCall();
      }, 3200);
    }

    // Format phone with mandatory +91 or 0 for JioFiber SIP (+91XXXXXXXXXX) - strictly remove all spaces/symbols
    const rawDigits = lead.phone.replace(/\D/g, "");

    // STRICT SAFETY CHECK: PERMANENTLY BLOCK 9952337331 (NEVER CALL)
    if (rawDigits.includes("9952337331")) {
      stopRingbackCadence();
      setCallPhaseSynced("idle");
      setIsCallConnected(false);
      addToast("Calling 9952337331 is strictly and permanently blocked.", "error");
      return;
    }

    let cleanPhone = "";
    if (telephonyModeRef.current === "mobile") {
      // For Mobile Phone Cellular SIM: Standard 10-digit Indian mobile number
      if (rawDigits.length === 10) {
        cleanPhone = rawDigits;
      } else if (rawDigits.length === 12 && rawDigits.startsWith("91")) {
        cleanPhone = rawDigits.substring(2);
      } else if (rawDigits.length === 11 && rawDigits.startsWith("0")) {
        cleanPhone = rawDigits.substring(1);
      } else if (rawDigits.length > 10) {
        cleanPhone = rawDigits.slice(-10);
      } else {
        cleanPhone = rawDigits;
      }
    } else {
      // For Landline SIP Trunk (MicroSIP): Require leading 0
      if (rawDigits.length === 10) {
        cleanPhone = `0${rawDigits}`;
      } else if (rawDigits.length === 12 && rawDigits.startsWith("91")) {
        cleanPhone = `0${rawDigits.substring(2)}`;
      } else if (rawDigits.length === 11 && rawDigits.startsWith("0")) {
        cleanPhone = rawDigits;
      } else {
        cleanPhone = rawDigits;
      }
    }

    activePhoneRef.current = cleanPhone;
    setActivePhoneNumber(cleanPhone);

    // For mobile SIM bridge, ALWAYS send clean 10-digit phone
    const mobileDigits = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

    // Trigger direct mobile device SIM call bridge
    fetch("/api/mobile/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: mobileDigits, studentName: lead.studentName }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          addToast(`📲 SIM Call triggered on mobile phone! (${mobileDigits})`, "success");
        } else {
          console.warn("Mobile call bridge note:", data.error);
          addToast(`⚠️ Mobile Bridge: ${data.error || "Phone not reachable. Check phone Wi-Fi."}`, "warning");
        }
      })
      .catch((err) => {
        console.warn("Direct Mobile Call API note:", err);
      });
  };

  // Unified Call Hangup (Stops audio, plays disconnect chime, triggers SIP hangup)
  const endCallSession = () => {
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    stopRingbackCadence();
    playCallEndTone();

    const wasConnected = callPhaseRef.current === "connected";
    const spokenSecs = wasConnected && callConnectedAtRef.current
      ? Math.max(1, Math.floor((Date.now() - callConnectedAtRef.current) / 1000))
      : wasConnected ? Math.max(1, callDurationRef.current || callDuration) : 0;
    const finalSecs = spokenSecs;
    const formatted = formatTimer(finalSecs);
    setLastCallDuration(formatted);
    callConnectedAtRef.current = null;
    consecutiveIdleCountRef.current = 0;
    setCallPhaseSynced("ended");
    setIsCallConnected(false);
    setActivePhoneNumber("");

    // Trigger hangup on mobile phone
    fetch("/api/mobile/hangup", { method: "POST" }).catch(() => {});

    // IMMEDIATELY AUTO-ADD TALK TIMING TO CRM Call History
    const currentLead =
      activeCallLeadRef.current ||
      leadsRef.current.find((l) => {
        const cleanTarget = activePhoneRef.current.replace(/\D/g, "");
        const leadClean = l.phone.replace(/\D/g, "");
        return cleanTarget && (leadClean.endsWith(cleanTarget.slice(-10)) || cleanTarget.endsWith(leadClean.slice(-10)));
      });

    if (currentLead) {
      const endNow = new Date();
      const startNow = new Date(endNow.getTime() - Math.max(1, finalSecs) * 1000);
      const dateStr = endNow.toISOString().split("T")[0];
      const fromTime = startNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const endTime = endNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const timeStr = fromTime;
      const durationLong = formatHumanDuration(finalSecs);

      const autoCallRecord: CallRecord = {
        id: "ch-" + Date.now(),
        callDate: dateStr,
        callTime: timeStr,
        callerName: currentLead.assignedCaller || "Priya Sharma (Mobile SIM)",
        duration: formatted,
        durationFormatted: durationLong,
        fromTime: fromTime,
        endTime: endTime,
        outcome: finalSecs > 0 ? "Attended Call" : "Not Attended Call",
        remarks:
          finalSecs > 0
            ? `Mobile SIM Call (Attended): Spoke for ${durationLong} (${fromTime} - ${endTime}).`
            : "Mobile SIM Call (Not Attended): Cut before connecting.",
      };

      setLeads((prevLeads) => {
        const updated = prevLeads.map((l) => {
          if (l.id === currentLead.id) {
            return {
              ...l,
              callCount: (l.callCount || 0) + 1,
              lastCallDate: dateStr,
              lastCallOutcome: autoCallRecord.outcome,
              callHistory: [autoCallRecord, ...(l.callHistory || [])],
            };
          }
          return l;
        });
        persistLeads(updated);
        return updated;
      });

      addToast(
        `⚡ Spoken duration (${formatted}) automatically saved to ${currentLead.studentName}'s Call History!`,
        "success"
      );
    } else {
      addToast(`Call ended (${formatted}). Duration: ${formatted}`, "info");
    }
  };

  const openCallModal = () => {
    setIsCallModalOpen(true);
  };

  const closeCallModal = () => {
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }
    stopRingbackCadence();
    setCallPhaseSynced("idle");
    setIsCallConnected(false);
    setIsCallModalOpen(false);
  };

  // Add Lead with permanent persistence
  const addLead = (newLeadData: Omit<Lead, "id" | "callCount">) => {
    const newId = `LD-${1000 + leads.length + 1}`;
    const newLead: Lead = {
      ...newLeadData,
      id: newId,
      callCount: 0,
      notes: newLeadData.notes || [],
      callHistory: [],
    };
    const updated = [newLead, ...leads];
    setLeads(updated);
    setActiveCallLead(newLead);
    persistLeads(updated);

    showToast({
      type: "success",
      title: "Lead Saved Permanently",
      message: `${newLead.studentName} (${newLead.phone}) saved to database. Ready to call!`,
    });
  };

  const addLeadsBulk = (newLeadsList: Omit<Lead, "id" | "callCount">[]) => {
    if (!newLeadsList || newLeadsList.length === 0) return;
    const timestamp = Date.now();
    const createdLeads: Lead[] = newLeadsList.map((item, index) => ({
      ...item,
      id: `LD-${1000 + leads.length + index + 1}-${timestamp.toString().slice(-4)}`,
      callCount: 0,
      notes: item.notes || [],
      callHistory: [],
    }));
    const updated = [...createdLeads, ...leads];
    setLeads(updated);
    persistLeads(updated);

    showToast({
      type: "success",
      title: "Bulk Leads Imported",
      message: `Successfully loaded ${createdLeads.length} leads into active calling queue!`,
    });
  };

  const updateLead = (id: string, updated: Partial<Lead>) => {
    const newLeads = leads.map((lead) => (lead.id === id ? { ...lead, ...updated } : lead));
    setLeads(newLeads);
    persistLeads(newLeads);
    showToast({
      type: "info",
      title: "Lead Updated",
      message: `Details updated for lead #${id}.`,
    });
  };

  const updateLeadStatus = (id: string, status: LeadStatus, stage?: PipelineStage) => {
    const finalStage = (stage || status) as PipelineStage;
    const newLeads = leads.map((lead) => {
      if (lead.id === id) {
        return {
          ...lead,
          status,
          stage: finalStage,
        };
      }
      return lead;
    });
    setLeads(newLeads);
    persistLeads(newLeads);

    // Direct synchronous update to Supabase so polling never reverts the stage
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("leads")
        .update({
          status: status,
          stage: finalStage,
        })
        .eq("id", id)
        .then(() => {}, () => {});
    }

    showToast({
      type: "success",
      title: "Stage Advanced",
      message: `Lead #${id} moved to "${finalStage}".`,
    });
  };

  const assignCaller = (leadId: string, callerName: string) => {
    const newLeads = leads.map((lead) =>
      lead.id === leadId ? { ...lead, assignedCaller: callerName } : lead
    );
    setLeads(newLeads);
    persistLeads(newLeads);
    showToast({
      type: "info",
      title: "Caller Reassigned",
      message: `Lead #${leadId} assigned to ${callerName}.`,
    });
  };

  const addLeadNote = (leadId: string, noteContent: string, author = "Priya Sharma") => {
    const newNote = {
      id: "nt-" + Date.now(),
      author,
      timestamp: "Just now",
      content: noteContent,
    };
    const newLeads = leads.map((lead) =>
      lead.id === leadId ? { ...lead, notes: [newNote, ...(lead.notes || [])] } : lead
    );
    setLeads(newLeads);
    persistLeads(newLeads);
    showToast({
      type: "success",
      title: "Note Added",
      message: "Internal telecaller remark saved.",
    });
  };

  const addCallRecord = (
    leadId: string,
    record: {
      callerName: string;
      outcome: string;
      mindset?: string;
      duration: string;
      remarks: string;
      nextFollowUpDate?: string;
      nextFollowUpTime?: string;
      qualification?: string;
      passedOutYear?: string;
      collegeName?: string;
      studentName?: string;
      preferredDomain?: string;
      experienceYears?: string;
      expectedSalary?: string;
    }
  ) => {
    const endNow = new Date();
    const parts = (record.duration || "").split(":").map(Number);
    let totalSecs = 0;
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      totalSecs = parts[0] * 60 + parts[1];
    } else {
      totalSecs = parseInt(record.duration, 10) || 0;
    }
    const startNow = new Date(endNow.getTime() - Math.max(1, totalSecs) * 1000);
    const dateStr = endNow.toISOString().split("T")[0];
    const fromTime = startNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const endTime = endNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const timeStr = fromTime;
    const durationLong = formatHumanDuration(totalSecs);

    const newRecord: CallRecord = {
      id: "ch-" + Date.now(),
      callDate: dateStr,
      callTime: timeStr,
      callerName: record.callerName,
      duration: record.duration,
      durationFormatted: durationLong,
      fromTime: fromTime,
      endTime: endTime,
      outcome: record.outcome,
      mindset: record.mindset,
      qualification: record.qualification || "",
      passedOutYear: record.passedOutYear || "",
      collegeName: record.collegeName || "",
      studentName: record.studentName || "",
      remarks: record.remarks,
    };

    let updatedFu = [...followUps];
    if (record.nextFollowUpDate) {
      const targetLead = leads.find((l) => l.id === leadId);
      if (targetLead) {
        const newFu: FollowUpTask = {
          id: "fu-" + Date.now(),
          leadId,
          studentName: targetLead.studentName,
          phone: targetLead.phone,
          course: targetLead.courseInterested,
          assignedCaller: record.callerName,
          lastContacted: `${dateStr} ${timeStr}`,
          followUpDate: record.nextFollowUpDate,
          followUpTime: record.nextFollowUpTime || "11:00 AM",
          status: "Today",
          priority: targetLead.priority,
          remarks: record.remarks,
        };
        updatedFu = [newFu, ...updatedFu];
        setFollowUps(updatedFu);
      }
    }

    const exists = leads.some((lead) => lead.id === leadId);
    let newLeads: Lead[];
    if (exists) {
      newLeads = leads.map((lead) => {
        if (lead.id === leadId) {
          const history = lead.callHistory ? [...lead.callHistory] : [];
          let isRecentMerge = false;

          if (history.length > 0) {
            const latest = history[0];
            const idTimestampMatch = latest.id.match(/\d{10,}/);
            const recordAgeMs = idTimestampMatch ? Date.now() - parseInt(idTimestampMatch[0], 10) : 9999999;

            if (recordAgeMs < 300000 || (latest.callDate === dateStr && recordAgeMs < 600000)) {
              isRecentMerge = true;
              const latestParts = (latest.duration || "").split(":").map(Number);
              const latestSecs = latestParts.length === 2 ? latestParts[0] * 60 + latestParts[1] : 0;
              const mergedSecs = Math.max(latestSecs, totalSecs);
              const mergedFormatted = formatTimer(mergedSecs);
              const mergedLong = formatHumanDuration(mergedSecs);

              history[0] = {
                ...latest,
                callerName: record.callerName || latest.callerName,
                mindset: record.mindset || latest.mindset,
                duration: mergedFormatted,
                durationFormatted: mergedLong,
                outcome: mergedSecs > 0 ? "Attended Call" : "Not Attended Call",
                qualification: record.qualification || latest.qualification || lead.qualification || "",
                passedOutYear: record.passedOutYear || latest.passedOutYear || lead.passedOutYear || "",
                collegeName: record.collegeName || latest.collegeName || lead.collegeName || "",
                studentName: record.studentName || latest.studentName || lead.studentName || "",
                remarks: record.remarks || latest.remarks,
              };
            }
          }

          if (!isRecentMerge) {
            history.unshift({
              ...newRecord,
              qualification: record.qualification || lead.qualification || "",
              passedOutYear: record.passedOutYear || lead.passedOutYear || "",
              collegeName: record.collegeName || lead.collegeName || "",
              studentName: record.studentName || lead.studentName || "",
            });
          }

          let mappedStatus: LeadStatus = lead.status;
          let mappedStage: PipelineStage = lead.stage || "New Enquiry";
          if (record.mindset === "Not Interested") {
            mappedStatus = "Lost";
            mappedStage = "Lost";
          } else if (record.mindset === "Interested") {
            mappedStatus = "Interested";
            mappedStage = "Interested";
          } else if (record.mindset === "Visit to Institute") {
            mappedStatus = "Counselling Scheduled";
            mappedStage = "Counselling Scheduled";
          } else if (record.mindset === "Joined") {
            mappedStatus = "Admitted";
            mappedStage = "Admitted";
          } else if (record.mindset === "Call Later") {
            mappedStatus = "Call Later";
            mappedStage = "Contacted";
          } else if (record.mindset === "Busy") {
            mappedStatus = "Busy";
            mappedStage = "Contacted";
          }

          return {
            ...lead,
            studentName: record.studentName && !record.studentName.startsWith("Inquiry") ? record.studentName : lead.studentName,
            assignedCaller: record.callerName || lead.assignedCaller,
            status: mappedStatus,
            stage: mappedStage,
            callCount: isRecentMerge ? lead.callCount : (lead.callCount || 0) + 1,
            lastCallDate: dateStr,
            lastCallOutcome: record.mindset || record.remarks || record.outcome,
            qualification: record.qualification || lead.qualification || "",
            passedOutYear: record.passedOutYear || lead.passedOutYear || "",
            collegeName: record.collegeName || lead.collegeName || "",
            nextFollowUpDate: record.nextFollowUpDate || lead.nextFollowUpDate,
            nextFollowUpTime: record.nextFollowUpTime || lead.nextFollowUpTime,
            callHistory: history,
          };
        }
        return lead;
      });
    } else {
      const fallback = activeCallLeadRef.current || {
        id: leadId,
        studentName: `Inquiry (${leadId})`,
        phone: leadId,
        email: `inquiry.${leadId}@wegrow.local`,
        courseInterested: "Full Stack Web Development (MERN + Next.js)",
        leadSource: "Phone" as const,
        enquiryDate: dateStr,
        nextFollowUpDate: record.nextFollowUpDate || "",
        nextFollowUpTime: record.nextFollowUpTime || "",
        assignedCaller: record.callerName,
        status: "Interested" as const,
        priority: "Hot" as const,
        stage: "Interested" as const,
        notes: [],
        callHistory: [],
        callCount: 0,
      };
      const createdLead: Lead = {
        ...fallback,
        assignedCaller: record.callerName || fallback.assignedCaller,
        callCount: (fallback.callCount || 0) + 1,
        lastCallDate: dateStr,
        lastCallOutcome: record.remarks || record.outcome,
        nextFollowUpDate: record.nextFollowUpDate || fallback.nextFollowUpDate,
        nextFollowUpTime: record.nextFollowUpTime || fallback.nextFollowUpTime,
        callHistory: [newRecord, ...(fallback.callHistory || [])],
      };
      newLeads = [createdLead, ...leads];
    }

    setLeads(newLeads);
    persistLeads(newLeads, updatedFu);

    showToast({
      type: "success",
      title: "Call Logged",
      message: `Call result "${record.outcome}" saved permanently.`,
    });
  };

  const markFollowUpCompleted = (id: string) => {
    const targetTask = followUps.find((fu) => fu.id === id);
    const updated = followUps.map((fu) => (fu.id === id ? { ...fu, status: "Completed" as const } : fu));
    setFollowUps(updated);

    let updatedLeads = leads;
    if (targetTask && targetTask.leadId) {
      updatedLeads = leads.map((l) =>
        l.id === targetTask.leadId
          ? {
              ...l,
              nextFollowUpDate: "",
              nextFollowUpTime: "",
              stage: l.stage === "Counselling Scheduled" ? "Interested" : l.stage,
            }
          : l
      );
      setLeads(updatedLeads);
    }

    // Immediately persist to Supabase follow_ups table
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("follow_ups")
        .update({ status: "Completed" })
        .eq("id", id)
        .then(() => {}, () => {});

      if (targetTask && targetTask.leadId) {
        supabase
          .from("leads")
          .update({ next_follow_up_date: null, next_follow_up_time: null })
          .eq("id", targetTask.leadId)
          .then(() => {}, () => {});
      }
    }

    persistLeads(updatedLeads, updated);
    showToast({
      type: "success",
      title: "Follow-up Marked Completed",
      message: "Task has been moved to completed follow-ups.",
    });
  };

  const completeLeadFollowUp = (leadId: string) => {
    const updatedLeads = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            nextFollowUpDate: "",
            nextFollowUpTime: "",
            stage: l.stage === "Counselling Scheduled" ? "Interested" : l.stage,
          }
        : l
    );
    setLeads(updatedLeads);

    const updatedFu = followUps.map((fu) =>
      fu.leadId === leadId && fu.status !== "Completed"
        ? { ...fu, status: "Completed" as const }
        : fu
    );
    setFollowUps(updatedFu);

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("follow_ups")
        .update({ status: "Completed" })
        .eq("lead_id", leadId)
        .then(() => {}, () => {});

      supabase
        .from("leads")
        .update({ next_follow_up_date: null, next_follow_up_time: null })
        .eq("id", leadId)
        .then(() => {}, () => {});
    }

    persistLeads(updatedLeads, updatedFu);
    showToast({
      type: "success",
      title: "Follow-up Accepted & Completed",
      message: "Scheduled follow-up has been marked completed successfully.",
    });
  };

  const rescheduleFollowUp = (
    id: string,
    newDate: string,
    newTime: string,
    remarks?: string
  ) => {
    const updated = followUps.map((fu) =>
      fu.id === id
        ? {
            ...fu,
            followUpDate: newDate,
            followUpTime: newTime,
            status: "Upcoming" as const,
            remarks: remarks || fu.remarks,
          }
        : fu
    );
    setFollowUps(updated);

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("follow_ups")
        .update({
          scheduled_date: newDate,
          scheduled_time: newTime,
          status: "Pending",
          remarks: remarks || "",
        })
        .eq("id", id)
        .then(() => {}, () => {});
    }

    persistLeads(leads, updated);
    showToast({
      type: "info",
      title: "Follow-up Rescheduled",
      message: `Follow-up updated to ${newDate} at ${newTime}.`,
    });
  };

  const addNewFollowUp = (task: Omit<FollowUpTask, "id">) => {
    const newTask: FollowUpTask = {
      ...task,
      id: "fu-" + Date.now(),
    };
    const updated = [newTask, ...followUps];
    setFollowUps(updated);

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("follow_ups")
        .insert({
          id: newTask.id,
          lead_id: newTask.leadId || null,
          student_name: newTask.studentName || "",
          phone: newTask.phone || "",
          caller_name: newTask.assignedCaller || "Staff",
          course: newTask.course || "",
          scheduled_date: newTask.followUpDate || "",
          scheduled_time: newTask.followUpTime || "10:30 AM",
          status: "Pending",
          remarks: newTask.remarks || "",
        })
        .then(() => {}, () => {});
    }

    persistLeads(leads, updated);
    showToast({
      type: "success",
      title: "Follow-up Scheduled",
      message: `Follow-up scheduled for ${task.studentName} on ${task.followUpDate}.`,
    });
  };

  const sendWhatsAppMessage = (chatId: string, text: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg = {
      id: "msg-" + Date.now(),
      sender: "caller" as const,
      text,
      timestamp: timeStr,
      status: "sent" as const,
    };

    setWhatsappChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            lastMessage: text,
            lastMessageTime: timeStr,
            messages: [...chat.messages, newMsg],
          };
        }
        return chat;
      })
    );

    showToast({
      type: "success",
      title: "Message Sent",
      message: "Simulated WhatsApp message delivered to student.",
    });
  };

  const addUser = (userData: Omit<AppUser, "id" | "assignedLeads" | "joinedDate" | "lastActive">) => {
    const newUser: AppUser = {
      ...userData,
      id: "usr-" + (users.length + 1),
      assignedLeads: 0,
      joinedDate: "Today",
      lastActive: "Just now",
    };
    setUsers((prev) => {
      const existsIndex = prev.findIndex(
        (u) => u.name.toLowerCase().trim() === userData.name.toLowerCase().trim()
      );
      let updated: AppUser[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = { ...updated[existsIndex], ...newUser, id: updated[existsIndex].id };
      } else {
        updated = [...prev, newUser];
      }
      const seen = new Set<string>();
      const deduped: AppUser[] = [];
      for (const u of updated) {
        const key = (u.name || "").toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(u);
        }
      }
      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(deduped));
      } catch {}
      return deduped;
    });

    if (userData.role === "Telecaller") {
      const newTelecaller: Telecaller = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        avatar: newUser.avatar || "",
        role: "Telecalling Executive",
        assignedLeads: 0,
        dailyTarget: 50,
        callsCompleted: 0,
        connectedCalls: 0,
        interestedLeads: 0,
        followUpsCompleted: 0,
        admissionsGenerated: 0,
        conversionRate: 0,
        rank: telecallers.length + 1,
        status: "Active",
        isPunchedIn: true,
        password: (userData as any).password || "1234",
      };
      setTelecallers((prev) => {
        const idx = prev.findIndex((t) => t.name.toLowerCase().trim() === newUser.name.toLowerCase().trim());
        if (idx >= 0) {
          const cp = [...prev];
          cp[idx] = { ...cp[idx], ...newTelecaller };
          return cp;
        }
        return [...prev, newTelecaller];
      });
      fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTelecaller),
      }).catch(() => {});
    }

    showToast({
      type: "success",
      title: "User Created",
      message: `${newUser.name} added as ${newUser.role}.`,
    });
  };

  const updateUserRole = (id: string, newRole: AppUser["role"]) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === id ? { ...u, role: newRole } : u));
      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updated));
      } catch {}
      const target = updated.find((u) => u.id === id);
      if (target && target.role === "Telecaller") {
        fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: target.name, role: "Telecalling Executive" }),
        }).catch(() => {});
      }
      return updated;
    });
    showToast({
      type: "info",
      title: "Role Updated",
      message: `User role changed to ${newRole}.`,
    });
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const newStatus: "Active" | "Inactive" = u.status === "Active" ? "Inactive" : "Active";
          fetch("/api/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: u.name, status: newStatus, isFrozen: newStatus === "Inactive" }),
          }).catch(() => {});
          return { ...u, status: newStatus, isFrozen: newStatus === "Inactive" };
        }
        return u;
      });
      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast({
      type: "info",
      title: "Status Changed",
      message: "User status toggled.",
    });
  };

  const updateStaffAvatar = (staffName: string, avatarUrl: string) => {
    const cleanTarget = staffName.trim().toLowerCase();

    const matchedCaller = telecallers.find(
      (t) => t.name.toLowerCase().trim() === cleanTarget || t.id.toLowerCase() === cleanTarget
    );
    const matchedUser = users.find(
      (u) =>
        u.name.toLowerCase().trim() === cleanTarget ||
        u.name.toLowerCase().includes(cleanTarget) ||
        u.id.toLowerCase() === cleanTarget
    );
    const resolvedName = matchedCaller?.name || matchedUser?.name || staffName.trim();
    const isTelecallerAccount = Boolean(matchedCaller) || matchedUser?.role === "Telecaller";

    // 1. Update in telecallers list
    setTelecallers((prev) =>
      prev.map((t) =>
        t.name.toLowerCase().trim() === cleanTarget || t.id.toLowerCase() === cleanTarget
          ? { ...t, avatar: avatarUrl }
          : t
      )
    );

    // 2. Update in users list + persist wegrow_jobz_users_v2 + currentUser
    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.name.toLowerCase().trim() === cleanTarget ||
        u.name.toLowerCase().includes(cleanTarget) ||
        u.id.toLowerCase() === cleanTarget
          ? { ...u, avatar: avatarUrl }
          : u
      );
      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (
      currentUser &&
      (currentUser.name.toLowerCase().trim() === cleanTarget ||
        currentUser.name.toLowerCase().includes(cleanTarget))
    ) {
      setCurrentUser({ ...currentUser, avatar: avatarUrl });
    }

    // 3. Persist in localStorage avatars map + Server /api/staff + Supabase Cloud (for telecallers)
    try {
      const stored = localStorage.getItem("wegrow_staff_avatars");
      const map = stored ? JSON.parse(stored) : {};
      map[resolvedName] = avatarUrl;
      localStorage.setItem("wegrow_staff_avatars", JSON.stringify(map));
    } catch {}

    if (isTelecallerAccount) {
      fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: resolvedName, avatar: avatarUrl }),
      }).catch(() => {});
    }

    showToast({
      type: "success",
      title: "Photo Saved Permanently",
      message: `Profile picture for ${resolvedName} saved to website & cloud.`,
    });
  };

  // Admin & Floor Supervisor Methods
  const addTelecaller = (callerData: {
    name: string;
    phone: string;
    email: string;
    dailyTarget?: number;
    role?: "Senior Telecaller" | "Telecalling Executive" | "Admissions Counsellor";
    password?: string;
  }) => {
    const id = "TC-" + (telecallers.length + 1).toString().padStart(3, "0");
    const newCaller: Telecaller = {
      id,
      name: callerData.name,
      phone: callerData.phone,
      email: callerData.email,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      role: callerData.role || "Telecalling Executive",
      assignedLeads: 0,
      dailyTarget: callerData.dailyTarget || 50,
      callsCompleted: 0,
      connectedCalls: 0,
      interestedLeads: 0,
      followUpsCompleted: 0,
      admissionsGenerated: 0,
      conversionRate: 0,
      rank: telecallers.length + 1,
      status: "Active",
      isPunchedIn: true,
      punchInTime: "09:30 AM",
      workingHours: "0h 0m",
      password: callerData.password || "1234",
    };
    setTelecallers((prev) => {
      const idx = prev.findIndex(
        (t) => t.name.toLowerCase().trim() === callerData.name.toLowerCase().trim()
      );
      if (idx >= 0) {
        const cp = [...prev];
        cp[idx] = { ...cp[idx], ...newCaller, id: cp[idx].id };
        return cp;
      }
      return [...prev, newCaller];
    });

    // Also register in AppUsers
    const newUser: AppUser = {
      id: `usr-${callerData.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      name: callerData.name,
      email: callerData.email,
      phone: callerData.phone,
      role: "Telecaller",
      assignedLeads: 0,
      status: "Active",
      joinedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      lastActive: "Active now",
      password: callerData.password || "1234",
    };
    setUsers((prev) => {
      const existsIndex = prev.findIndex(
        (u) => u.name.toLowerCase().trim() === callerData.name.toLowerCase().trim()
      );
      let updated: AppUser[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = { ...updated[existsIndex], ...newUser, id: updated[existsIndex].id };
      } else {
        updated = [...prev, newUser];
      }
      const seen = new Set<string>();
      const deduped: AppUser[] = [];
      for (const u of updated) {
        const key = (u.name || "").toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(u);
        }
      }
      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(deduped));
      } catch {}
      return deduped;
    });

    // Persist new telecaller to server storage for mobile app sync
    fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCaller),
    }).catch(() => {});

    showToast({
      type: "success",
      title: "Telecaller Enrolled",
      message: `${callerData.name} has been enrolled with a daily target of ${newCaller.dailyTarget} calls.`,
    });
  };

  const toggleTelecallerStatus = (id: string) => {
    setTelecallers((prev) =>
      prev.map((t) => {
        if (t.id === id || t.name.toLowerCase() === id.toLowerCase()) {
          const nextStatus: "Active" | "Inactive" = t.status === "Active" ? "Inactive" : "Active";
          fetch("/api/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: t.name, status: nextStatus, isFrozen: nextStatus === "Inactive" }),
          }).catch(() => {});
          return { ...t, status: nextStatus, isFrozen: nextStatus === "Inactive" };
        }
        return t;
      })
    );
    showToast({
      type: "info",
      title: "Telecaller Status Updated",
      message: "Floor calling status has been updated.",
    });
  };

  const updateTelecallerTarget = (id: string, targetCalls: number) => {
    setTelecallers((prev) =>
      prev.map((t) => {
        if (t.id === id || t.name.toLowerCase() === id.toLowerCase()) {
          fetch("/api/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: t.name, dailyTarget: targetCalls }),
          }).catch(() => {});
          return { ...t, dailyTarget: targetCalls };
        }
        return t;
      })
    );
    showToast({
      type: "success",
      title: "Target Updated",
      message: `Daily target set to ${targetCalls} calls.`,
    });
  };

  const deleteTelecaller = (idOrName: string) => {
    setTelecallers((prev) =>
      prev.filter((t) => t.id !== idOrName && t.name.toLowerCase() !== idOrName.toLowerCase())
    );
    setUsers((prev) =>
      prev.filter((u) => u.id !== idOrName && u.name.toLowerCase() !== idOrName.toLowerCase())
    );
    fetch(`/api/staff?id=${encodeURIComponent(idOrName)}&name=${encodeURIComponent(idOrName)}`, {
      method: "DELETE",
    }).catch(() => {});
    showToast({
      type: "success",
      title: "Telecaller Removed",
      message: "Telecaller account has been removed successfully.",
    });
  };

  const distributeLeadsBulk = async (leadIds: string[], targetCaller: string) => {
    if (leadIds.length === 0 || !targetCaller) return;
    setLeads((prev) =>
      prev.map((l) =>
        leadIds.includes(l.id) ? { ...l, assignedCaller: targetCaller } : l
      )
    );
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("jobz_leads")
          .update({ assigned_caller: targetCaller })
          .in("id", leadIds);
      } catch (err) {
        console.warn("Supabase lead distribution sync error:", err);
      }
    }
    showToast({
      type: "success",
      title: "Leads Distributed",
      message: `${leadIds.length} candidate leads assigned to ${targetCaller}.`,
    });
  };

  const reassignStaffLeads = async (fromCaller: string, toCaller: string) => {
    if (!fromCaller || !toCaller || fromCaller.toLowerCase() === toCaller.toLowerCase()) return;
    const matchingIds = leads
      .filter((l) => (l.assignedCaller || "").toLowerCase() === fromCaller.toLowerCase())
      .map((l) => l.id);

    if (matchingIds.length === 0) {
      showToast({
        type: "warning",
        title: "No Leads Found",
        message: `No active leads currently assigned to ${fromCaller}.`,
      });
      return;
    }

    setLeads((prev) =>
      prev.map((l) =>
        matchingIds.includes(l.id) ? { ...l, assignedCaller: toCaller } : l
      )
    );

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("jobz_leads")
          .update({ assigned_caller: toCaller })
          .in("id", matchingIds);
      } catch (err) {
        console.warn("Supabase staff reassign sync error:", err);
      }
    }

    showToast({
      type: "success",
      title: "Staff Leads Reassigned",
      message: `Transferred ${matchingIds.length} candidate leads from ${fromCaller} to ${toCaller}.`,
    });
  };

  const auditCallRecord = async (
    leadId: string,
    callTimestampOrId: string,
    auditStatus: "verified" | "suspicious" | "needs_review",
    auditNote?: string,
    auditRating?: number
  ) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const updatedHistory = (l.callHistory || []).map((c) => {
          if (c.id === callTimestampOrId || c.callTime === callTimestampOrId || c.callDate === callTimestampOrId) {
            return {
              ...c,
              auditStatus,
              auditNote: auditNote || c.auditNote,
              auditRating: typeof auditRating === "number" ? auditRating : c.auditRating,
            };
          }
          return c;
        });
        return { ...l, callHistory: updatedHistory };
      })
    );

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("jobz_calls")
          .update({
            audit_status: auditStatus,
            audit_note: auditNote || null,
            audit_rating: auditRating || null,
          })
          .match({ lead_id: leadId });
      } catch (err) {
        console.warn("Supabase call audit sync error:", err);
      }
    }

    showToast({
      type: "info",
      title: "Call Audit Logged",
      message: `Call marked as ${
        auditStatus === "verified"
          ? "Verified ✅"
          : auditStatus === "suspicious"
          ? "Suspicious ⚠️"
          : "Needs Review 🔍"
      }.`,
    });
  };

  const verifySecurityPin = useCallback((pin: string): boolean => {
    const activePin = securityPin || "7708";
    if (pin.trim() === activePin.trim()) {
      setIsManagementUnlocked(true);
      try {
        sessionStorage.setItem("wegrow_mgmt_unlocked", "true");
      } catch {}
      return true;
    }
    return false;
  }, [securityPin]);

  const updateSecurityPin = useCallback(
    (oldPin: string, newPin: string): { success: boolean; error?: string } => {
      const activePin = securityPin || "7708";
      if (oldPin.trim() !== activePin.trim()) {
        return { success: false, error: "Current PIN is incorrect." };
      }
      if (!/^\d{4}$/.test(newPin.trim())) {
        return { success: false, error: "New PIN must be exactly 4 numeric digits." };
      }
      const clean = newPin.trim();
      setSecurityPin(clean);
      try {
        localStorage.setItem("wegrow_security_pin", clean);
      } catch {}
      showToast({
        type: "success",
        title: "Security PIN Updated",
        message: "Management access PIN updated successfully.",
      });
      return { success: true };
    },
    [securityPin, showToast]
  );

  const lockManagementSession = useCallback(() => {
    setIsManagementUnlocked(false);
    try {
      sessionStorage.removeItem("wegrow_mgmt_unlocked");
    } catch {}
    setActiveUserRole("Telecaller");
    showToast({
      type: "info",
      title: "Session Locked",
      message: "Switched to Telecaller Desk. Enter 4-digit PIN to access Owner/Admin.",
    });
  }, [showToast]);

  const unlockManagementSession = useCallback(() => {
    setIsManagementUnlocked(true);
    try {
      sessionStorage.setItem("wegrow_mgmt_unlocked", "true");
    } catch {}
  }, []);

  const loginAsUser = useCallback(
    (
      userIdOrName: string,
      passwordAttempt: string
    ): { success: boolean; requirePasswordChange?: boolean; user?: AppUser; error?: string } => {
      const targetUser = users.find(
        (u) =>
          u.id.toLowerCase() === userIdOrName.toLowerCase() ||
          u.name.toLowerCase() === userIdOrName.toLowerCase()
      );

      if (!targetUser) {
        return { success: false, error: "Staff account not found." };
      }

      if (targetUser.status === "Inactive" || targetUser.isFrozen) {
        return {
          success: false,
          error: `Account Frozen! Access for ${targetUser.name} is currently suspended by Management. Contact Owner/Admin.`,
        };
      }

      const expectedPassword = targetUser.password || "1234";
      if (passwordAttempt.trim() !== expectedPassword.trim()) {
        return { success: false, error: `Access Denied! Incorrect password for ${targetUser.name}.` };
      }

      const nowStr = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updatedTarget: AppUser = {
        ...targetUser,
        lastLoginAt: nowStr,
        lastActive: "Active now",
      };

      // If management triggered a reset, require them to set their own private password now
      if (targetUser.mustChangePassword) {
        return {
          success: true,
          requirePasswordChange: true,
          user: updatedTarget,
        };
      }

      setCurrentUser(updatedTarget);
      setActiveUserRole(updatedTarget.role);
      const isMgmt = updatedTarget.role === "Owner" || updatedTarget.role === "Admin";
      setIsManagementUnlocked(isMgmt);

      const updatedUsers = users.map((u) => (u.id === targetUser.id ? updatedTarget : u));
      setUsers(updatedUsers);

      try {
        sessionStorage.setItem("wegrow_current_user_id", targetUser.id);
        if (isMgmt) {
          sessionStorage.setItem("wegrow_mgmt_unlocked", "true");
        } else {
          sessionStorage.removeItem("wegrow_mgmt_unlocked");
        }
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updatedUsers));
      } catch {}

      fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: targetUser.name, lastLoginAt: nowStr }),
      }).catch(() => {});

      showToast({
        type: "success",
        title: "Login Successful",
        message: `Welcome back, ${targetUser.name} (${targetUser.role})!`,
      });

      return { success: true, user: updatedTarget };
    },
    [users, showToast]
  );

  const triggerUserPasswordReset = useCallback(
    (userId: string) => {
      let targetName = "Staff";
      const updatedUsers = users.map((u) => {
        if (u.id === userId || u.name.toLowerCase() === userId.toLowerCase()) {
          targetName = u.name;
          return { ...u, mustChangePassword: true };
        }
        return u;
      });
      setUsers(updatedUsers);
      setTelecallers((prev) =>
        prev.map((t) =>
          t.name.toLowerCase() === userId.toLowerCase() || t.id.toLowerCase() === userId.toLowerCase()
            ? { ...t, mustChangePassword: true }
            : t
        )
      );
      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updatedUsers));
      } catch {}
      const targetUser = updatedUsers.find((u) => u.id === userId || u.name.toLowerCase() === userId.toLowerCase());
      if (targetUser) {
        fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: targetUser.name, mustChangePassword: true }),
        }).catch(() => {});
      }
      showToast({
        type: "success",
        title: "Password Reset Triggered",
        message: `Reset enabled for ${targetName}. They will set their own private password on next login.`,
      });
      return { success: true };
    },
    [users, showToast]
  );

  const toggleUserFreeze = useCallback(
    (userId: string) => {
      let newFrozenState = false;
      let targetName = "Staff";
      const updatedUsers: AppUser[] = users.map((u) => {
        if (u.id === userId || u.name.toLowerCase() === userId.toLowerCase()) {
          newFrozenState = !u.isFrozen && u.status === "Active";
          targetName = u.name;
          const updatedStatus: "Active" | "Inactive" = newFrozenState ? "Inactive" : "Active";
          return {
            ...u,
            isFrozen: newFrozenState,
            status: updatedStatus,
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      setTelecallers((prev) =>
        prev.map((t) =>
          t.name.toLowerCase() === userId.toLowerCase() || t.id.toLowerCase() === userId.toLowerCase()
            ? {
                ...t,
                isFrozen: newFrozenState,
                status: (newFrozenState ? "Inactive" : "Active") as "Active" | "Inactive",
              }
            : t
        )
      );
      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updatedUsers));
      } catch {}
      fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetName,
          isFrozen: newFrozenState,
          status: newFrozenState ? "Inactive" : "Active",
        }),
      }).catch(() => {});
      showToast({
        type: newFrozenState ? "warning" : "success",
        title: newFrozenState ? "Account Frozen" : "Account Reactivated",
        message: newFrozenState
          ? `${targetName}'s account has been frozen. They cannot log in until reactivated.`
          : `${targetName}'s account has been reactivated.`,
      });
      return { success: true, isFrozen: newFrozenState };
    },
    [users, showToast]
  );

  const setSelfNewPassword = useCallback(
    (userId: string, newPassword: string) => {
      if (!newPassword || newPassword.trim().length < 3) {
        return { success: false, error: "Password must be at least 3 characters or digits." };
      }
      const clean = newPassword.trim();
      let targetUser: AppUser | undefined;
      const nowStr = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updatedUsers = users.map((u) => {
        if (u.id === userId || u.name.toLowerCase() === userId.toLowerCase()) {
          targetUser = {
            ...u,
            password: clean,
            mustChangePassword: false,
            lastActive: "Active now",
            lastLoginAt: nowStr,
          };
          return targetUser;
        }
        return u;
      });

      if (!targetUser) {
        return { success: false, error: "User account not found." };
      }

      setUsers(updatedUsers);
      setCurrentUser(targetUser);
      setActiveUserRole(targetUser.role);
      const isMgmt = targetUser.role === "Owner" || targetUser.role === "Admin";
      setIsManagementUnlocked(isMgmt);

      setTelecallers((prev) =>
        prev.map((t) =>
          t.name.toLowerCase() === targetUser!.name.toLowerCase()
            ? { ...t, password: clean, mustChangePassword: false }
            : t
        )
      );

      try {
        sessionStorage.setItem("wegrow_current_user_id", targetUser.id);
        if (isMgmt) {
          sessionStorage.setItem("wegrow_mgmt_unlocked", "true");
        } else {
          sessionStorage.removeItem("wegrow_mgmt_unlocked");
        }
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updatedUsers));
      } catch {}

      fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: targetUser.name, password: clean, mustChangePassword: false }),
      }).catch(() => {});

      showToast({
        type: "success",
        title: "Private Password Set Successfully",
        message: `Welcome, ${targetUser.name}! Your private password is saved securely.`,
      });

      return { success: true };
    },
    [users, showToast]
  );

  const updateUserPassword = useCallback(
    (userId: string, newPassword: string, oldPassword?: string): { success: boolean; error?: string } => {
      const targetUser = users.find(
        (u) => u.id === userId || u.name.toLowerCase() === userId.toLowerCase()
      );

      if (!targetUser) {
        return { success: false, error: "Staff account not found." };
      }

      if (oldPassword !== undefined && oldPassword.trim()) {
        const currentExpected = targetUser.password || "1234";
        if (oldPassword.trim() !== currentExpected.trim()) {
          return { success: false, error: "Current password does not match." };
        }
      }

      if (!newPassword || newPassword.trim().length < 3) {
        return { success: false, error: "Password must be at least 3 characters or digits." };
      }

      const updatedClean = newPassword.trim();
      const updatedUsers = users.map((u) =>
        u.id === targetUser.id ? { ...u, password: updatedClean } : u
      );
      setUsers(updatedUsers);

      if (currentUser && currentUser.id === targetUser.id) {
        setCurrentUser({ ...targetUser, password: updatedClean });
      }

      setTelecallers((prev) =>
        prev.map((t) =>
          t.name.toLowerCase() === targetUser.name.toLowerCase() ? { ...t, password: updatedClean } : t
        )
      );

      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updatedUsers));
      } catch {}

      fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: targetUser.name, password: updatedClean, mustChangePassword: false }),
      }).catch(() => {});

      showToast({
        type: "success",
        title: "Password Updated",
        message: `Login password for ${targetUser.name} has been updated.`,
      });

      return { success: true };
    },
    [users, currentUser, showToast]
  );

  const updateUserProfile = useCallback(
    (userId: string, data: Partial<AppUser>): { success: boolean; error?: string } => {
      const targetUser = users.find(
        (u) => u.id === userId || u.name.toLowerCase() === userId.toLowerCase()
      );

      if (!targetUser) {
        return { success: false, error: "Staff account not found." };
      }

      const updatedUser: AppUser = {
        ...targetUser,
        ...data,
      };

      const updatedUsers = users.map((u) => (u.id === targetUser.id ? updatedUser : u));
      setUsers(updatedUsers);

      if (currentUser && currentUser.id === targetUser.id) {
        setCurrentUser(updatedUser);
      }

      setTelecallers((prev) =>
        prev.map((t) =>
          t.name.toLowerCase() === targetUser.name.toLowerCase() || t.id.toLowerCase() === targetUser.id.toLowerCase()
            ? {
                ...t,
                name: updatedUser.name || t.name,
                phone: updatedUser.phone || t.phone,
                email: updatedUser.email || t.email,
                avatar: updatedUser.avatar || t.avatar,
                languages: updatedUser.languages || t.languages,
                specialization: updatedUser.specialization || t.specialization,
                bio: updatedUser.bio || t.bio,
                whatsapp: updatedUser.whatsapp || t.whatsapp,
              }
            : t
        )
      );

      try {
        localStorage.setItem("wegrow_jobz_users_v2", JSON.stringify(updatedUsers));
        if (updatedUser.avatar) {
          const avRaw = localStorage.getItem("wegrow_staff_avatars");
          const avMap = avRaw ? JSON.parse(avRaw) : {};
          avMap[updatedUser.name] = updatedUser.avatar;
          localStorage.setItem("wegrow_staff_avatars", JSON.stringify(avMap));
        }
      } catch {}

      // Persist to server /api/staff only for Telecaller accounts (keeps Owner/Admin out of mobile dialer list)
      if (updatedUser.role === "Telecaller") {
        fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updatedUser,
            role: "Telecalling Executive",
          }),
        }).catch(() => {});
      }

      showToast({
        type: "success",
        title: "Profile Updated",
        message: `Your profile details have been saved successfully.`,
      });

      return { success: true };
    },
    [users, currentUser, showToast]
  );

  const logoutUser = useCallback(() => {
    const defaultCaller = users.find((u) => u.role === "Telecaller") || users[users.length - 1];
    if (defaultCaller) {
      setCurrentUser(defaultCaller);
    }
    setActiveUserRole("Telecaller");
    setIsManagementUnlocked(false);
    try {
      sessionStorage.removeItem("wegrow_mgmt_unlocked");
      sessionStorage.removeItem("wegrow_current_user_id");
    } catch {}
    showToast({
      type: "info",
      title: "Session Locked",
      message: "Logged out. Switched to Telecaller Desk.",
    });
  }, [users, showToast]);

  return (
    <CRMContext.Provider
      value={{
        leads,
        followUps,
        whatsappChats,
        courses,
        telecallers,
        users,
        currentUser,
        setCurrentUser,
        loginAsUser,
        updateUserPassword,
        updateUserProfile,
        triggerUserPasswordReset,
        toggleUserFreeze,
        setSelfNewPassword,
        logoutUser,
        activeUserRole,
        setActiveUserRole,
        toasts,
        showToast,
        addToast,
        dismissToast,
        activeCallLead,
        setActiveCallLead,
        isCallModalOpen,
        openCallModal,
        closeCallModal,
        isCallConnected,
        setIsCallConnected,
        callPhase,
        callDuration,
        lastCallDuration,
        setLastCallDuration,
        activePhoneNumber,
        initiateCall,
        answerCall,
        endCallSession,
        telephonyStatus,
        telephonyMode,
        setTelephonyMode,
        refreshTelephonyStatus,
        reconnectTelephony,
        addLead,
        addLeadsBulk,
        updateLead,
        updateLeadStatus,
        assignCaller,
        addLeadNote,
        addCallRecord,
        markFollowUpCompleted,
        completeLeadFollowUp,
        rescheduleFollowUp,
        addNewFollowUp,
        sendWhatsAppMessage,
        addUser,
        updateUserRole,
        toggleUserStatus,
        updateStaffAvatar,
        addTelecaller,
        toggleTelecallerStatus,
        updateTelecallerTarget,
        deleteTelecaller,
        distributeLeadsBulk,
        reassignStaffLeads,
        auditCallRecord,
        isManagementUnlocked,
        verifySecurityPin,
        updateSecurityPin,
        lockManagementSession,
        unlockManagementSession,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error("useCRM must be used within a CRMProvider");
  }
  return context;
};
