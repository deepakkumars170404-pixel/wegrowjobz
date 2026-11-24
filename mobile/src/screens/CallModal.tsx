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
import { ALL_INDIA_COLLEGES_LIST, DEGREES_LIST } from "../data/academicData";
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
  ShieldCheck,
  Lock,
} from "lucide-react-native";

interface CallModalProps {
  visible: boolean;
  lead: Lead | null;
  durationSeconds: number;
  startMs?: number;
  endMs?: number;
  appMode?: AppMode;
  recordingPath?: string;
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
  startMs,
  endMs,
  appMode = "jobz",
  recordingPath,
  onClose,
  onSaveSuccess,
}) => {
  const isJobz = appMode === "jobz";
  const [recordingFound, setRecordingFound] = useState<string | undefined>(recordingPath);

  const [callerName, setCallerName] = useState<StaffMember>("Muthumeena");
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
  const [customReason, setCustomReason] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [nextFollowUpTime, setNextFollowUpTime] = useState("10:30 AM");
  const [submitting, setSubmitting] = useState(false);

  // Mini Calendar & Mini Clock State for Follow-up
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [showMiniClock, setShowMiniClock] = useState(false);
  const [clockHour, setClockHour] = useState("10");
  const [clockMinute, setClockMinute] = useState("30");
  const [clockAmPm, setClockAmPm] = useState<"AM" | "PM">("AM");

  // Helper to format ISO date string
  const formatOffsetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Generate next 14 calendar days for 1-tap mini calendar
  const next14Days = useMemo(() => {
    const list: { dateStr: string; dayName: string; dayNum: number; monthName: string }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      list.push({
        dateStr: `${y}-${m}-${day}`,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthName: monthNames[d.getMonth()],
      });
    }
    return list;
  }, []);

  // Search queries & suggestion visibility
  const [domainQuery, setDomainQuery] = useState("");
  const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);

  const [courseQuery, setCourseQuery] = useState("");
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);

  const [collegeQuery, setCollegeQuery] = useState("");
  const [showCollegeSuggestions, setShowCollegeSuggestions] = useState(false);

  const [degreeQuery, setDegreeQuery] = useState("");
  const [showDegreeSuggestions, setShowDegreeSuggestions] = useState(false);

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

      const endD = endMs ? new Date(endMs) : new Date();
      const startD = startMs
        ? new Date(startMs)
        : new Date(endD.getTime() - durationSeconds * 1000);
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
      setDegreeQuery("");
      setShowDegreeSuggestions(false);

      // Sync recording path when modal opens
      setRecordingFound(recordingPath);
    }
  }, [lead, visible, durationSeconds, startMs, endMs, isJobz, recordingPath]);

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

  // Filtered Degrees & Courses (World & Indian Education)
  const filteredDegrees = useMemo(() => {
    if (!degreeQuery.trim()) return [];
    const q = degreeQuery.toLowerCase();
    return DEGREES_LIST.filter((d) => d.toLowerCase().includes(q)).slice(0, 8);
  }, [degreeQuery]);

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
      callDate: new Date().toISOString().split("T")[0],
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
      notes: [customReason.trim() ? `Reason: ${customReason.trim()}` : "", notes.trim()].filter(Boolean).join(" • "),
      remarks: [customReason.trim() ? `Reason: ${customReason.trim()}` : "", notes.trim()].filter(Boolean).join(" • "),
      nextFollowUpDate: nextFollowUpDate ? nextFollowUpDate : undefined,
      nextFollowUpTime: nextFollowUpTime ? nextFollowUpTime : undefined,
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
                <Text style={styles.headerTitle}>{candidateName || lead.studentName}</Text>
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
                📞 {phoneNumber || lead.phone} • {isJobz ? "Jobz CRM Mode" : "Admission CRM Mode"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  Talk: {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <XCircle size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Tamper-Proof Carrier Talk Duration Card with Real-time Live Clock */}
            <View style={styles.durationCardLocked}>
              {/* Live Clock Header */}
              <View style={styles.liveClockHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={styles.liveGreenDot} />
                  <Text style={styles.liveClockLabel}>Real-time Live Clock:</Text>
                </View>
                <LiveClock style={styles.liveClockValue} />
              </View>

              {/* Locked Carrier Verification Banner */}
              <View style={styles.lockedHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={18} color="#15803D" strokeWidth={2.5} />
                  <Text style={styles.lockedBadgeText}>Carrier Talk Duration</Text>
                </View>
                <View style={styles.lockedPill}>
                  <Lock size={11} color="#15803D" strokeWidth={2.5} />
                  <Text style={styles.lockedPillText}>SYSTEM VERIFIED (LOCKED)</Text>
                </View>
              </View>

              {/* Big Duration Display */}
              <View style={styles.durationBigDisplay}>
                <Text style={styles.durationBigValue}>
                  {mins > 0 ? `${mins}m ${secs.toString().padStart(2, "0")}s` : `${secs}s`}
                </Text>
                <Text style={styles.durationBigSub}>
                  {durationSec > 0
                    ? `✓ Spoken Talk Time: ${durationSec} seconds (Read-only / Tamper-proof)`
                    : "⚠️ Call not answered / Missed Call (0 seconds)"}
                </Text>
              </View>

              {/* Exact Timeline */}
              <View style={styles.timeRangeRow}>
                <Text style={styles.timeRangeText}>🟢 Call Start: {startTimeStr}</Text>
                <Text style={styles.timeRangeText}>🔴 Call End: {endTimeStr}</Text>
              </View>

              {/* Call Recording Badge */}
              {recordingFound ? (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: "#DCFCE7", borderRadius: 8, padding: 8, marginTop: 6,
                  borderWidth: 1, borderColor: "#16A34A"
                }}>
                  <Text style={{ fontSize: 14 }}>🎙️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#15803D" }}>
                      Call Recording Found ✓
                    </Text>
                    <Text style={{ fontSize: 10, color: "#166534" }} numberOfLines={1}>
                      {recordingFound.split("/").pop()}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: "#FEF9C3", borderRadius: 8, padding: 8, marginTop: 6,
                  borderWidth: 1, borderColor: "#CA8A04"
                }}>
                  <Text style={{ fontSize: 12 }}>💡</Text>
                  <Text style={{ fontSize: 10, color: "#92400E", flex: 1 }}>
                    No recording found. Enable "Auto Record Calls" in your Phone app settings.
                  </Text>
                </View>
              )}
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

            {/* Candidate Specific Reason / Other Feedback Input Box */}
            <View style={styles.reasonInputCard}>
              <Text style={styles.reasonInputLabel}>
                💬 Specific Reason / Candidate Feedback (Optional):
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Type specific reason if candidate gave other details (e.g. Salary clash, Relocation, Timing issue)..."
                value={customReason}
                onChangeText={setCustomReason}
                placeholderTextColor="#94A3B8"
              />
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

              {/* Degree / Qualification with Comprehensive World & Indian Autocomplete */}
              <TextInput
                style={styles.input}
                placeholder="Degree (e.g. B.E CSE, B.Com, BCA, MCA, B.S, MBA)"
                value={qualification}
                onChangeText={(text) => {
                  setQualification(text);
                  setDegreeQuery(text);
                  setShowDegreeSuggestions(true);
                }}
                onFocus={() => {
                  if (qualification.trim()) {
                    setDegreeQuery(qualification);
                    setShowDegreeSuggestions(true);
                  }
                }}
              />

              {showDegreeSuggestions && filteredDegrees.length > 0 && (
                <View style={styles.suggestionsBox}>
                  <Text style={styles.suggestionsHeader}>Degrees & Courses ({filteredDegrees.length}):</Text>
                  {filteredDegrees.map((deg) => (
                    <TouchableOpacity
                      key={deg}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setQualification(deg);
                        setShowDegreeSuggestions(false);
                      }}
                    >
                      <Sparkles size={13} color="#2563EB" />
                      <Text style={styles.suggestionText}>{deg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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

            {/* Next Callback Date / Follow-up (Interactive Mini Calendar & Mini Clock) */}
            <View style={styles.scheduleBox}>
                <View style={styles.scheduleHeaderRow}>
                  <Text style={styles.sectionLabel}>📅 SCHEDULE NEXT FOLLOW-UP</Text>
                  {(Boolean(nextFollowUpDate) || Boolean(nextFollowUpTime)) && (
                    <TouchableOpacity
                      style={styles.clearFollowUpBtn}
                      onPress={() => {
                        setNextFollowUpDate("");
                        setNextFollowUpTime("");
                      }}
                    >
                      <Text style={styles.clearFollowUpText}>✕ Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Selected Date & Time Badge / Text preview */}
                {(Boolean(nextFollowUpDate) || Boolean(nextFollowUpTime)) ? (
                  <View style={styles.scheduleSummaryBar}>
                    <Text style={styles.scheduleSummaryText}>
                      📌 Scheduled:{" "}
                      <Text style={styles.scheduleSummaryHighlight}>
                        {nextFollowUpDate || "No Date"}
                      </Text>{" "}
                      at{" "}
                      <Text style={styles.scheduleSummaryHighlight}>
                        {nextFollowUpTime || "No Time"}
                      </Text>
                    </Text>
                  </View>
                ) : null}

                {/* --- A. MINI CALENDAR --- */}
                <View style={styles.pickerSection}>
                  <View style={styles.pickerLabelRow}>
                    <Text style={styles.pickerSubLabel}>🗓️ DATE (Choose 1-Tap):</Text>
                    <TouchableOpacity
                      style={styles.pickerToggleBtn}
                      onPress={() => setShowMiniCalendar((prev) => !prev)}
                    >
                      <Text style={styles.pickerToggleText}>
                        {showMiniCalendar ? "▲ Close Calendar" : "▼ 14-Day Calendar"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quick Date Chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScrollContainer}
                  >
                    {[
                      { label: "Today", days: 0 },
                      { label: "Tomorrow", days: 1 },
                      { label: "+2 Days", days: 2 },
                      { label: "+3 Days", days: 3 },
                      { label: "+5 Days", days: 5 },
                      { label: "Next Week", days: 7 },
                    ].map((item) => {
                      const targetDate = formatOffsetDate(item.days);
                      const isSelected = nextFollowUpDate === targetDate;
                      return (
                        <TouchableOpacity
                          key={item.label}
                          style={[styles.dateChip, isSelected && styles.dateChipActive]}
                          onPress={() => setNextFollowUpDate(targetDate)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Expandable 14-Day Calendar Horizontal Strip */}
                  {showMiniCalendar && (
                    <View style={styles.calendarContainer}>
                      <Text style={styles.calendarHeaderInfo}>Select from next 14 days:</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.calendarDaysRow}
                      >
                        {next14Days.map((day) => {
                          const isSelected = nextFollowUpDate === day.dateStr;
                          return (
                            <TouchableOpacity
                              key={day.dateStr}
                              style={[styles.dayCard, isSelected && styles.dayCardActive]}
                              onPress={() => {
                                setNextFollowUpDate(day.dateStr);
                                setShowMiniCalendar(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[styles.dayCardDayName, isSelected && styles.dayCardTextActive]}
                              >
                                {day.dayName}
                              </Text>
                              <Text
                                style={[styles.dayCardDayNum, isSelected && styles.dayCardTextActive]}
                              >
                                {day.dayNum}
                              </Text>
                              <Text
                                style={[styles.dayCardMonth, isSelected && styles.dayCardTextActive]}
                              >
                                {day.monthName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* --- B. MINI CLOCK --- */}
                <View style={[styles.pickerSection, { marginTop: 8 }]}>
                  <View style={styles.pickerLabelRow}>
                    <Text style={styles.pickerSubLabel}>⏰ TIME (Choose 1-Tap):</Text>
                    <TouchableOpacity
                      style={styles.pickerToggleBtn}
                      onPress={() => setShowMiniClock((prev) => !prev)}
                    >
                      <Text style={styles.pickerToggleText}>
                        {showMiniClock ? "▲ Close Clock" : "▼ Custom Clock"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quick Common Follow-up Times */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScrollContainer}
                  >
                    {[
                      "10:30 AM",
                      "11:30 AM",
                      "12:30 PM",
                      "02:30 PM",
                      "03:30 PM",
                      "04:30 PM",
                      "05:30 PM",
                      "06:30 PM",
                    ].map((timeOption) => {
                      const isSelected = nextFollowUpTime === timeOption;
                      return (
                        <TouchableOpacity
                          key={timeOption}
                          style={[styles.timeChip, isSelected && styles.timeChipActive]}
                          onPress={() => setNextFollowUpTime(timeOption)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>
                            {timeOption}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Expandable Interactive Mini Clock Picker */}
                  {showMiniClock && (
                    <View style={styles.clockPickerContainer}>
                      <View style={styles.clockAmPmRow}>
                        <Text style={styles.clockPickerHeader}>AM / PM:</Text>
                        <View style={styles.amPmBtnGroup}>
                          <TouchableOpacity
                            style={[styles.amPmBtn, clockAmPm === "AM" && styles.amPmBtnActive]}
                            onPress={() => {
                              setClockAmPm("AM");
                              setNextFollowUpTime(`${clockHour}:${clockMinute} AM`);
                            }}
                          >
                            <Text
                              style={[
                                styles.amPmBtnText,
                                clockAmPm === "AM" && styles.amPmBtnTextActive,
                              ]}
                            >
                              AM (Morning)
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.amPmBtn, clockAmPm === "PM" && styles.amPmBtnActive]}
                            onPress={() => {
                              setClockAmPm("PM");
                              setNextFollowUpTime(`${clockHour}:${clockMinute} PM`);
                            }}
                          >
                            <Text
                              style={[
                                styles.amPmBtnText,
                                clockAmPm === "PM" && styles.amPmBtnTextActive,
                              ]}
                            >
                              PM (Afternoon/Evening)
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Hour selector */}
                      <Text style={styles.clockRowTitle}>Hour:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clockNumberRow}>
                        {["09", "10", "11", "12", "01", "02", "03", "04", "05", "06", "07"].map((h) => (
                          <TouchableOpacity
                            key={h}
                            style={[styles.clockHourBtn, clockHour === h && styles.clockHourBtnActive]}
                            onPress={() => {
                              setClockHour(h);
                              setNextFollowUpTime(`${h}:${clockMinute} ${clockAmPm}`);
                            }}
                          >
                            <Text style={[styles.clockHourBtnText, clockHour === h && styles.clockHourBtnTextActive]}>
                              {h}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      {/* Minute selector */}
                      <Text style={styles.clockRowTitle}>Minute:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clockNumberRow}>
                        {["00", "15", "30", "45"].map((m) => (
                          <TouchableOpacity
                            key={m}
                            style={[styles.clockHourBtn, clockMinute === m && styles.clockHourBtnActive]}
                            onPress={() => {
                              setClockMinute(m);
                              setNextFollowUpTime(`${clockHour}:${m} ${clockAmPm}`);
                            }}
                          >
                            <Text style={[styles.clockHourBtnText, clockMinute === m && styles.clockHourBtnTextActive]}>
                              {m}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Confirmation inputs */}
                <View style={[styles.row, { marginTop: 8 }]}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                    placeholder="Date (YYYY-MM-DD)"
                    value={nextFollowUpDate}
                    onChangeText={setNextFollowUpDate}
                    placeholderTextColor="#94A3B8"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Time (e.g. 03:30 PM)"
                    value={nextFollowUpTime}
                    onChangeText={setNextFollowUpTime}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

            {/* Telecaller Notes / Feedback */}
            <Text style={styles.sectionLabel}>Discussion Remarks / Feedback</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Candidate spoke with Muthumeena. Discussed job role, expected salary, and notice period..."
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* Footer Action Buttons: Skip & Save Call to Profile */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, submitting && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Save Call to {candidateName.trim() || lead.studentName || "Candidate"}&apos;s Profile →
                </Text>
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
  durationCardLocked: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 14,
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
    marginBottom: 10,
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
  lockedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  lockedBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  lockedPillText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 0.4,
  },
  durationBigDisplay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginVertical: 4,
  },
  durationBigValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#14532D",
    letterSpacing: 0.5,
  },
  durationBigSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
    marginTop: 2,
    textAlign: "center",
  },
  timeRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginLeft: 10,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  durationBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#16A34A",
  },
  durationText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
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
  reasonInputCard: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  reasonInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  scheduleBox: {
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  clearFollowUpBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  clearFollowUpText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  scheduleSummaryBar: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  scheduleSummaryText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
  },
  scheduleSummaryHighlight: {
    fontWeight: "900",
    color: "#14532D",
  },
  pickerSection: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pickerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pickerSubLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E293B",
  },
  pickerToggleBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  pickerToggleText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  chipsScrollContainer: {
    flexDirection: "row",
    gap: 6,
  },
  dateChip: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  dateChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  dateChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  dateChipTextActive: {
    color: "#FFFFFF",
  },
  calendarContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  calendarHeaderInfo: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
  },
  calendarDaysRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayCard: {
    width: 46,
    height: 56,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCardActive: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  dayCardDayName: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  dayCardDayNum: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  dayCardMonth: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
  },
  dayCardTextActive: {
    color: "#FFFFFF",
  },
  timeChip: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  timeChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  timeChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  timeChipTextActive: {
    color: "#FFFFFF",
  },
  clockPickerContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  clockAmPmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  clockPickerHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  amPmBtnGroup: {
    flexDirection: "row",
    gap: 6,
  },
  amPmBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  amPmBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  amPmBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  amPmBtnTextActive: {
    color: "#FFFFFF",
  },
  clockRowTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 6,
    marginBottom: 4,
  },
  clockNumberRow: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 2,
  },
  clockHourBtn: {
    width: 34,
    height: 32,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  clockHourBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  clockHourBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  clockHourBtnTextActive: {
    color: "#FFFFFF",
  },
});
