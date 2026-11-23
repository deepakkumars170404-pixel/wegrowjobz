import "react-native-url-polyfill/auto";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  LogBox,
  Platform,
  Alert,
  StatusBar as RNStatusBar,
  AppState,
  AppStateStatus,
} from "react-native";
import { ListFilter, PhoneCall, BarChart3, Settings, Briefcase, GraduationCap } from "lucide-react-native";

LogBox.ignoreAllLogs(true);
import { StatusBar } from "expo-status-bar";
import { THEME } from "./src/constants/theme";
import { QueueScreen } from "./src/screens/QueueScreen";
import { DialerScreen } from "./src/screens/DialerScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ActiveCallOverlay } from "./src/components/ActiveCallOverlay";
import { CallModal } from "./src/screens/CallModal";
import { TelecallerHeader } from "./src/components/TelecallerHeader";
import { StaffSelectModal } from "./src/components/StaffSelectModal";
import { PunchOutReportModal } from "./src/components/PunchOutReportModal";
import { AppUpdateModal } from "./src/components/AppUpdateModal";
import { Lead, StaffMember, AppMode, AttendanceRecord, CallRecord } from "./src/types";
import { ApiService } from "./src/services/api";
import { StorageService } from "./src/services/storage";
import { TelephonyService } from "./src/services/telephony";

