import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import {
  Phone,
  Delete,
  X,
  GraduationCap,
  Briefcase,
  Clock,
  FileText,
  MessageCircle,
  UserCheck,
  RotateCcw,
} from "lucide-react-native";
import { THEME } from "../constants/theme";
import { TelephonyService } from "../services/telephony";
import { StorageService } from "../services/storage";
import { ApiService } from "../services/api";
import { Lead, AppMode } from "../types";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

interface DialerScreenProps {
  appMode?: AppMode;
}

export const DialerScreen: React.FC<DialerScreenProps> = ({ appMode = "jobz" }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentStaff, setCurrentStaff] = useState<string>("MuthuSelvi");
  const [recognizedLead, setRecognizedLead] = useState<Lead | null>(null);

  useEffect(() => {
    StorageService.getSettings().then((s) => {
      if (s.callerName) setCurrentStaff(s.callerName);
    });
  }, []);

  // Instant Cross-Database Caller ID lookup as the telecaller types the number
  useEffect(() => {
    const clean = TelephonyService.formatIndianPhoneNumber(phoneNumber);
    const last10 = clean.slice(-10);

    if (last10.length < 7) {
      setRecognizedLead(null);
      return;
    }

    let isMounted = true;
    (async () => {
      // 1. Check unified storage (searches Jobz leads, Admission leads, and past call logs)
      const localMatch = await StorageService.lookupLeadUnified(phoneNumber);
      if (localMatch && isMounted) {
        setRecognizedLead(localMatch);
        return;
      }

      // 2. If 10 digits and not found in local cache, check Supabase Cloud
      if (last10.length === 10) {
        const cloudMatch = await ApiService.lookupLeadFromCloudUnified(phoneNumber);
        if (cloudMatch && isMounted) {
          setRecognizedLead(cloudMatch);
          return;
        }
      }

      if (isMounted) setRecognizedLead(null);
    })();

    return () => {
      isMounted = false;
    };
  }, [phoneNumber]);

  const handleKeyPress = (key: string) => {
    if (phoneNumber.length < 15) {
      setPhoneNumber((prev) => prev + key);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber("");
    setRecognizedLead(null);
  };

  const handleCall = async () => {
    if (!phoneNumber) {
      Alert.alert("Empty Number", "Please enter a phone number to dial.");
      return;
    }

    // STRICT SAFETY GUARD
    if (TelephonyService.isBlockedNumber(phoneNumber)) {
      Alert.alert(
        "Call Blocked",
        "Calling 9952337331 is strictly and permanently blocked."
      );
      return;
    }

    const clean = TelephonyService.formatIndianPhoneNumber(phoneNumber);
    if (clean.length < 7) {
      Alert.alert("Invalid Number", "Phone number must have at least 7 to 10 digits.");
      return;
    }

    await TelephonyService.dialViaSIM(clean, recognizedLead?.studentName, appMode);
  };

  const isJobz =
    recognizedLead?.appMode === "jobz" ||
    Boolean(recognizedLead?.preferredDomain) ||
    Boolean(recognizedLead?.experienceYears);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Direct SIM Dialer</Text>
        <Text style={styles.headerSubtitle}>Caller Identification & Instant Profile Match</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* LCD Number Screen */}
        <View style={styles.screenContainer}>
          <Text style={styles.screenText}>
            {phoneNumber || "Enter Phone Number"}
          </Text>
          {phoneNumber.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBadge}>
              <X size={12} color="#64748B" strokeWidth={2.5} style={{ marginRight: 3 }} />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Feature: Full Profile & Previous Caller Saved Details Card */}
        {recognizedLead && (
          <View style={styles.callerProfileCard}>
            {/* Top Row: Name + DB Pill + Repeat Badge */}
            <View style={styles.profileHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Text style={styles.callerNameText} numberOfLines={1}>
                    {recognizedLead.studentName}
                  </Text>
                  {(recognizedLead.callCount || 0) > 1 && (
                    <View style={styles.repeatBadge}>
                      <RotateCcw size={10} color="#D97706" />
                      <Text style={styles.repeatBadgeText}>
                        {recognizedLead.callCount} Calls
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.callerPhoneText}>{recognizedLead.phone}</Text>
              </View>

              <View style={[styles.modePill, isJobz ? styles.pillJobz : styles.pillAdmission]}>
                {isJobz ? (
                  <Briefcase size={11} color="#0D9488" style={{ marginRight: 4 }} />
                ) : (
                  <GraduationCap size={11} color="#1E40AF" style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.modePillText, isJobz ? styles.textJobz : styles.textAdmission]}>
                  {isJobz ? "Jobz Candidate" : "Admission"}
                </Text>
              </View>
            </View>

            {/* Candidate / Student Core Details */}
            <View style={styles.detailsRow}>
              {isJobz ? (
                <>
                  <Text style={styles.detailPill}>
                    🎯 {recognizedLead.preferredDomain || recognizedLead.courseInterested || "General"}
                  </Text>
                  {recognizedLead.experienceYears ? (
                    <Text style={styles.detailPill}>💼 {recognizedLead.experienceYears}</Text>
                  ) : null}
                  {recognizedLead.expectedSalary ? (
                    <Text style={styles.detailPill}>💰 {recognizedLead.expectedSalary}</Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.detailPill}>
                    🎓 {recognizedLead.courseInterested || "Course Inquiry"}
                  </Text>
                  {recognizedLead.qualification ? (
                    <Text style={styles.detailPill}>📜 {recognizedLead.qualification}</Text>
                  ) : null}
                  {recognizedLead.collegeName ? (
                    <Text style={styles.detailPill}>🏛️ {recognizedLead.collegeName}</Text>
                  ) : null}
                </>
              )}
            </View>

            {/* Previous Call Saved Details (Outcome & Remarks from previous calls) */}
            {(recognizedLead.lastCallOutcome || recognizedLead.lastCallNotes || recognizedLead.lastCallDate) && (
              <View style={styles.previousCallBox}>
                <View style={styles.previousCallHeader}>
                  <Clock size={11} color="#64748B" />
                  <Text style={styles.previousCallTitle}>
                    PREVIOUS CALL • {recognizedLead.lastCallDate || "Past Call"}
                  </Text>
                  {recognizedLead.lastCallOutcome ? (
                    <View style={styles.outcomeBadge}>
                      <Text style={styles.outcomeBadgeText}>{recognizedLead.lastCallOutcome}</Text>
                    </View>
                  ) : null}
                </View>

                {recognizedLead.lastCallNotes ? (
                  <View style={styles.notesRow}>
                    <FileText size={11} color="#475569" style={{ marginTop: 2, marginRight: 4 }} />
                    <Text style={styles.previousNotesText} numberOfLines={2}>
                      "{recognizedLead.lastCallNotes}"
                    </Text>
                  </View>
                ) : null}

                {recognizedLead.nextFollowUpDate ? (
                  <Text style={styles.followUpText}>
                    📅 Follow-up: {recognizedLead.nextFollowUpDate} {recognizedLead.nextFollowUpTime || ""}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Quick Actions Bar */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.whatsAppActionBtn}
                onPress={() => {
                  TelephonyService.openWhatsAppChat(
                    recognizedLead.phone,
                    recognizedLead.studentName,
                    recognizedLead.preferredDomain || recognizedLead.courseInterested
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.whatsAppActionText}>💬 WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.callNowActionBtn}
                onPress={handleCall}
                activeOpacity={0.8}
              >
                <Phone size={13} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 5 }} />
                <Text style={styles.callNowActionText}>Call {recognizedLead.studentName}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Dialpad Matrix */}
        <View style={styles.keypadContainer}>
          {KEYS.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((k) => (
                <TouchableOpacity
                  key={k}
                  style={styles.key}
                  onPress={() => handleKeyPress(k)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Bottom Control Row: Clear / Backspace / Call */}
          <View style={styles.bottomControlRow}>
            <TouchableOpacity
              style={styles.backspaceButton}
              onPress={handleBackspace}
              onLongPress={() => setPhoneNumber("")}
              delayLongPress={350}
              activeOpacity={0.7}
            >
              <Delete size={22} color="#475569" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dialButton}
              onPress={handleCall}
              activeOpacity={0.8}
            >
              <Phone size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text style={styles.dialButtonText}>Call SIM</Text>
            </TouchableOpacity>

            <View style={{ width: 54 }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
    justifyContent: "space-between",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
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
  liveClockBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  liveClockText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  screenContainer: {
    backgroundColor: THEME.colors.card,
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  recognizedLeadCard: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 2,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  recognizedTitle: {
    color: "#1E3A8A",
    fontSize: 13,
    fontWeight: "bold",
  },
  recognizedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  recognizedTagText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "bold",
  },
  recognizedSubtitle: {
    color: "#475569",
    fontSize: 11,
    marginTop: 1,
  },
  screenText: {
    color: THEME.colors.textPrimary,
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  clearBadge: {
    position: "absolute",
    right: 12,
    top: 10,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },
  clearText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  keypadContainer: {
    marginTop: 4,
    paddingHorizontal: 28,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  key: {
    width: 64,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  keyText: {
    color: THEME.colors.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
  },
  bottomControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  backspaceButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dialButton: {
    backgroundColor: THEME.colors.emerald,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: THEME.colors.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  dialButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  inAppCallOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 17, 40, 0.98)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 30,
    zIndex: 999,
  },
  inAppCallCard: {
    gap: 8,
  },
  inAppCallHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inAppCallLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#10B981",
    gap: 6,
  },
  inAppCallRingingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "#F59E0B",
  },
  inAppCallLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  inAppCallRingingDot: {
    backgroundColor: "#F59E0B",
  },
  inAppCallLiveText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  inAppCallRingingText: {
    color: "#F59E0B",
  },
  inAppCallTimer: {
    color: THEME.colors.gold,
    fontSize: 17,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "bold",
  },
  inAppCallTimerRinging: {
    color: "#F59E0B",
  },
  inAppCallName: {
    color: THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  inAppCallPhone: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  inAppCallCourse: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  inAppCallHint: {
    color: THEME.colors.gold,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
  },
  inAppCallActions: {
    marginTop: 10,
  },
  inAppHangupBtn: {
    backgroundColor: THEME.colors.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  inAppHangupText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  /* Feature: Recognized Caller Profile & Previous Saved Call Details */
  callerProfileCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  callerNameText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  callerPhoneText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  repeatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  repeatBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillJobz: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  pillAdmission: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  modePillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textJobz: {
    color: "#0F766E",
  },
  textAdmission: {
    color: "#1E40AF",
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  detailPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  previousCallBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  previousCallHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  previousCallTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 4,
    flex: 1,
  },
  outcomeBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  outcomeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  previousNotesText: {
    fontSize: 11,
    color: "#334155",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 15,
  },
  followUpText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  whatsAppActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingVertical: 8,
    borderRadius: 8,
  },
  whatsAppActionText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "800",
  },
  callNowActionBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    borderRadius: 8,
  },
  callNowActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
