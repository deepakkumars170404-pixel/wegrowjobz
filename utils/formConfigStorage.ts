export interface DispositionOutcome {
  id: string;
  key: string;
  label: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export interface PostCallFormField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "datetime";
  required: boolean;
  enabled: boolean;
  options?: string[]; // for select dropdowns
  placeholder?: string;
  isCustom?: boolean;
}

export interface PostCallFormConfig {
  outcomes: DispositionOutcome[];
  fields: PostCallFormField[];
}

export const DEFAULT_DISPOSITION_OUTCOMES: DispositionOutcome[] = [
  { id: "out-1", key: "Interested", label: "Interested", icon: "🌟", color: "#10B981", isActive: true },
  { id: "out-2", key: "Shortlisted", label: "Shortlisted", icon: "📋", color: "#3B82F6", isActive: true },
  { id: "out-3", key: "Interview Scheduled", label: "Interview Scheduled", icon: "💼", color: "#8B5CF6", isActive: true },
  { id: "out-4", key: "Placed / Hired", label: "Placed / Hired", icon: "🎉", color: "#059669", isActive: true },
  { id: "out-5", key: "Call Later", label: "Call Later", icon: "⏰", color: "#F59E0B", isActive: true },
  { id: "out-6", key: "Not Interested", label: "Not Interested", icon: "❌", color: "#EF4444", isActive: true },
  { id: "out-7", key: "Busy / No Answer", label: "Busy / No Answer", icon: "📵", color: "#64748B", isActive: true },
  { id: "out-8", key: "Wrong Number", label: "Wrong Number", icon: "🚫", color: "#94A3B8", isActive: true },
];

export const DEFAULT_POST_CALL_FIELDS: PostCallFormField[] = [
  {
    id: "remarks",
    label: "Call Discussion & Candidate Remarks",
    type: "textarea",
    required: true,
    enabled: true,
    placeholder: "Summarize candidate's response, communication skills, and willingness...",
    isCustom: false,
  },
  {
    id: "nextFollowUp",
    label: "Schedule Next Follow-up (Date & Time)",
    type: "datetime",
    required: false,
    enabled: true,
    isCustom: false,
  },
  {
    id: "preferredDomain",
    label: "Target Role / Preferred Domain",
    type: "text",
    required: false,
    enabled: true,
    placeholder: "e.g. Full Stack Developer, Telecaller, Accounts...",
    isCustom: false,
  },
  {
    id: "experienceYears",
    label: "Candidate Experience Level",
    type: "select",
    required: false,
    enabled: true,
    options: ["Fresher (0 - 6 Months)", "1 Year", "2 Years", "3 - 5 Years", "5+ Years"],
    isCustom: false,
  },
  {
    id: "expectedSalary",
    label: "Expected Salary (Monthly CTC)",
    type: "text",
    required: false,
    enabled: true,
    placeholder: "e.g. ₹20,000 / month",
    isCustom: false,
  },
  {
    id: "noticePeriod",
    label: "Notice Period / Availability",
    type: "select",
    required: false,
    enabled: true,
    options: ["Immediate Joiner", "15 Days", "30 Days", "Currently Serving Notice"],
    isCustom: false,
  },
  {
    id: "currentCompany",
    label: "Current Company / Employment Status",
    type: "text",
    required: false,
    enabled: true,
    placeholder: "e.g. Looking for Job, or XYZ Pvt Ltd",
    isCustom: false,
  },
  {
    id: "currentCity",
    label: "Current City / Location",
    type: "text",
    required: false,
    enabled: true,
    placeholder: "e.g. Chennai, Bangalore, Coimbatore...",
    isCustom: false,
  },
];

const STORAGE_KEY = "wegrow_jobz_call_form_config_v1";

export const FormConfigService = {
  getConfig(): PostCallFormConfig {
    if (typeof window === "undefined") {
      return { outcomes: DEFAULT_DISPOSITION_OUTCOMES, fields: DEFAULT_POST_CALL_FIELDS };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          outcomes: Array.isArray(parsed.outcomes) && parsed.outcomes.length > 0 ? parsed.outcomes : DEFAULT_DISPOSITION_OUTCOMES,
          fields: Array.isArray(parsed.fields) && parsed.fields.length > 0 ? parsed.fields : DEFAULT_POST_CALL_FIELDS,
        };
      }
    } catch {}
    return { outcomes: DEFAULT_DISPOSITION_OUTCOMES, fields: DEFAULT_POST_CALL_FIELDS };
  },

  saveConfig(config: PostCallFormConfig): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      // Dispatch custom event so open components (like LiveCallModal) re-render immediately
      window.dispatchEvent(new Event("wegrow_form_config_updated"));
    } catch {}
  },
};
