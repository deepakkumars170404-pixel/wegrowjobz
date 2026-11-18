import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import { Globe, User, ShieldAlert, Smartphone, RefreshCw, Zap, Check, CheckCircle2, Info, DownloadCloud } from "lucide-react-native";
import { THEME } from "../constants/theme";
import { StorageService } from "../services/storage";
import { ApiService } from "../services/api";
import { TelephonyService } from "../services/telephony";
import { AppSettings, WEGROW_STAFF_MEMBERS } from "../types";
import { AppUpdateModal } from "../components/AppUpdateModal";

export const SettingsScreen: React.FC = () => {
  const isExpoGo = Constants.appOwnership === "expo";
  const [admissionUrl, setAdmissionUrl] = useState("https://wegrowcrm.vercel.app");
  const [jobzUrl, setJobzUrl] = useState("http://192.168.1.41:3001");
  const [callerName, setCallerName] = useState("MuthuSelvi");
  const [localRecording, setLocalRecording] = useState(true);
  const [testingAdmission, setTestingAdmission] = useState(false);
  const [testingJobz, setTestingJobz] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isDefaultDialer, setIsDefaultDialer] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState("1.0.0");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateModalData, setUpdateModalData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const s = await StorageService.getSettings();
      if (s.admissionServerUrl) setAdmissionUrl(s.admissionServerUrl);
      if (s.jobzServerUrl) {
        // If it was still pointing to old 192.168.29.60, auto-update to active 192.168.1.41
        if (s.jobzServerUrl.includes("192.168.29.60")) {
          setJobzUrl("http://192.168.1.41:3001");
          await StorageService.saveSettings({ jobzServerUrl: "http://192.168.1.41:3001" });
        } else {
          setJobzUrl(s.jobzServerUrl);
        }
      }
      if (s.callerName) setCallerName(s.callerName);
      if (s.localRecordingEnabled !== undefined) setLocalRecording(s.localRecordingEnabled);
      const pending = await StorageService.getPendingCalls();
      setPendingCount(pending.length);
      const isDef = await TelephonyService.checkIsDefaultDialer();
      setIsDefaultDialer(isDef);

      const vInfo = await TelephonyService.getAppVersionInfo();
      if (vInfo?.versionName) setCurrentAppVersion(vInfo.versionName);
    })();
  }, []);

  const handleCheckUpdateManual = async () => {
    try {
      setCheckingUpdate(true);
      const res = await ApiService.checkAppUpdate();
      setCheckingUpdate(false);
      if (res && res.hasUpdate) {
        setUpdateModalData(res);
      } else {
        Alert.alert(
          "App Up-to-Date! ✅",
          `You are already using the latest version (v${currentAppVersion}). No update required!`
        );
      }
    } catch (err: any) {
      setCheckingUpdate(false);
      Alert.alert("Check Failed", "Unable to reach update server. Check Wi-Fi or server connection.");
    }
  };

  const handleSetDefaultDialer = async () => {
    if (isExpoGo) {
      Alert.alert(
        "Expo Go Notice",
        "Setting as 'Default Phone App' is an Android OS system-level feature that only works in the installed standalone APK. In Expo Go, normal calling works via your phone dialer."
      );
      return;
    }

    const isAlready = await TelephonyService.checkIsDefaultDialer();
    if (isAlready) {
      Alert.alert(
        "Already Default",
        "Wegrow Telecaller is already your phone's default phone app! All calls stay inside Wegrow Telecaller."
      );
      setIsDefaultDialer(true);
      return;
    }
    await TelephonyService.promptSetAsDefaultDialer();
    setTimeout(async () => {
      const check = await TelephonyService.checkIsDefaultDialer();
      setIsDefaultDialer(check);
    }, 1500);
  };

  const handleSave = async () => {
    const mode = await StorageService.getAppMode();
    const activeUrl = mode === "admission" ? admissionUrl.trim() : jobzUrl.trim();
    const updated: AppSettings = {
      crmServerUrl: activeUrl,
      admissionServerUrl: admissionUrl.trim(),
      jobzServerUrl: jobzUrl.trim(),
      callerName: callerName.trim(),
      autoPopupDisposition: true,
      strictSafetyBlock: true,
      vibrateOnCall: true,
      activeAppMode: mode,
      localRecordingEnabled: localRecording,
    };
    await StorageService.saveSettings(updated);
    Alert.alert("Saved ✓", "Settings updated successfully!");
  };

  const handleTestAdmission = async () => {
    setTestingAdmission(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      let url = admissionUrl.trim();
      if (url.endsWith("/")) url = url.slice(0, -1);
      const res = await fetch(`${url}/api/leads`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        Alert.alert("Admission CRM Connected! ✓", `Successfully reached ${url}`);
      } else {
        Alert.alert("Server Reachable", `Server responded with HTTP ${res.status}`);
      }
    } catch (err: any) {
      clearTimeout(timer);
      Alert.alert(
        "Connection Notice",
        `Could not reach ${admissionUrl}.\n\nCheck your phone internet connection.\n\nError: ${err.message}`
      );
    } finally {
      setTestingAdmission(false);
    }
  };

  const handleTestJobz = async () => {
    setTestingJobz(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      let url = jobzUrl.trim();
      if (url.endsWith("/")) url = url.slice(0, -1);
      const res = await fetch(`${url}/api/leads`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        Alert.alert("Jobz CRM Connected! ✓", `Successfully reached ${url}\nReady for live candidates sync!`);
      } else {
        Alert.alert("Server Reachable", `Server responded with HTTP ${res.status}`);
      }
    } catch (err: any) {
      clearTimeout(timer);
      Alert.alert(
        "Connection Notice",
        `Could not reach ${jobzUrl}.\n\nEnsure Phone and PC are on the same Wi-Fi.\nActive PC IP is: 192.168.1.41\n\nError: ${err.message}`
      );
    } finally {
      setTestingJobz(false);
    }
  };

  const handleSyncPending = async () => {
    const res = await ApiService.syncPendingCalls();
    const pending = await StorageService.getPendingCalls();
    setPendingCount(pending.length);
    Alert.alert("Sync Result", `Synced ${res.syncedCount} records. Remaining pending: ${pending.length}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>App Settings</Text>
        <Text style={styles.headerSubtitle}>Wegrow CRM Connection & Caller Profile</Text>
      </View>

      {/* Dual Server URLs: Admission vs Jobz */}
      <View style={styles.card}>
        <Text style={styles.label}>ADMISSION CRM SERVER URL</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. https://wegrowcrm.vercel.app"
          placeholderTextColor={THEME.colors.textMuted}
          value={admissionUrl}
          onChangeText={setAdmissionUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.helpText}>
          Auto-used when in 🎓 Admission mode.
        </Text>

        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestAdmission}
          disabled={testingAdmission}
        >
          {testingAdmission ? (
            <ActivityIndicator color="#1D4ED8" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Zap size={15} color="#1D4ED8" />
              <Text style={styles.testBtnText}>Test Admission CRM</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.label}>JOBZ CRM SERVER URL</Text>
          <TouchableOpacity
            onPress={() => setJobzUrl("http://192.168.1.41:3001")}
            style={{ backgroundColor: "#F0FDFA", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "#99F6E4" }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#0D9488" }}>⚡ Auto-Fill 192.168.1.41</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          placeholder="e.g. http://192.168.1.41:3001"
          placeholderTextColor={THEME.colors.textMuted}
          value={jobzUrl}
          onChangeText={setJobzUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.helpText}>
          Auto-used when in 💼 Jobz CRM mode (PC Port 3001).
        </Text>

        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestJobz}
          disabled={testingJobz}
        >
          {testingJobz ? (
            <ActivityIndicator color="#0D9488" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Zap size={15} color="#0D9488" />
              <Text style={[styles.testBtnText, { color: "#0D9488" }]}>Test Jobz CRM</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Telecaller Identity */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <User size={15} color="#2563EB" />
          <Text style={styles.label}>TELECALLER NAME (SELECT OR TYPE)</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {WEGROW_STAFF_MEMBERS.map((staff) => {
            const isSel = callerName === staff;
            return (
              <TouchableOpacity
                key={staff}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: isSel ? "#2563EB" : "#F1F5F9",
                  borderWidth: 1.5,
                  borderColor: isSel ? "#1D4ED8" : "#CBD5E1",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  shadowColor: isSel ? "#2563EB" : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isSel ? 0.25 : 0,
                  shadowRadius: 4,
                  elevation: isSel ? 3 : 0,
                }}
                onPress={() => setCallerName(staff)}
                activeOpacity={0.7}
              >
                {isSel && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isSel ? "800" : "700",
                    color: isSel ? "#FFFFFF" : "#0F172A",
                  }}
                >
                  {staff === "Muthumeena" ? "Muthumeena" : staff}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={styles.input}
          placeholder="e.g. Muthumeena"
          placeholderTextColor={THEME.colors.textMuted}
          value={callerName}
          onChangeText={setCallerName}
        />
        <Text style={styles.helpText}>
          This staff name will be automatically tagged on all call logs and follow-up activities in Supabase CRM.
        </Text>
      </View>

      {/* Safety Guard Status */}
      <View style={styles.card}>
        <View style={styles.guardHeader}>
          <Text style={styles.label}>STRICT SAFETY GUARD</Text>
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>LOCKED ON</Text>
          </View>
        </View>
        <Text style={styles.guardDesc}>
          • Number <Text style={styles.boldRed}>9952337331</Text> is strictly and permanently blocked from being dialed or messaged on this device.
        </Text>
      </View>

      {/* Default Dialer Section */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={styles.label}>DEFAULT PHONE APP</Text>
          {isExpoGo ? (
            <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: "#FCD34D" }}>
              <Text style={{ color: "#B45309", fontSize: 10, fontWeight: "bold" }}>EXPO GO MODE</Text>
            </View>
          ) : isDefaultDialer ? (
            <View style={{ backgroundColor: "rgba(16, 185, 129, 0.2)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: "#10B981" }}>
              <Text style={{ color: "#10B981", fontSize: 10, fontWeight: "bold" }}>ACTIVE DEFAULT</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.helpText}>
          {isExpoGo
            ? "📱 You are currently running in Expo Go. Real phone calls will open your standard SIM dialer. The 'Default Phone App' lock feature is enabled in the standalone APK build."
            : isDefaultDialer
            ? "✅ Wegrow Telecaller is currently the Default Phone App on this device! Calls will stay strictly inside Wegrow Telecaller."
            : "Set Wegrow Telecaller as your phone's default Phone App so all SIM calls stay inside Wegrow Telecaller."}
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: isExpoGo ? "#94A3B8" : isDefaultDialer ? THEME.colors.emerald : THEME.colors.gold, marginTop: 12 }]}
          onPress={handleSetDefaultDialer}
        >
          <Text style={styles.saveBtnText}>
            {isExpoGo ? "📱 Standard SIM Dialer Active (Expo Go)" : isDefaultDialer ? "✅ Default Phone App Active" : "📱 Set as Default Phone App"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Offline Sync Status */}
      <View style={styles.card}>
        <Text style={styles.label}>OFFLINE QUEUE & SYNC</Text>
        <View style={styles.syncRow}>
          <Text style={styles.syncCountText}>
            {pendingCount} offline calls waiting to sync
          </Text>
          <TouchableOpacity
            style={[styles.syncNowBtn, pendingCount === 0 && styles.syncNowDisabled]}
            onPress={handleSyncPending}
            disabled={pendingCount === 0}
          >
            <Text style={styles.syncNowText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Local Call Recording Settings */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#1E293B" }}>Local Call Recording</Text>
            <Text style={{ fontSize: 11, color: "#64748B" }}>Store audio recordings on phone internal storage</Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: localRecording ? "#16A34A" : "#CBD5E1",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
            onPress={() => setLocalRecording(!localRecording)}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 11 }}>
              {localRecording ? "ENABLED" : "DISABLED"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Version & In-App Auto Update */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <DownloadCloud size={16} color="#2563EB" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1E293B" }}>App Version & Updates</Text>
            </View>
            <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
              Installed: v{currentAppVersion} • In-App One-Click Updater
            </Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: checkingUpdate ? "#94A3B8" : "#2563EB",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
            onPress={handleCheckUpdateManual}
            disabled={checkingUpdate}
            activeOpacity={0.8}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 11 }}>Check Update</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </View>
      </TouchableOpacity>

      {/* In-App Update Modal */}
      {updateModalData?.hasUpdate && (
        <AppUpdateModal
          visible={!!updateModalData}
          latestVersion={updateModalData.latestVersion || "1.0.2"}
          currentVersion={currentAppVersion}
          releaseNotes={updateModalData.releaseNotes || []}
          apkUrl={updateModalData.apkUrl || ""}
          forceUpdate={updateModalData.forceUpdate}
          onDismiss={() => setUpdateModalData(null)}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    marginBottom: 16,
  },
  headerTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 22,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    color: THEME.colors.textPrimary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  helpText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  testBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  testBtnText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "bold",
  },
  guardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lockedBadge: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.emerald,
  },
  lockedText: {
    color: THEME.colors.emerald,
    fontSize: 10,
    fontWeight: "bold",
  },
  guardDesc: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  boldRed: {
    color: THEME.colors.danger,
    fontWeight: "bold",
  },
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  syncCountText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
  },
  syncNowBtn: {
    backgroundColor: THEME.colors.emerald,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncNowDisabled: {
    opacity: 0.4,
  },
  syncNowText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