type Tab = "queue" | "dialer" | "dashboard" | "settings";

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>("queue");
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const [modalDuration, setModalDuration] = useState<number>(0);
  const [modalStartMs, setModalStartMs] = useState<number | undefined>(undefined);
  const [modalEndMs, setModalEndMs] = useState<number | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [activeStaff, setActiveStaff] = useState<StaffMember>("Muthumeena");

  // Mode Switcher: Admission vs Jobz
  const [appMode, setAppMode] = useState<AppMode>("jobz");

  // Telecaller Attendance States
  const [isPunchedIn, setIsPunchedIn] = useState<boolean>(false);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [completedCallsCount, setCompletedCallsCount] = useState<number>(0);
  const [spokenSeconds, setSpokenSeconds] = useState<number>(0);

  // Modals for Staff Selection & Punch Out Report
  const [isStaffSelectVisible, setIsStaffSelectVisible] = useState<boolean>(false);
  const [isPunchOutModalVisible, setIsPunchOutModalVisible] = useState<boolean>(false);
  const [todayCallsForReport, setTodayCallsForReport] = useState<CallRecord[]>([]);

  // In-App Auto Update States
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    latestVersion?: string;
    currentVersion?: string;
    releaseNotes?: string[];
    apkUrl?: string;
    forceUpdate?: boolean;
  } | null>(null);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState<boolean>(false);

  const isCallingRef = useRef<boolean>(false);

  // Track when dial session started for recording lookup
  const dialSessionStartMsRef = useRef<number>(0);

  // Recording path found after call ended (passed to CallModal)
  const [modalRecordingPath, setModalRecordingPath] = useState<string | undefined>(undefined);

  // Initialize App Mode, Settings and Attendance Gate
  useEffect(() => {
    (async () => {
      const savedMode = await StorageService.getAppMode();
      setAppMode(savedMode);

      const settings = await StorageService.getSettings();
      const staff = (settings.callerName as StaffMember) || "Muthumeena";
      setActiveStaff(staff);

      // Check today's attendance for this staff
      const att = await StorageService.getTodayAttendance(staff);
      if (att && att.status === "Punched In") {
        setAttendanceRecord(att);
        setIsPunchedIn(true);
        setCompletedCallsCount(att.totalCallsToday || 0);
        setSpokenSeconds(att.spokenSeconds || 0);
      } else {
        // App open -> Show staff selection & punch-in gate so caller identity is verified
        setIsStaffSelectVisible(true);
      }

      // Sync offline calls in background
      ApiService.syncPendingCalls().catch(() => {});

      // Check for In-App Updates on Launch
      setTimeout(async () => {
        try {
          const update = await ApiService.checkAppUpdate();
          if (update && update.hasUpdate) {
            setUpdateInfo(update);
            setIsUpdateModalVisible(true);
          }
        } catch {}
      }, 1500);
    })();
  }, []);

  // Mode Switch Helper
  const handleToggleMode = async (mode: AppMode) => {
    setAppMode(mode);
    await StorageService.setAppMode(mode);
    if (mode === "admission") {
      Alert.alert(
        "Mode: Admission CRM 🎓",
        "Calls will now connect automatically through WeGrow In-App Dialer with live call controls."
      );
    } else {
      Alert.alert(
        "Mode: Jobz CRM 💼",
        "Calls will now connect automatically through Google Dialer with post-call form return."
      );
    }
  };

  // Handle Staff Selection & Punch In
  const handleSelectAndPunchIn = async (staff: StaffMember) => {
    setActiveStaff(staff);
    await StorageService.saveSettings({ callerName: staff });

    const newAtt = await StorageService.punchInAttendance(staff);
    setAttendanceRecord(newAtt);
    setIsPunchedIn(true);
    setIsStaffSelectVisible(false);

    // Sync attendance to Supabase Cloud
    ApiService.syncAttendanceRecord(newAtt).catch(() => {});
  };

  // Handle Dedicated Punch Out Toggle
  const handlePunchToggle = async () => {
    if (!isPunchedIn) {
      // If not punched in, show staff selection modal
      setIsStaffSelectVisible(true);
      return;
    }

    Alert.alert(
      "Shift Punch Out",
      `Are you sure you want to Punch Out as ${activeStaff} and generate your Daily Calls Report?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Punch Out",
          style: "destructive",
          onPress: async () => {
            const history = await StorageService.getCallHistory();
            const todayStr = new Date().toISOString().split("T")[0];
            const todayCalls = history.filter((h) => {
              if (h.callDate && h.callDate.startsWith(todayStr)) return true;
              if (h.callStartTime && h.callStartTime.startsWith(todayStr)) return true;
              if (h.timestamp) {
                const tsDate = new Date(h.timestamp).toISOString().split("T")[0];
                if (tsDate === todayStr) return true;
              }
              return false;
            });

            const updatedAtt = await StorageService.punchOutAttendance(
              activeStaff,
              completedCallsCount,
              spokenSeconds
            );

            if (updatedAtt) {
              setAttendanceRecord(updatedAtt);
              setIsPunchedIn(false);
              setTodayCallsForReport(todayCalls);
              setIsPunchOutModalVisible(true);

              // Sync attendance to cloud
              ApiService.syncAttendanceRecord(updatedAtt).catch(() => {});
            }
          },
        },
      ]
    );
  };

  const handleCallEnded = (callData: {
    phoneNumber: string;
    studentName: string;
    durationSeconds: number;
    startMs?: number;
    endMs?: number;
    lead: Lead | null;
    recordingPath?: string;
  }) => {
    isCallingRef.current = false;

    const targetLead: Lead = callData.lead || {
      id: `inq-${Date.now()}`,
      studentName: callData.studentName || (appMode === "jobz" ? "Job Candidate Inquiry" : "Student Inquiry"),
      phone: callData.phoneNumber,
      email: "",
      courseInterested: "",
      leadSource: "Direct Phone Call",
      enquiryDate: new Date().toISOString().split("T")[0],
      nextFollowUpDate: "",
      nextFollowUpTime: "",
      assignedCaller: activeStaff,
      status: "New",
      priority: "Warm",
      stage: "New Enquiry",
      appMode,
    };

    setModalLead(targetLead);
    setModalDuration(callData.durationSeconds);
    setModalStartMs(callData.startMs);
    setModalEndMs(callData.endMs);
    setModalRecordingPath(callData.recordingPath);
    setIsModalVisible(true);

    // Accurately accumulate spoken seconds from carrier/Google dialer call duration
    if (callData.durationSeconds > 0) {
      setSpokenSeconds((prev) => {
        const updated = prev + callData.durationSeconds;
        StorageService.updateAttendanceSpokenSeconds(activeStaff, callData.durationSeconds).then((att) => {
          if (att) ApiService.syncAttendanceRecord(att).catch(() => {});
        }).catch(() => {});
        return updated;
      });
    }
  };

  // Auto-detect returning from Google Dialer: Opens Post-Call Feedback Form automatically!
  // Robust Retry Loop: polls CallLog up to 5 times (total ~2.5s) to guarantee accurate carrier seconds
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        const session = TelephonyService.getActiveDialSession();
        if (session) {
          TelephonyService.clearActiveDialSession();

          // Poll CallLog with retry loop (Android CallLog can take 500ms - 2000ms to persist)
          let exactDuration: number | null = null;
          let startMs: number | undefined = undefined;
          let endMs: number | undefined = undefined;
          let callActuallyHappened = false;

          const maxAttempts = 6;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // Wait interval: 350ms before check
            await new Promise((r) => setTimeout(r, 350));

            try {
              const lastLog = await TelephonyService.getLastCallLog(session.phone);
              if (lastLog && typeof lastLog.durationSeconds === "number") {
                const logTimestamp = lastLog.timestamp || 0;
                // Allow matching within 10 seconds before dial session or after
                const isRecent = logTimestamp > session.startTime - 10000;
                const callType = lastLog.callType;
                const isCallRecorded = callType === 1 || callType === 2 || callType === 3 || callType === 5 || callType === 6;

                if (isRecent && isCallRecorded) {
                  callActuallyHappened = true;
                  exactDuration = lastLog.durationSeconds;
                  if (lastLog.startTimestamp) startMs = lastLog.startTimestamp;
                  if (lastLog.endTimestamp) endMs = lastLog.endTimestamp;

                  // If we got a positive duration (>0), carrier log is fully written!
                  if (exactDuration > 0) {
                    console.log(`[WeGrow] CallLog accurate seconds found on attempt ${attempt}: ${exactDuration}s`);
                    break;
                  }
                }
              }
            } catch (err) {
              console.warn("[WeGrow] CallLog poll error:", err);
            }
          }

          // If no call was detected in call log, check fallback time
          const wallClockElapsed = Math.max(0, Math.round((Date.now() - session.startTime) / 1000));
          // If staff was in Google Dialer for at least 3 seconds, treat as call occurred
          if (!callActuallyHappened && wallClockElapsed >= 3) {
            callActuallyHappened = true;
            exactDuration = wallClockElapsed;
          }

          // If still no call actually happened (e.g., pressed call and returned immediately < 3s with no log), skip form!
          if (!callActuallyHappened) {
            console.log("[WeGrow] User returned immediately without placing call. Skipped.");
            return;
          }

          const finalDuration = exactDuration !== null ? exactDuration : wallClockElapsed;
          if (!startMs) startMs = session.startTime;
          if (!endMs) endMs = Date.now();

          const cachedLead = await StorageService.lookupLeadUnified(session.phone);

          // ── RECORDING AUTO-FETCH ──
          let recordingPath: string | undefined = undefined;
          try {
            const rec = await TelephonyService.getLatestCallRecording(session.startTime);
            if (rec && rec.path) {
              recordingPath = rec.path;
              console.log("[WeGrow] Call recording detected:", rec.name, rec.size, "bytes");
            }
          } catch (e) {
            console.warn("[WeGrow] Recording fetch error:", e);
          }

          handleCallEnded({
            phoneNumber: session.phone,
            studentName: session.name,
            durationSeconds: finalDuration,
            startMs,
            endMs,
            lead: cachedLead ? { ...cachedLead, phone: session.phone } : null,
            recordingPath,
          });
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [appMode, activeStaff]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Top Bar: Official WeGrow JobZ Logo & Staff Shortcut */}
      <View style={styles.topBar}>
        <Image
          source={require("./assets/wegrow_jobz_logo.png")}
          style={styles.jobzTopLogo}
          resizeMode="contain"
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {/* Change Staff Shortcut */}
          <TouchableOpacity
            style={styles.switchStaffBtn}
            onPress={() => setIsStaffSelectVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.switchStaffText}>👤 {activeStaff}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clean Telecaller Status Bar (No Target Bar, No Idle Timer) */}
      <TelecallerHeader
        completedCalls={completedCallsCount}
        spokenSeconds={spokenSeconds}
        staffName={activeStaff}
        isPunchedIn={isPunchedIn}
        onPunchToggle={handlePunchToggle}
        onChangeStaff={() => setIsStaffSelectVisible(true)}
      />

      {/* Screen Body */}
      <View style={styles.screenArea}>
        {currentTab === "queue" && (
          <QueueScreen
            appMode={appMode}
            onOpenCallModal={(lead: Lead) => {
              setModalLead(lead);
              setModalDuration(0);
              setIsModalVisible(true);
            }}
          />
        )}
        {currentTab === "dialer" && <DialerScreen appMode={appMode} />}
        {currentTab === "dashboard" && <DashboardScreen />}
        {currentTab === "settings" && <SettingsScreen />}
      </View>

      {/* Global In-Call Overlay */}
      <ActiveCallOverlay
        appMode={appMode}
        onCallEnded={handleCallEnded}
        onCallStarted={() => {
          isCallingRef.current = true;
        }}
      />

      {/* Post-Call Modal with Candidate Details & Outcome Disposition */}
      <CallModal
        visible={isModalVisible}
        lead={modalLead}
        durationSeconds={modalDuration}
        startMs={modalStartMs}
        endMs={modalEndMs}
        appMode={appMode}
        recordingPath={modalRecordingPath}
        onClose={() => setIsModalVisible(false)}
        onSaveSuccess={() => {
          setIsModalVisible(false);
          setCompletedCallsCount((c) => c + 1);
          StorageService.incrementAttendanceCallsCount(activeStaff).then((att) => {
            if (att) ApiService.syncAttendanceRecord(att).catch(() => {});
          }).catch(() => {});
        }}
      />

      {/* Staff Selection & Punch In Gate Modal */}
      <StaffSelectModal
        visible={isStaffSelectVisible}
        currentStaff={activeStaff}
        canCancel={isPunchedIn}
        onCancel={() => setIsStaffSelectVisible(false)}
        onSelectAndPunchIn={handleSelectAndPunchIn}
      />

      {/* Punch Out Report & Instant Exit Modal */}
      <PunchOutReportModal
        visible={isPunchOutModalVisible}
        attendance={attendanceRecord}
        staffName={activeStaff}
        todayCalls={todayCallsForReport}
        onClose={() => setIsPunchOutModalVisible(false)}
      />

      {/* In-App Auto Update Modal (Play Store style one-click installer) */}
      {updateInfo?.hasUpdate && (
        <AppUpdateModal
          visible={isUpdateModalVisible}
          latestVersion={updateInfo.latestVersion || "1.0.2"}
          currentVersion={updateInfo.currentVersion || "1.0.0"}
          releaseNotes={updateInfo.releaseNotes || []}
          apkUrl={updateInfo.apkUrl || ""}
          forceUpdate={updateInfo.forceUpdate}
          onDismiss={() => setIsUpdateModalVisible(false)}
        />
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, currentTab === "queue" && styles.navItemActive]}
          onPress={() => setCurrentTab("queue")}
        >
          <ListFilter size={20} color={currentTab === "queue" ? THEME.colors.primary : "#94A3B8"} />
          <Text style={[styles.navText, currentTab === "queue" && styles.navTextActive]}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentTab === "dialer" && styles.navItemActive]}
          onPress={() => setCurrentTab("dialer")}
        >
          <PhoneCall size={20} color={currentTab === "dialer" ? THEME.colors.primary : "#94A3B8"} />
          <Text style={[styles.navText, currentTab === "dialer" && styles.navTextActive]}>Dialer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentTab === "dashboard" && styles.navItemActive]}
          onPress={() => setCurrentTab("dashboard")}
        >
          <BarChart3 size={20} color={currentTab === "dashboard" ? THEME.colors.primary : "#94A3B8"} />
          <Text style={[styles.navText, currentTab === "dashboard" && styles.navTextActive]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentTab === "settings" && styles.navItemActive]}
          onPress={() => setCurrentTab("settings")}
        >
          <Settings size={20} color={currentTab === "settings" ? THEME.colors.primary : "#94A3B8"} />
          <Text style={[styles.navText, currentTab === "settings" && styles.navTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight || 28) + 4 : 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  jobzTopLogo: {
    width: 145,
    height: 38,
  },
  modeSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
  },
  modeBtnActiveAdmission: {
    backgroundColor: "#1E3A8A",
  },
  modeBtnActiveJobz: {
    backgroundColor: "#0D9488",
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  modeBtnTextActive: {
    color: "#FFFFFF",
  },
  updateBadgeBtn: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  updateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  switchStaffBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  switchStaffText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  screenArea: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    height: 58,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: THEME.colors.primary,
  },
  navText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  navTextActive: {
    color: THEME.colors.primary,
    fontWeight: "700",
  },
});
