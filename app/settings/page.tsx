"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  CheckCircle2,
  Bell,
  PhoneCall,
  User,
  Sliders,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Eye,
  SlidersHorizontal,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import {
  FormConfigService,
  PostCallFormConfig,
  DispositionOutcome,
  PostCallFormField,
  DEFAULT_DISPOSITION_OUTCOMES,
  DEFAULT_POST_CALL_FIELDS,
} from "@/utils/formConfigStorage";
import { ALL_JOB_ROLES } from "@/data/job-domains";

export default function SettingsPage() {
  const { showToast } = useCRM();

  const [activeTab, setActiveTab] = useState<
    | "postcall_form"
    | "company"
    | "job_domains"
    | "pipeline"
    | "calling"
    | "notifications"
  >("postcall_form");

  // Job Roles & Domains State
  const [jobRolesList, setJobRolesList] = useState<string[]>(ALL_JOB_ROLES);
  const [newJobRoleName, setNewJobRoleName] = useState("");
  const [jobRoleSearch, setJobRoleSearch] = useState("");
  const [isAddingJobRole, setIsAddingJobRole] = useState(false);

  // Custom Pipeline Stages State
  const [pipelineStages, setPipelineStages] = useState([
    { name: "New Enquiry / Lead", desc: "Fresh candidate uploaded or received from job boards", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { name: "Contacted / Telecalled", desc: "First screening call connected with candidate", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { name: "Interested", desc: "Candidate open for job openings and willing to attend interview", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { name: "Shortlisted", desc: "Resume verified and sent to corporate client hiring manager", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { name: "Interview Scheduled", desc: "Interview date & time locked with company", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { name: "Placed / Selected 🎉", desc: "Offer letter issued and candidate onboarded", color: "bg-green-50 text-green-700 border-green-200" },
  ]);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageDesc, setNewStageDesc] = useState("");

  // Post-Call Form Configuration State
  const [config, setConfig] = useState<PostCallFormConfig>({
    outcomes: DEFAULT_DISPOSITION_OUTCOMES,
    fields: DEFAULT_POST_CALL_FIELDS,
  });

  // New Outcome Form State
  const [isAddingOutcome, setIsAddingOutcome] = useState(false);
  const [newOutcomeName, setNewOutcomeName] = useState("");
  const [newOutcomeIcon, setNewOutcomeIcon] = useState("📌");
  const [newOutcomeColor, setNewOutcomeColor] = useState("#3B82F6");

  // New Field Form State
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "select" | "textarea">("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Company Profile State
  const [companyName, setCompanyName] = useState("WeGrow Jobz");
  const [tagline, setTagline] = useState("Premier Recruitment & Placement Telecalling Platform");
  const [website, setWebsite] = useState("https://wegrowjobz.com");
  const [supportEmail, setSupportEmail] = useState("careers@wegrowjobz.com");

  // Calling Preferences
  const [dailyTarget, setDailyTarget] = useState("80");
  const [autoNextLead, setAutoNextLead] = useState(true);

  // Notification Toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  // Load configuration from local storage on mount
  useEffect(() => {
    const loaded = FormConfigService.getConfig();
    setConfig(loaded);
    try {
      const storedDomains = localStorage.getItem("wegrow_custom_job_domains");
      if (storedDomains) setJobRolesList(JSON.parse(storedDomains));
      const storedStages = localStorage.getItem("wegrow_custom_pipeline_stages");
      if (storedStages) setPipelineStages(JSON.parse(storedStages));
    } catch {}
  }, []);

  const handleAddJobRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobRoleName.trim()) return;
    const trimmed = newJobRoleName.trim();
    if (jobRolesList.includes(trimmed)) {
      showToast({ type: "warning", title: "Role Exists", message: "This job role is already present." });
      return;
    }
    const updated = [trimmed, ...jobRolesList];
    setJobRolesList(updated);
    try {
      localStorage.setItem("wegrow_custom_job_domains", JSON.stringify(updated));
    } catch {}
    setNewJobRoleName("");
    setIsAddingJobRole(false);
    showToast({ type: "success", title: "Job Role Created", message: `Added "${trimmed}" to candidate domains.` });
  };

  const handleDeleteJobRole = (role: string) => {
    const updated = jobRolesList.filter((r) => r !== role);
    setJobRolesList(updated);
    try {
      localStorage.setItem("wegrow_custom_job_domains", JSON.stringify(updated));
    } catch {}
    showToast({ type: "info", title: "Job Role Removed", message: `Removed "${role}".` });
  };

  const handleAddPipelineStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    const updated = [
      ...pipelineStages,
      {
        name: newStageName.trim(),
        desc: newStageDesc.trim() || "Custom funnel stage",
        color: "bg-purple-50 text-purple-700 border-purple-200",
      },
    ];
    setPipelineStages(updated);
    try {
      localStorage.setItem("wegrow_custom_pipeline_stages", JSON.stringify(updated));
    } catch {}
    setNewStageName("");
    setNewStageDesc("");
    setIsAddingStage(false);
    showToast({ type: "success", title: "Stage Created", message: `Added "${newStageName}" to recruitment pipeline.` });
  };

  const handleSaveConfig = () => {
    FormConfigService.saveConfig(config);
    showToast({
      type: "success",
      title: "Form Configuration Saved",
      message: "Post-call disposition options & form fields updated in real time!",
    });
  };

  // Outcome handlers
  const handleToggleOutcome = (id: string) => {
    const updated = {
      ...config,
      outcomes: config.outcomes.map((o) =>
        o.id === id ? { ...o, isActive: !o.isActive } : o
      ),
    };
    setConfig(updated);
    FormConfigService.saveConfig(updated);
  };

  const handleDeleteOutcome = (id: string) => {
    if (config.outcomes.length <= 2) {
      alert("At least 2 outcomes must remain configured.");
      return;
    }
    const updated = {
      ...config,
      outcomes: config.outcomes.filter((o) => o.id !== id),
    };
    setConfig(updated);
    FormConfigService.saveConfig(updated);
    showToast({ type: "info", title: "Outcome Removed" });
  };

  const handleAddOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutcomeName.trim()) return;

    const newOutcome: DispositionOutcome = {
      id: "out-" + Date.now(),
      key: newOutcomeName.trim(),
      label: newOutcomeName.trim(),
      icon: newOutcomeIcon || "📌",
      color: newOutcomeColor || "#3B82F6",
      isActive: true,
    };

    const updated = {
      ...config,
      outcomes: [...config.outcomes, newOutcome],
    };
    setConfig(updated);
    FormConfigService.saveConfig(updated);

    setNewOutcomeName("");
    setIsAddingOutcome(false);
    showToast({ type: "success", title: "Outcome Added", message: `${newOutcome.label} added to post-call options.` });
  };

  // Field handlers
  const handleToggleField = (id: string) => {
    const updated = {
      ...config,
      fields: config.fields.map((f) =>
        f.id === id ? { ...f, enabled: !f.enabled } : f
      ),
    };
    setConfig(updated);
    FormConfigService.saveConfig(updated);
  };

  const handleToggleRequired = (id: string) => {
    const updated = {
      ...config,
      fields: config.fields.map((f) =>
        f.id === id ? { ...f, required: !f.required } : f
      ),
    };
    setConfig(updated);
    FormConfigService.saveConfig(updated);
  };

  const handleDeleteField = (id: string) => {
    const updated = {
      ...config,
      fields: config.fields.filter((f) => f.id !== id),
    };
    setConfig(updated);
    FormConfigService.saveConfig(updated);
    showToast({ type: "info", title: "Field Removed" });
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;

    const fieldId = "custom_" + newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
    const optionsArr = newFieldType === "select"
      ? newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined;

    const newF: PostCallFormField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      enabled: true,
      options: optionsArr,
      placeholder: `Enter ${newFieldLabel.trim()}...`,
      isCustom: true,
    };

    const updated = {
      ...config,
      fields: [...config.fields, newF],
    };
    setConfig(updated);
    FormConfigService.saveConfig(updated);

    setNewFieldLabel("");
    setNewFieldOptions("");
    setNewFieldRequired(false);
    setIsAddingField(false);
    showToast({ type: "success", title: "Field Added", message: `${newF.label} added to post-call form.` });
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Settings & Customization Desk
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              WeGrow Jobz Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customize post-call telecaller disposition forms, add/remove fields, manage recruitment pipeline & branding
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start md:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save All Settings</span>
        </button>
      </div>

      {/* Main Grid: Tabs & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Tabs (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-2 border border-slate-200/90 shadow-xs h-fit space-y-1 text-xs">
          {[
            { id: "postcall_form", label: "Post-Call Form Builder", icon: SlidersHorizontal, badge: "Custom Form" },
            { id: "company", label: "WeGrow Jobz Profile", icon: Building2 },
            { id: "job_domains", label: "Job Roles & Domains", icon: Briefcase, badge: "Roles" },
            { id: "pipeline", label: "Placement Pipeline Stages", icon: Layers },
            { id: "calling", label: "Telecalling Parameters", icon: PhoneCall },
            { id: "notifications", label: "Alerts & Notifications", icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-left transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-orange-300" : "text-slate-400"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Form Panel (9 Cols) */}
        <div className="lg:col-span-9 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          {/* ========================================================
              TAB 1: POST-CALL FORM & DISPOSITION BUILDER
          ======================================================== */}
          {activeTab === "postcall_form" && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Post-Call Disposition & Form Field Builder</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      Live Telecaller Desk
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure which questions, fields, and disposition outcomes telecallers see when they finish a candidate call.
                  </p>
                </div>
              </div>

              {/* SECTION A: Disposition Outcomes (Mindsets) */}
              <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      1. Candidate Call Outcomes (Dispositions)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Telecallers select one of these outcomes to classify the call result.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddingOutcome(!isAddingOutcome)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Outcome</span>
                  </button>
                </div>

                {/* Add Outcome Form */}
                {isAddingOutcome && (
                  <form onSubmit={handleAddOutcome} className="bg-white p-4 rounded-xl border border-blue-200 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Outcome Name / Label <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Technical Round Scheduled, Budget High"
                          value={newOutcomeName}
                          onChange={(e) => setNewOutcomeName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Emoji / Icon
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 🎯, 🚀, 💼"
                          value={newOutcomeIcon}
                          onChange={(e) => setNewOutcomeIcon(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingOutcome(false)}
                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs"
                      >
                        Save Outcome
                      </button>
                    </div>
                  </form>
                )}

                {/* Outcomes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {config.outcomes.map((o) => (
                    <div
                      key={o.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        o.isActive
                          ? "bg-white border-slate-200 shadow-xs"
                          : "bg-slate-100 border-dashed border-slate-300 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">{o.icon}</span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {o.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleOutcome(o.id)}
                          className="text-slate-400 hover:text-slate-700"
                          title={o.isActive ? "Deactivate outcome" : "Activate outcome"}
                        >
                          {o.isActive ? (
                            <ToggleRight className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOutcome(o.id)}
                          className="text-slate-300 hover:text-rose-500 p-0.5"
                          title="Delete outcome"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: Post-Call Form Fields */}
              <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Post-Call Questions & Candidate Data Fields
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Enable or disable fields that the telecaller must update after finishing the call.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddingField(!isAddingField)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Field</span>
                  </button>
                </div>

                {/* Add Field Form */}
                {isAddingField && (
                  <form onSubmit={handleAddField} className="bg-white p-4 rounded-xl border border-blue-200 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Field Label <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Portfolio / GitHub URL"
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Field Input Type
                        </label>
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        >
                          <option value="text">Single Line Text</option>
                          <option value="number">Numeric (e.g. CTC / Years)</option>
                          <option value="textarea">Multi-line Textarea</option>
                          <option value="select">Dropdown Select</option>
                        </select>
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={newFieldRequired}
                            onChange={(e) => setNewFieldRequired(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Mandatory / Required Field</span>
                        </label>
                      </div>
                    </div>

                    {newFieldType === "select" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Dropdown Options (Comma-separated)
                        </label>
                        <input
                          type="text"
                          placeholder="Option 1, Option 2, Option 3"
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingField(false)}
                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs"
                      >
                        Save Field
                      </button>
                    </div>
                  </form>
                )}

                {/* Fields Table List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-2.5 px-3">Field Label</th>
                        <th className="py-2.5 px-3">Input Type</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Mandatory</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {config.fields.map((f) => (
                        <tr key={f.id} className={f.enabled ? "hover:bg-slate-50/60" : "bg-slate-50/50 opacity-50"}>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800">{f.label}</span>
                            {f.isCustom && (
                              <span className="ml-2 text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full font-bold">
                                Custom
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 uppercase text-[10px] font-bold">
                            {f.type}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleField(f.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold"
                            >
                              {f.enabled ? (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  ✓ Enabled
                                </span>
                              ) : (
                                <span className="text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  Disabled
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleRequired(f.id)}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                f.required
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}
                            >
                              {f.required ? "Required *" : "Optional"}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {f.isCustom ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteField(f.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">System</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION C: Live Interactive Preview Card */}
              <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-2xl p-5 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Telecaller Screen Preview: What the Staff Sees After Every Call</span>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 max-w-md mx-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-xs text-slate-800">Preview: Candidate Call Disposition</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      Attended Call (01:24)
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Placement Mindset / Outcome:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {config.outcomes.filter((o) => o.isActive).slice(0, 4).map((o) => (
                        <span key={o.id} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                          {o.icon} {o.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Enabled Form Questions:
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {config.fields.filter((f) => f.enabled).map((f) => f.label).join(" • ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: WEGROW JOBZ PROFILE
          ======================================================== */}
          {activeTab === "company" && (
            <div className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  WeGrow Jobz Brand & Corporate Profile
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Placement agency and corporate recruitment desk identity
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hiring Support Email</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB: JOB ROLES & DOMAINS
          ======================================================== */}
          {activeTab === "job_domains" && (
            <div className="space-y-6 text-xs">
              <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                    <span>Candidate Job Roles & Career Domains</span>
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                      {jobRolesList.length} Active Domains
                    </span>
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Define and customize job positions available for student placement screening and telecalling routing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingJobRole(!isAddingJobRole)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Job Role</span>
                </button>
              </div>

              {/* Add Job Role Form */}
              {isAddingJobRole && (
                <form
                  onSubmit={handleAddJobRole}
                  className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3 animate-in fade-in"
                >
                  <h4 className="font-bold text-xs text-purple-900">Create New Job Position</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI & Generative AI Engineer, Cloud Architect, Graphic Designer"
                      value={newJobRoleName}
                      onChange={(e) => setNewJobRoleName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-purple-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Add to CRM
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingJobRole(false)}
                        className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter job domains (e.g. Developer, Data, Sales, Designer)..."
                  value={jobRoleSearch}
                  onChange={(e) => setJobRoleSearch(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Domains Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                {jobRolesList
                  .filter((role) => role.toLowerCase().includes(jobRoleSearch.toLowerCase()))
                  .map((role, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-all shadow-xs group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        <span className="font-semibold text-slate-800 text-xs truncate" title={role}>
                          {role}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteJobRole(role)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: PIPELINE STAGES
          ======================================================== */}
          {activeTab === "pipeline" && (
            <div className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Recruitment & Placement Funnel Stages
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Lifecycle stages for candidate tracking in WeGrow Jobz CRM
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingStage(!isAddingStage)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Funnel Stage</span>
                </button>
              </div>

              {isAddingStage && (
                <form
                  onSubmit={handleAddPipelineStage}
                  className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3 animate-in fade-in"
                >
                  <h4 className="font-bold text-xs text-blue-900">Create New Pipeline Stage</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Stage Name (e.g. HR Round Cleared)"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      className="px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-xs font-medium outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newStageDesc}
                      onChange={(e) => setNewStageDesc(e.target.value)}
                      className="px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-xs font-medium outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStage(false)}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 bg-blue-600 text-white rounded-xl text-xs font-bold"
                    >
                      Save Stage
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {pipelineStages.map((stg, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${stg.color}`}>
                        {stg.name}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">{stg.desc}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Stage {i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: TELECALLING PARAMETERS
          ======================================================== */}
          {activeTab === "calling" && (
            <div className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  Telecalling Targets & Queue Management
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Daily goals and routing rules for telecalling staff
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Daily Telecalling Target per Caller (Calls)
                  </label>
                  <input
                    type="number"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoNextLead}
                      onChange={(e) => setAutoNextLead(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Auto-advance to next candidate after saving call</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 5: NOTIFICATIONS
          ======================================================== */}
          {activeTab === "notifications" && (
            <div className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  Notifications & Audio Alerts
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Preferences for ringtones, reminder alerts and follow-up notices
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <span className="font-bold text-slate-800">Sound Alerts on Inbound Calls</span>
                    <p className="text-[11px] text-slate-500">Play Indian ringback tone when a candidate call connects</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <span className="font-bold text-slate-800">Email Digest to Owner</span>
                    <p className="text-[11px] text-slate-500">Send daily placement and call statistics summary at 7:00 PM</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
