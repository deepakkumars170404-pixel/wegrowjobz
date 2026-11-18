"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneOff,
  PhoneCall,
  Phone,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  RotateCcw,
  Smartphone,
  Zap,
  User,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { WEGROW_STAFF_MEMBERS, StaffMember } from "@/types";
import {
  FormConfigService,
  PostCallFormConfig,
  DEFAULT_DISPOSITION_OUTCOMES,
  DEFAULT_POST_CALL_FIELDS,
} from "@/utils/formConfigStorage";

export const LiveCallModal: React.FC = () => {
  const {
    activeCallLead,
    isCallModalOpen,
    isCallConnected,
    callPhase,
    callDuration,
    lastCallDuration,
    initiateCall,
    answerCall,
    endCallSession,
    closeCallModal,
    addCallRecord,
    updateLead,
    updateLeadStatus,
    addNewFollowUp,
    addToast,
  } = useCRM();

  // Dynamic Form Configuration
  const [formConfig, setFormConfig] = useState<PostCallFormConfig>({
    outcomes: DEFAULT_DISPOSITION_OUTCOMES,
    fields: DEFAULT_POST_CALL_FIELDS,
  });

  // Staff Selection (Who Took The Call?)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember>("MuthuSelvi");

  // Disposition Outcome
  const [outcome, setOutcome] = useState("Interested");

  // Dynamic field values
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [nextFollowUpTime, setNextFollowUpTime] = useState("11:00 AM");
  const [isDialing, setIsDialing] = useState(false);

  // Load config on mount & listen to settings updates
  useEffect(() => {
    const loadCfg = () => {
      const cfg = FormConfigService.getConfig();
      setFormConfig(cfg);
    };
    loadCfg();

    if (typeof window !== "undefined") {
      window.addEventListener("wegrow_form_config_updated", loadCfg);
      return () => window.removeEventListener("wegrow_form_config_updated", loadCfg);
    }
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!isCallModalOpen || !activeCallLead) return;

    // Default follow-up date: Tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setNextFollowUpDate(`${yyyy}-${mm}-${dd}`);

    if (
      activeCallLead.assignedCaller &&
      (WEGROW_STAFF_MEMBERS as readonly string[]).includes(activeCallLead.assignedCaller)
    ) {
      setSelectedStaff(activeCallLead.assignedCaller as StaffMember);
    }

    // Pre-populate candidate existing details into dynamic fields
    setFieldValues({
      remarks: "",
      preferredDomain: activeCallLead.preferredDomain || activeCallLead.courseInterested || "",
      experienceYears: activeCallLead.experienceYears || "Fresher (0 - 6 Months)",
      expectedSalary: activeCallLead.expectedSalary || "",
      noticePeriod: activeCallLead.noticePeriod || "Immediate",
      currentCompany: activeCallLead.currentCompany || "",
      currentCity: activeCallLead.city || activeCallLead.currentCity || "",
    });

    setOutcome("Interested");
  }, [isCallModalOpen, activeCallLead]);

  const handleRedial = () => {
    if (!activeCallLead) return;
    setIsDialing(true);
    initiateCall(activeCallLead);
    setTimeout(() => setIsDialing(false), 1200);
  };

  const handleHangup = () => {
    endCallSession();
  };

  const handleSetQuickDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    setNextFollowUpDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleFieldValueChange = (fieldId: string, val: any) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleSaveCallRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCallLead) return;

    const finalDuration = lastCallDuration || (callDuration > 0 ? formatTimer(callDuration) : "00:00");
    const rawDur = String(finalDuration || "").replace(/[^\d:]/g, "");
    let isSpoken = false;
    if (rawDur.includes(":")) {
      const [m, s] = rawDur.split(":").map(Number);
      isSpoken = (m || 0) > 0 || (s || 0) > 0;
    } else {
      const num = parseInt(rawDur, 10);
      isSpoken = !isNaN(num) && num > 0;
    }
    const callOutcome = isSpoken ? "Attended Call" : "Not Attended Call";

    const remarksText = fieldValues["remarks"] || `Job candidate call handled by ${selectedStaff}. Outcome: ${outcome}`;

    // 1. Log the call record
    addCallRecord(activeCallLead.id, {
      callerName: selectedStaff,
      outcome: callOutcome,
      mindset: outcome,
      duration: finalDuration,
      remarks: remarksText,
      nextFollowUpDate: nextFollowUpDate,
      nextFollowUpTime: nextFollowUpTime,
      studentName: activeCallLead.studentName,
      preferredDomain: fieldValues["preferredDomain"] || activeCallLead.preferredDomain,
      experienceYears: fieldValues["experienceYears"] || activeCallLead.experienceYears,
      expectedSalary: fieldValues["expectedSalary"] || activeCallLead.expectedSalary,
    });

    // 2. Update Lead candidate fields if modified during call
    const leadUpdates: any = {
      assignedCaller: selectedStaff,
      lastCallOutcome: outcome,
      lastCallDate: new Date().toISOString().split("T")[0],
    };

    if (fieldValues["preferredDomain"]) leadUpdates.preferredDomain = fieldValues["preferredDomain"];
    if (fieldValues["experienceYears"]) leadUpdates.experienceYears = fieldValues["experienceYears"];
    if (fieldValues["expectedSalary"]) leadUpdates.expectedSalary = fieldValues["expectedSalary"];
    if (fieldValues["noticePeriod"]) leadUpdates.noticePeriod = fieldValues["noticePeriod"];
    if (fieldValues["currentCompany"]) leadUpdates.currentCompany = fieldValues["currentCompany"];
    if (fieldValues["currentCity"]) leadUpdates.city = fieldValues["currentCity"];

    updateLead(activeCallLead.id, leadUpdates);

    // 3. Update Pipeline Status based on outcome
    if (outcome.includes("Placed") || outcome.includes("Hired")) {
      updateLeadStatus(activeCallLead.id, "Placed", "Placed");
    } else if (outcome.includes("Shortlisted")) {
      updateLeadStatus(activeCallLead.id, "Shortlisted", "Shortlisted");
    } else if (outcome.includes("Interview")) {
      updateLeadStatus(activeCallLead.id, "Interview Scheduled", "Interview Scheduled");
    } else if (outcome === "Interested") {
      updateLeadStatus(activeCallLead.id, "Interested", "Interested");
    } else if (outcome.includes("Call Later") || outcome.includes("Callback")) {
      updateLeadStatus(activeCallLead.id, "Call Later", "Contacted");
    } else if (outcome.includes("Not Interested")) {
      updateLeadStatus(activeCallLead.id, "Lost", "Lost");
    } else if (outcome.includes("Busy") || outcome.includes("Wrong Number")) {
      updateLeadStatus(activeCallLead.id, "Busy", "Contacted");
    }

    // 4. Schedule Follow-up if needed
    if (nextFollowUpDate) {
      addNewFollowUp({
        leadId: activeCallLead.id,
        studentName: activeCallLead.studentName,
        phone: activeCallLead.phone,
        course: fieldValues["preferredDomain"] || activeCallLead.preferredDomain || activeCallLead.courseInterested,
        assignedCaller: selectedStaff,
        lastContacted: "Today",
        followUpDate: nextFollowUpDate,
        followUpTime: nextFollowUpTime,
        status: "Upcoming",
        priority: activeCallLead.priority,
        remarks: remarksText,
      });
    }

    addToast(`Call record & disposition saved by ${selectedStaff} for ${activeCallLead.studentName}!`, "success");
    closeCallModal();
  };

  if (!isCallModalOpen || !activeCallLead) {
    return null;
  }

  const cleanPhone = activeCallLead.phone.replace(/[^0-9+]/g, "");
  const activeOutcomes = formConfig.outcomes.filter((o) => o.isActive);
  const activeFields = formConfig.fields.filter((f) => f.enabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-[500px] overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Softphone Top Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-5 py-4 flex items-center justify-between select-none shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Briefcase className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">WeGrow Jobz Telecaller</span>
                <span className="text-[10px] bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full">
                  Live Placement Desk
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium">
                {activeCallLead.studentName} • {activeCallLead.preferredDomain || "Job Candidate"}
              </p>
            </div>
          </div>

          <button
            onClick={closeCallModal}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase 1 & 2: Active / Ringing Call Session */}
        {(callPhase === "ringing" || callPhase === "connected") && (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center animate-pulse">
                <Phone className="w-9 h-9 text-blue-600" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">{activeCallLead.studentName}</h3>
              <p className="text-sm font-semibold text-slate-500">{activeCallLead.phone}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{callPhase === "connected" ? `Live Call: ${formatTimer(callDuration)}` : "Calling / Ringing SIM..."}</span>
              </div>
            </div>

            {/* Hangup Button */}
            <button
              type="button"
              onClick={handleHangup}
              className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End Call (Proceed to Disposition)</span>
            </button>
          </div>
        )}

        {/* Phase 3: Post-Call Disposition Form (Configured by Admin) */}
        {(callPhase === "ended" || callPhase === "idle") && (
          <>
            {/* Call Duration Notice Banner */}
            <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-xs">
                  Call Finished • Spoke for {lastCallDuration || (callDuration > 0 ? formatTimer(callDuration) : "00:00")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRedial}
                className="text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 hover:bg-emerald-50 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Redial</span>
              </button>
            </div>

            {/* Content Body: Dynamic Form */}
            <form onSubmit={handleSaveCallRecord} className="p-6 pt-3 overflow-y-auto space-y-4 text-xs flex-1">
              {/* 1. Staff Member Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-900">
                    1. Telecaller Staff (Who Attended?):
                  </label>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    👤 {selectedStaff}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {WEGROW_STAFF_MEMBERS.map((staff) => {
                    const isSelected = selectedStaff === staff;
                    return (
                      <button
                        key={staff}
                        type="button"
                        onClick={() => setSelectedStaff(staff)}
                        className={`py-2 px-2.5 rounded-xl border text-center font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20 font-black"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{staff}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Candidate Call Outcome / Disposition Mindset */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-900">
                    2. Call Outcome & Placement Disposition:
                  </label>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {outcome}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeOutcomes.map((m) => {
                    const isSelected = outcome === m.label || outcome === m.key;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setOutcome(m.label)}
                        className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm font-black ring-2 ring-blue-500/20"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span>{m.icon}</span>
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Follow-up Date/Time if enabled */}
              {activeFields.some((f) => f.id === "nextFollowUp") && (
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      📅 Schedule Next Follow-up
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetQuickDate(1)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetQuickDate(3)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                      >
                        +3 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetQuickDate(7)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                      >
                        +1 Week
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    <select
                      value={nextFollowUpTime}
                      onChange={(e) => setNextFollowUpTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:30 PM">05:30 PM</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 4. Render All Enabled Dynamic Form Fields (Configured in Admin Settings) */}
              {activeFields
                .filter((f) => f.id !== "nextFollowUp")
                .map((field) => {
                  const val = fieldValues[field.id] || "";

                  if (field.type === "textarea") {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <textarea
                          rows={2}
                          value={val}
                          required={field.required}
                          onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                          placeholder={field.placeholder || "Enter notes..."}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium"
                        />
                      </div>
                    );
                  }

                  if (field.type === "select" && field.options) {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                          value={val}
                          required={field.required}
                          onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                        >
                          <option value="">Select option...</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.id}>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={val}
                        required={field.required}
                        onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ""}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      />
                    </div>
                  );
                })}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeCallModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-orange-300" />
                  <span>Save Call Disposition</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
