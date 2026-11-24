export type AppMode = "admission" | "jobz";

export interface Lead {
  id: string;
  studentName: string;
  phone: string;
  email: string;
  courseInterested: string;
  leadSource: string;
  enquiryDate: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  assignedCaller: string;
  status: "New" | "Contacted" | "Interested" | "Follow-up" | "Enrolled" | "Closed" | "Placed" | "Screening Scheduled";
  priority: "Hot" | "Warm" | "Cold";
  stage: "New Enquiry" | "Call Scheduled" | "Demo Booked" | "Decision Pending" | "Admission Done" | "Interview Scheduled" | "Placed" | "Lost";
  notes?: string[];
  callCount?: number;
  qualification?: string;
  passedOutYear?: string;
  collegeName?: string;
  lastCallDate?: string;
  lastCallOutcome?: string;
  lastCallNotes?: string;
  lastCallDuration?: string;
  // Jobz candidate screening fields:
  experienceYears?: string; // e.g. Fresher, 1 Year, 2+ Years
  currentCompany?: string;
  preferredDomain?: string; // e.g. IT, Non-IT, Full Stack, Data, Sales, Telecalling
  expectedSalary?: string;
  noticePeriod?: string;
  currentCity?: string;
  appMode?: AppMode;
  callRecordingUri?: string; // Phone local audio path
}

export const WEGROW_STAFF_MEMBERS = [
  "Muthumeena",
] as const;

export const WEGROW_ADMIN_MEMBERS = [
  "Gopinath (HR)",
  "Vijayakumar",
  "Thavabalan",
] as const;

export type StaffMember = string;

export type CallDisposition =
  | "Interested"
  | "Interview Scheduled"
  | "Shortlisted"
  | "Visit to Institute"
  | "Joined"
  | "Placed"
  | "Not Interested"
  | "Call Later"
  | "Busy"
  | "Not Answered"
  | "Counselling Scheduled"
  | "Lost";

export interface CallRecord {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  studentPhone?: string;
  callerName: string;
  disposition: CallDisposition | string;
  outcome?: string;
  mindset?: string;
  durationSeconds: number;
  duration_seconds?: number;
  formattedDuration: string;
  duration?: string;
  durationFormatted?: string;
  qualification?: string;
  passedOutYear?: string;
  collegeName?: string;
  courseInterested?: string;
  studentCourse?: string;
  // Jobz candidate fields
  experienceYears?: string;
  preferredDomain?: string;
  currentCompany?: string;
  expectedSalary?: string;
  appMode?: AppMode;
  recordingUri?: string; // Phone local audio file path
  callRecordingUri?: string;
  callStartTime?: string;
  callEndTime?: string;
  callDate?: string;
  callTime?: string;
  fromTime?: string;
  endTime?: string;
  notes: string;
  remarks?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  timestamp: number;
  syncedToCrm: boolean;
}

export interface TelecallerStats {
  todayCallsCount: number;
  todayTalkTimeSeconds: number;
  interestedCount: number;
  counsellingScheduledCount: number;
  targetCalls: number;
  idleTimeSeconds: number;
  attendanceLoginTime?: string;
  attendanceLogoutTime?: string;
}

export interface AttendanceRecord {
  id: string;
  callerName: string;
  date: string;
  loginTime: string;
  logoutTime?: string;
  punchInTimestamp?: number;
  punchOutTimestamp?: number;
  workingHoursFormatted?: string;
  totalCallsToday: number;
  spokenSeconds: number;
  idleSeconds?: number;
  status: "Punched In" | "Punched Out";
}

export interface AppSettings {
  crmServerUrl: string; // Active URL
  admissionServerUrl?: string; // e.g. "https://wegrowcrm.vercel.app"
  jobzServerUrl?: string; // e.g. "http://192.168.29.60:3001"
  callerName: string;
  autoPopupDisposition: boolean;
  strictSafetyBlock: boolean;
  vibrateOnCall: boolean;
  activeAppMode: AppMode;
  localRecordingEnabled: boolean;
}
