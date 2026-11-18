import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { THEME } from "../constants/theme";
import { CallDisposition, CallRecord, Lead, WEGROW_STAFF_MEMBERS, StaffMember, AppMode } from "../types";
import { ApiService } from "../services/api";
import { StorageService } from "../services/storage";
import { DEGREES_LIST, TN_COLLEGES_LIST } from "../data/academicData";
import { WEGROW_INSTITUTE_COURSES, WegrowCourseItem } from "../data/instituteCourses";
import { JOB_DOMAINS, EXPERIENCE_LEVELS, SALARY_RANGES } from "../data/jobData";
import { LiveClock } from "../components/LiveClock";
import { TelephonyService } from "../services/telephony";
import {
  User,
  UserCheck,
  Sparkles,
  GraduationCap,
  Building2,
  XCircle,
  Clock,
  PhoneMissed,
  Check,
  Calendar,
  Phone,
  Briefcase,
  DollarSign,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react-native";

interface CallModalProps {
  visible: boolean;
  lead: Lead | null;
  durationSeconds: number;
  appMode?: AppMode;
  onClose: () => void;
  onSaveSuccess: () => void;
}

// Dispositions for Jobz CRM vs Admission CRM
const JOBZ_DISPOSITIONS: CallDisposition[] = [
  "Interested",
  "Interview Scheduled",
  "Shortlisted",
  "Placed",
  "Call Later",
  "Busy",
  "Not Answered",
  "Not Interested",
  "Lost",
];

const ADMISSION_DISPOSITIONS: CallDisposition[] = [
  "Interested",
  "Visit to Institute",
  "Joined",
  "Not Interested",
  "Call Later",
  "Busy",
  "Not Answered",
  "Counselling Scheduled",
  "Lost",
];

export const CallModal: React.FC<CallModalProps> = ({
  visible,
  lead,
  durationSeconds,
  appMode = "jobz",
  onClose,
  onSaveSuccess,
}) => {
  const isJobz = appMode === "jobz";

  const [callerName, setCallerName] = useState<StaffMember>("MuthuSelvi");
  const [disposition, setDisposition] = useState<CallDisposition>("Interested");
  const [courseInterested, setCourseInterested] = useState("");
  const [preferredDomain, setPreferredDomain] = useState("");
  const [experienceYears, setExperienceYears] = useState("Fresher (0 - 6 Months)");
  const [expectedSalary, setExpectedSalary] = useState("₹18,000 - ₹25,000 / month");
  const [qualification, setQualification] = useState("");
  const [passedOutYear, setPassedOutYear] = useState("2024");
  const [collegeName, setCollegeName] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [nextFollowUpTime, setNextFollowUpTime] = useState("10:30 AM");
  const [submitting, setSubmitting] = useState(false);

  // Search states for dropdown pickers
  const [courseQuery, setCourseQuery] = useState("");
  const [degreeQuery, setDegreeQuery] = useState("");
  const [collegeQuery, setCollegeQuery] = useState("");

  useEffect(() => {
    (async () => {
      const s = await StorageService.getSettings();
      if (s.callerName && (WEGROW_STAFF_MEMBERS as readonly string[]).includes(s.callerName)) {
        setCallerName(s.callerName as StaffMember);
      }
    })();
  }, [visible]);

  useEffect(() => {
    if (lead) {
      setCourseInterested(lead.courseInterested || "");
      setPreferredDomain(lead.preferredDomain || (isJobz ? "IT & Software Development" : ""));
      setExperienceYears(lead.experienceYears || "Fresher (0 - 6 Months)");
      setExpectedSalary(lead.expectedSalary || "₹18,000 - ₹25,000 / month");
      setQualification(lead.qualification || "");
      setPassedOutYear(lead.passedOutYear || "2024");
      setCollegeName(lead.collegeName || "");
      setNextFollowUpDate(lead.nextFollowUpDate || "");
      setNextFollowUpTime(lead.nextFollowUpTime || "10:30 AM");
      setNotes("");

      if (durationSeconds > 0) {
        setDisposition(isJobz ? "Interested" : "Interested");
      } else {
        setDisposition("Not Answered");
      }
    }
  }, [lead, visible, durationSeconds, isJobz]);

  const activeDispositions = isJobz ? JOBZ_DISPOSITIONS : ADMISSION_DISPOSITIONS;

  // Repeat caller check:
  const isFirstTimeCaller = !lead?.callCount || lead.callCount === 0;

  const handleSave = async () => {
    if (!lead) return;

    setSubmitting(true);
    const now = new Date();
    const startTimeStr = new Date(now.getTime() - durationSeconds * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const endTimeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const formattedDuration = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    const record: CallRecord = {
      id: `call-${Date.now()}`,
      leadId: lead.id,
      studentName: lead.studentName,
      phone: lead.phone,
      callerName,
      disposition,
      outcome: durationSeconds > 0 ? "Attended Call" : "Not Attended Call",
      mindset: disposition,
      durationSeconds,
      formattedDuration,
      courseInterested: isJobz ? preferredDomain : courseInterested,
      preferredDomain: isJobz ? preferredDomain : undefined,
      experienceYears: isJobz ? experienceYears : undefined,
      expectedSalary: isJobz ? expectedSalary : undefined,
      qualification,
      passedOutYear,
      collegeName,
      callStartTime: startTimeStr,
      callEndTime: endTimeStr,
      notes,
      nextFollowUpDate: ["Call Later", "Interested", "Interview Scheduled", "Counselling Scheduled"].includes(disposition)
        ? nextFollowUpDate
        : undefined,
      nextFollowUpTime: ["Call Later", "Interested", "Interview Scheduled", "Counselling Scheduled"].includes(disposition)
        ? nextFollowUpTime
        : undefined,
      timestamp: Date.now(),
      syncedToCrm: false,
      appMode,
    };

    try {
      await ApiService.logCallOutcome(record);
      Alert.alert("Success", "Call outcome & candidate profile saved!");
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert("Notice", "Saved locally in phone. Will auto-sync.");
      onSaveSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!lead) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>{lead.studentName}</Text>
                {/* Feature 3: Repeat Caller / First Time Badge */}
                <View
                  style={[
                    styles.badge,
                    isFirstTimeCaller ? styles.badgeNew : styles.badgeRepeat,
                  ]}
                >
                  <Text style={[styles.badgeText, isFirstTimeCaller ? styles.textNew : styles.textRepeat]}>
                    {isFirstTimeCaller ? "★ 1st Time Caller" : `⟲ Repeat (${lead.callCount || 1} calls)`}
                  </Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                📞 {lead.phone} • {durationSeconds}s duration • {isJobz ? "Jobz Mode" : "Admission Mode"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <XCircle size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Quick 1-Click WhatsApp Follow-up button */}
            <TouchableOpacity
              style={styles.waBtn}
              onPress={() => TelephonyService.openWhatsAppChat(lead.phone, lead.studentName, isJobz ? preferredDomain : courseInterested)}
            >
              <MessageSquare size={16} color="#FFFFFF" />
              <Text style={styles.waBtnText}>Send WhatsApp Follow-up Message</Text>
            </TouchableOpacity>

            {/* Disposition Selector */}
            <Text style={styles.sectionLabel}>Call Disposition / Status</Text>
            <View style={styles.chipsContainer}>
              {activeDispositions.map((disp) => {
                const active = disposition === disp;
                return (
                  <TouchableOpacity
                    key={disp}
                    onPress={() => setDisposition(disp)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{disp}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Feature 4 & 5: Candidate Screening / Job Profile Fields (Jobz Mode) */}
            {isJobz ? (
              <View style={styles.jobzSection}>
                <View style={styles.sectionHeaderBox}>
                  <Briefcase size={16} color={THEME.colors.primary} />
                  <Text style={styles.sectionLabel}>Job Field / Domain Needed</Text>
                </View>
                <View style={styles.chipsContainer}>
                  {JOB_DOMAINS.slice(0, 6).map((domain) => {
                    const active = preferredDomain === domain;
                    return (
                      <TouchableOpacity
                        key={domain}
                        onPress={() => setPreferredDomain(domain)}
                        style={[styles.chipSm, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipTextSm, active && styles.chipTextActive]}>{domain}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.sectionHeaderBox}>
                  <Clock size={16} color={THEME.colors.primary} />
                  <Text style={styles.sectionLabel}>Prior Work Experience</Text>
                </View>
                <View style={styles.chipsContainer}>
                  {EXPERIENCE_LEVELS.map((exp) => {
                    const active = experienceYears === exp;
                    return (
                      <TouchableOpacity
                        key={exp}
                        onPress={() => setExperienceYears(exp)}
                        style={[styles.chipSm, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipTextSm, active && styles.chipTextActive]}>{exp}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* Admission Course Field */
              <View>
                <Text style={styles.sectionLabel}>Course Interested</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Full Stack Web Development"
                  value={courseInterested}
                  onChangeText={setCourseInterested}
                />
              </View>
            )}

            {/* Education & College Fields */}
            <View style={styles.eduSection}>
              <View style={styles.sectionHeaderBox}>
                <GraduationCap size={16} color={THEME.colors.primary} />
                <Text style={styles.sectionLabel}>College & Qualification</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Degree (e.g. B.E CSE, B.Com, MCA)"
                value={qualification}
                onChangeText={setQualification}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Passed Out Year (e.g. 2024)"
                  value={passedOutYear}
                  onChangeText={setPassedOutYear}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  placeholder="College Name"
                  value={collegeName}
                  onChangeText={setCollegeName}
                />
              </View>
            </View>

            {/* Next Callback Date / Follow-up */}
            {["Call Later", "Interested", "Interview Scheduled", "Counselling Scheduled"].includes(disposition) && (
              <View style={styles.fuBox}>
                <Text style={styles.sectionLabel}>Schedule Next Follow-up</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    placeholder="YYYY-MM-DD (e.g. 2026-11-19)"
                    value={nextFollowUpDate}
                    onChangeText={setNextFollowUpDate}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Time (e.g. 11:00 AM)"
                    value={nextFollowUpTime}
                    onChangeText={setNextFollowUpTime}
                  />
                </View>
              </View>
            )}

            {/* Telecaller Notes / Feedback */}
            <Text style={styles.sectionLabel}>Discussion Remarks / Feedback</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Candidate feedback, communication skill, expectations..."
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Candidate Outcome</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeNew: {
    backgroundColor: "#DCFCE7",
  },
  badgeRepeat: {
    backgroundColor: "#FEF3C7",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textNew: {
    color: "#15803D",
  },
  textRepeat: {
    color: "#B45309",
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    borderRadius: 8,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 14,
  },
  waBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipSm: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  chipTextSm: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  jobzSection: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  eduSection: {
    backgroundColor: "#FAFAFA",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fuBox: {
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
