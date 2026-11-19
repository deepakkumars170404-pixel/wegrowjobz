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
import { ALL_INDIA_COLLEGES_LIST } from "../data/academicData";
import { WEGROW_INSTITUTE_COURSES } from "../data/instituteCourses";
import { ALL_JOB_ROLES, EXPERIENCE_LEVELS, SALARY_RANGES, NOTICE_PERIODS } from "../data/jobData";
import { TelephonyService } from "../services/telephony";
import { LiveClock } from "../components/LiveClock";
import {
  User,
  Sparkles,
  GraduationCap,
  Building2,
  XCircle,
  Clock,
  Briefcase,
  DollarSign,
  MessageSquare,
  Check,
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
  const [candidateName, setCandidateName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [disposition, setDisposition] = useState<CallDisposition>("Interested");
  const [durationSec, setDurationSec] = useState<number>(durationSeconds);
  const [courseInterested, setCourseInterested] = useState("");
  const [preferredDomain, setPreferredDomain] = useState("");
  const [experienceYears, setExperienceYears] = useState("Fresher (0 - 6 Months)");
  const [expectedSalary, setExpectedSalary] = useState("₹18,000 - ₹25,000 / month");
  const [noticePeriod, setNoticePeriod] = useState("Immediate (0 days)");
  const [qualification, setQualification] = useState("");
  const [passedOutYear, setPassedOutYear] = useState("2024");
  const [collegeName, setCollegeName] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [nextFollowUpTime, setNextFollowUpTime] = useState("10:30 AM");
  const [submitting, setSubmitting] = useState(false);

  // Search queries & suggestion visibility
  const [domainQuery, setDomainQuery] = useState("");
  const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);

  const [courseQuery, setCourseQuery] = useState("");
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);

  const [collegeQuery, setCollegeQuery] = useState("");
  const [showCollegeSuggestions, setShowCollegeSuggestions] = useState(false);

  const formatTimeSec = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

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
      setDurationSec(durationSeconds);
      setCandidateName(lead.studentName || "");
      setPhoneNumber(lead.phone || "");

      const endD = new Date();
      const startD = new Date(endD.getTime() - durationSeconds * 1000);
      setEndTimeStr(formatTimeSec(endD));
      setStartTimeStr(formatTimeSec(startD));

      setCourseInterested(lead.courseInterested || "");
      setPreferredDomain(lead.preferredDomain || (isJobz ? "IT & Software Development" : ""));
      setExperienceYears(lead.experienceYears || "Fresher (0 - 6 Months)");
      setExpectedSalary(lead.expectedSalary || "₹18,000 - ₹25,000 / month");
      setNoticePeriod((lead as any).noticePeriod || "Immediate (0 days)");
      setQualification(lead.qualification || "");
      setPassedOutYear(lead.passedOutYear || "2024");
      setCollegeName(lead.collegeName || "");
      setNextFollowUpDate(lead.nextFollowUpDate || "");
      setNextFollowUpTime(lead.nextFollowUpTime || "10:30 AM");
      setNotes("");

      if (durationSeconds > 0) {
        setDisposition("Interested");
      } else {
        setDisposition("Not Answered");
      }

      setDomainQuery("");
      setShowDomainSuggestions(false);
      setCourseQuery("");
      setShowCourseSuggestions(false);
      setCollegeQuery("");
      setShowCollegeSuggestions(false);
    }
  }, [lead, visible, durationSeconds, isJobz]);

  const handleAdjustDuration = (newSecs: number) => {
    const valid = Math.max(0, newSecs);
    setDurationSec(valid);
    const endD = new Date();
    const startD = new Date(endD.getTime() - valid * 1000);
    setStartTimeStr(formatTimeSec(startD));
  };

  const activeDispositions = isJobz ? JOBZ_DISPOSITIONS : ADMISSION_DISPOSITIONS;
  const isFirstTimeCaller = !lead?.callCount || lead.callCount === 0;

  // Filtered Job Roles
  const filteredDomains = useMemo(() => {
    if (!domainQuery.trim()) return ALL_JOB_ROLES.slice(0, 8);
    const q = domainQuery.toLowerCase();
    return ALL_JOB_ROLES.filter((r) => r.toLowerCase().includes(q)).slice(0, 10);
  }, [domainQuery]);

  // Filtered Courses (Admission)
  const filteredCourses = useMemo(() => {
    if (!courseQuery.trim()) return WEGROW_INSTITUTE_COURSES.slice(0, 8);
    const q = courseQuery.toLowerCase();
    return WEGROW_INSTITUTE_COURSES.filter((c) =>
      c.displayName.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [courseQuery]);

  // Filtered All-India Colleges
  const filteredColleges = useMemo(() => {
    if (!collegeQuery.trim()) return [];
    const q = collegeQuery.toLowerCase();
    return ALL_INDIA_COLLEGES_LIST.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [collegeQuery]);

  // Timing Calculations
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const formattedDuration = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  const handleSave = async () => {
    if (!lead) return;

    setSubmitting(true);
    const cleanDigits = (phoneNumber || lead.phone || "").replace(/\D/g, "");
    const finalPhone = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;

    const record: CallRecord = {
      id: `CR-${Date.now()}`,
      leadId: lead.id,
      studentName: candidateName.trim() || lead.studentName || "Candidate",
      phone: finalPhone,
      callerName,
      disposition,
      outcome: durationSec > 0 ? "Attended Call" : "Not Attended Call",
      mindset: disposition,
      durationSeconds: durationSec,
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
      const res = await ApiService.logCallOutcome(record);
      if (res && res.success) {
        Alert.alert("Success", "Call outcome & candidate profile saved and synced to Web CRM!");
      } else {
        Alert.alert("Saved", "Saved in phone. Auto-syncing to Web CRM.");
      }
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert("Saved", "Saved in phone. Auto-syncing to Web CRM.");
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
                📞 {lead.phone} • {isJobz ? "Jobz CRM Mode" : "Admission CRM Mode"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <XCircle size={26} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Accurate Talk Duration Card with Live Clock & Quick Presets */}
            <View style={styles.durationCard}>
              {/* Live Clock Header */}
              <View style={styles.liveClockHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={styles.liveGreenDot} />
                  <Text style={styles.liveClockLabel}>Real-time Live Clock:</Text>
                </View>
                <LiveClock style={styles.liveClockValue} />
              </View>

              {/* Talk Duration Header & Step Controls */}
              <View style={styles.durationTopRow}>
                <View style={styles.durationLeft}>
                  <Clock size={16} color="#2563EB" />
                  <Text style={styles.durationTitle}>Talk Time:</Text>
                </View>
                <View style={styles.durationControls}>
                  <TouchableOpacity
                    onPress={() => handleAdjustDuration(durationSec - 10)}
                    style={styles.durBtnSm}
                  >
                    <Text style={styles.durBtnText}>-10s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAdjustDuration(durationSec - 5)}
                    style={styles.durBtn}
                  >
                    <Text style={styles.durBtnText}>-5s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAdjustDuration(durationSec - 1)}
                    style={styles.durBtnSm}
                  >
                    <Text style={styles.durBtnText}>-1s</Text>
                  </TouchableOpacity>

                  <View style={styles.durationDisplayBox}>
                    <Text style={styles.durationValueText}>
                      {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
                    </Text>
                    <Text style={styles.durationSubText}>({durationSec}s total)</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleAdjustDuration(durationSec + 1)}
                    style={styles.durBtnSm}
                  >
                    <Text style={styles.durBtnText}>+1s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAdjustDuration(durationSec + 5)}
                    style={styles.durBtn}
                  >
                    <Text style={styles.durBtnText}>+5s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAdjustDuration(durationSec + 10)}
                    style={styles.durBtnSm}
                  >
                    <Text style={styles.durBtnText}>+10s</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Preset Seconds Chips */}
              <View style={styles.presetChipsRow}>
                {[0, 10, 15, 20, 30, 45, 60, 120].map((presetSec) => {
                  const isCurrent = durationSec === presetSec;
                  const label =
                    presetSec === 0
                      ? "0s (Missed)"
                      : presetSec >= 60
                      ? `${Math.floor(presetSec / 60)}m`
                      : `${presetSec}s`;
                  return (
                    <TouchableOpacity
                      key={presetSec}
                      onPress={() => handleAdjustDuration(presetSec)}
                      style={[styles.presetChip, isCurrent && styles.presetChipActive]}
                    >
                      <Text style={[styles.presetChipText, isCurrent && styles.presetChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Exact Timeline */}
              <View style={styles.timeRangeRow}>
                <Text style={styles.timeRangeText}>🟢 Start: {startTimeStr}</Text>
                <Text style={styles.timeRangeText}>🔴 End: {endTimeStr}</Text>
              </View>
            </View>

            {/* Calling Staff Member Selection Chips (Click your name to save) */}
            <View style={styles.staffSelectCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <User size={15} color="#1E40AF" strokeWidth={2.5} />
                <Text style={styles.staffSectionTitle}>
                  Staff Member: <Text style={{ color: "#1D4ED8", fontWeight: "800" }}>{callerName}</Text> (Click to change)
                </Text>
              </View>
              <View style={styles.staffChipsRow}>
                {WEGROW_STAFF_MEMBERS.map((staff) => {
                  const isSelected = callerName === staff;
                  return (
                    <TouchableOpacity
                      key={staff}
                      onPress={() => setCallerName(staff)}
                      style={[styles.staffChip, isSelected && styles.staffChipActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.staffChipText, isSelected && styles.staffChipTextActive]}>
                        {isSelected ? `✓ ${staff}` : staff}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Editable Candidate Name & Phone Number Card */}
            <View style={styles.candidateCard}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Candidate Name</Text>
                  <TextInput
                    style={styles.inputSm}
                    value={candidateName}
                    onChangeText={setCandidateName}
                    placeholder="Candidate Name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.inputSm}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="10-digit Phone"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>

            {/* Quick 1-Click WhatsApp Follow-up button */}
            <TouchableOpacity
              style={styles.waBtn}
              onPress={() =>
                TelephonyService.openWhatsAppChat(
                  phoneNumber || lead.phone,
                  candidateName || lead.studentName,
                  isJobz ? preferredDomain : courseInterested
                )
              }
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

            {/* Job Fields (Jobz Mode) */}
            {isJobz ? (
              <View style={styles.jobzSection}>
                <View style={styles.sectionHeaderBox}>
                  <Briefcase size={16} color={THEME.colors.primary} />
                  <Text style={styles.sectionLabel}>Job Role / Domain Needed</Text>
                </View>

                {/* Autocomplete Search Input */}
                <TextInput
                  style={styles.input}
                  placeholder="Type letter to search jobs (e.g. Python, Full Stack, HR)..."
                  value={preferredDomain}
                  onChangeText={(text) => {
                    setPreferredDomain(text);
                    setDomainQuery(text);
                    setShowDomainSuggestions(true);
                  }}
                  onFocus={() => setShowDomainSuggestions(true)}
                />

                {showDomainSuggestions && filteredDomains.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    <Text style={styles.suggestionsHeader}>Select Matched Role ({filteredDomains.length}):</Text>
                    {filteredDomains.map((domain) => (
                      <TouchableOpacity
                        key={domain}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setPreferredDomain(domain);
                          setShowDomainSuggestions(false);
                        }}
                      >
                        <Briefcase size={13} color="#2563EB" />
                        <Text style={styles.suggestionText}>{domain}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

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

                <View style={styles.sectionHeaderBox}>
                  <DollarSign size={16} color={THEME.colors.primary} />
                  <Text style={styles.sectionLabel}>Expected CTC / Salary</Text>
                </View>
                <View style={styles.chipsContainer}>
                  {SALARY_RANGES.map((sal) => {
                    const active = expectedSalary === sal;
                    return (
                      <TouchableOpacity
                        key={sal}
                        onPress={() => setExpectedSalary(sal)}
                        style={[styles.chipSm, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipTextSm, active && styles.chipTextActive]}>{sal}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* Course Interested (Admission Mode) */
              <View style={styles.jobzSection}>
                <View style={styles.sectionHeaderBox}>
                  <Sparkles size={16} color="#16A34A" />
                  <Text style={styles.sectionLabel}>Course Interested (Wegrow Curriculum)</Text>
                </View>

                {/* Autocomplete Course Input */}
                <TextInput
                  style={styles.input}
                  placeholder="Type letter to search courses (e.g. Python, Full Stack)..."
                  value={courseInterested}
                  onChangeText={(text) => {
                    setCourseInterested(text);
                    setCourseQuery(text);
                    setShowCourseSuggestions(true);
                  }}
                  onFocus={() => setShowCourseSuggestions(true)}
                />

                {showCourseSuggestions && filteredCourses.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    <Text style={styles.suggestionsHeader}>Institute Courses ({filteredCourses.length}):</Text>
                    {filteredCourses.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setCourseInterested(c.displayName);
                          setShowCourseSuggestions(false);
                        }}
                      >
                        <Sparkles size={13} color="#16A34A" />
                        <Text style={styles.suggestionText}>{c.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Education & All-India College Search */}
            <View style={styles.eduSection}>
              <View style={styles.sectionHeaderBox}>
                <GraduationCap size={16} color={THEME.colors.primary} />
                <Text style={styles.sectionLabel}>College & Qualification</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Degree (e.g. B.E CSE, B.Com, BCA, MCA)"
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
              </View>

              {/* All India College Autocomplete */}
              <TextInput
                style={styles.input}
                placeholder="Type to search College Name across India..."
                value={collegeName}
                onChangeText={(text) => {
                  setCollegeName(text);
                  setCollegeQuery(text);
                  setShowCollegeSuggestions(true);
                }}
                onFocus={() => setShowCollegeSuggestions(true)}
              />

              {showCollegeSuggestions && filteredColleges.length > 0 && (
                <View style={styles.suggestionsBox}>
                  <Text style={styles.suggestionsHeader}>Colleges & Universities ({filteredColleges.length}):</Text>
                  {filteredColleges.map((col) => (
                    <TouchableOpacity
                      key={col}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setCollegeName(col);
                        setShowCollegeSuggestions(false);
                      }}
                    >
                      <Building2 size={13} color="#4F46E5" />
                      <Text style={styles.suggestionText}>{col}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
              placeholder="Candidate feedback, communication skill, interview schedule, expectations..."
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
    maxHeight: "92%",
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
  durationCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  liveClockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  liveClockLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  liveClockValue: {
    fontSize: 12,
    fontWeight: "900",
    color: "#14532D",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  durationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  durationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  durationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
  },
  durationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durBtn: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  durBtnSm: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  durationDisplayBox: {
    alignItems: "center",
    paddingHorizontal: 4,
  },
  durBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  durationValueText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#14532D",
  },
  durationSubText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#15803D",
  },
  presetChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginVertical: 6,
  },
  presetChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  presetChipActive: {
    backgroundColor: "#16A34A",
    borderColor: "#15803D",
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  presetChipTextActive: {
    color: "#FFFFFF",
  },
  timeRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#DCFCE7",
  },
  timeRangeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  staffSelectCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  staffSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  staffChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  staffChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  staffChipActive: {
    backgroundColor: "#16A34A",
    borderColor: "#15803D",
  },
  staffChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  staffChipTextActive: {
    color: "#FFFFFF",
  },
  candidateCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 3,
  },
  inputSm: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    fontWeight: "600",
  },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    borderRadius: 10,
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  eduSection: {
    backgroundColor: "#FAFAFA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fuBox: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    color: "#0F172A",
  },
  suggestionsBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    marginBottom: 12,
    padding: 6,
    maxHeight: 180,
  },
  suggestionsHeader: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F1F5F9",
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
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
    paddingVertical: 13,
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
