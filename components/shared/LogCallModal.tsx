"use client";

import React, { useState, useEffect } from "react";
import { X, FileText, CheckCircle2, User, Sparkles, Briefcase } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { Lead, WEGROW_STAFF_MEMBERS, StaffMember } from "@/types";
import {
  FormConfigService,
  PostCallFormConfig,
  DEFAULT_DISPOSITION_OUTCOMES,
  DEFAULT_POST_CALL_FIELDS,
} from "@/utils/formConfigStorage";

interface LogCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const LogCallModal: React.FC<LogCallModalProps> = ({ isOpen, onClose, lead }) => {
  const {
    addCallRecord,
    updateLead,
    updateLeadStatus,
    addNewFollowUp,
    addToast,
    activeUserRole,
  } = useCRM();

  const [formConfig, setFormConfig] = useState<PostCallFormConfig>({
    outcomes: DEFAULT_DISPOSITION_OUTCOMES,
    fields: DEFAULT_POST_CALL_FIELDS,
  });

  const [selectedStaff, setSelectedStaff] = useState<StaffMember>("MuthuSelvi");
  const [outcome, setOutcome] = useState("Interested");
  const [remarks, setRemarks] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [nextFollowUpTime, setNextFollowUpTime] = useState("11:00 AM");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("Immediate");
  const [callDurationInput, setCallDurationInput] = useState("02:00");

  useEffect(() => {
    if (!isOpen || !lead) return;

    // Load admin form config
    const cfg = FormConfigService.getConfig();
    setFormConfig(cfg);

    // Default follow-up date: Tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setNextFollowUpDate(`${yyyy}-${mm}-${dd}`);

    if (
      lead.assignedCaller &&
      (WEGROW_STAFF_MEMBERS as readonly string[]).includes(lead.assignedCaller)
    ) {
      setSelectedStaff(lead.assignedCaller as StaffMember);
    } else if (activeUserRole && (WEGROW_STAFF_MEMBERS as readonly string[]).includes(activeUserRole)) {
      setSelectedStaff(activeUserRole as StaffMember);
    }

    setRemarks("");
    setExpectedSalary(lead.expectedSalary || "");
    setNoticePeriod(lead.noticePeriod || "Immediate");
    setOutcome("Interested");
  }, [isOpen, lead, activeUserRole]);

  if (!isOpen || !lead) return null;

  const activeOutcomes = formConfig.outcomes.filter((o) => o.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const today = new Date().toISOString().split("T")[0];
    const finalRemarks = remarks.trim() || `Call logged by ${selectedStaff}. Outcome: ${outcome}`;

    // 1. Log call record
    addCallRecord(lead.id, {
      callerName: selectedStaff,
      outcome: "Attended Call",
      mindset: outcome,
      duration: callDurationInput || "02:00",
      remarks: finalRemarks,
      nextFollowUpDate: nextFollowUpDate,
      nextFollowUpTime: nextFollowUpTime,
      studentName: lead.studentName,
      preferredDomain: lead.preferredDomain || lead.courseInterested,
      experienceYears: lead.experienceYears,
      expectedSalary: expectedSalary || lead.expectedSalary,
    });

    // 2. Update Lead candidate fields
    const leadUpdates: any = {
      assignedCaller: selectedStaff,
      lastCallOutcome: outcome,
      lastCallDate: today,
    };
    if (expectedSalary) leadUpdates.expectedSalary = expectedSalary;
    if (noticePeriod) leadUpdates.noticePeriod = noticePeriod;
    updateLead(lead.id, leadUpdates);

    // 3. Update Pipeline Status based on outcome
    if (outcome.includes("Placed") || outcome.includes("Hired")) {
      updateLeadStatus(lead.id, "Placed", "Placed");
    } else if (outcome.includes("Shortlisted")) {
      updateLeadStatus(lead.id, "Shortlisted", "Shortlisted");
    } else if (outcome.includes("Interview")) {
      updateLeadStatus(lead.id, "Interview Scheduled", "Interview Scheduled");
    } else if (outcome === "Interested") {
      updateLeadStatus(lead.id, "Interested", "Interested");
    } else if (outcome.includes("Call Later") || outcome.includes("Callback")) {
      updateLeadStatus(lead.id, "Call Later", "Contacted");
    } else if (outcome.includes("Not Interested")) {
      updateLeadStatus(lead.id, "Lost", "Lost");
    } else if (outcome.includes("Busy") || outcome.includes("Wrong Number")) {
      updateLeadStatus(lead.id, "Busy", "Contacted");
    }

    // 4. Schedule Follow-up if date is set
    if (nextFollowUpDate) {
      addNewFollowUp({
        leadId: lead.id,
        studentName: lead.studentName,
        phone: lead.phone,
        course: lead.preferredDomain || lead.courseInterested,
        assignedCaller: selectedStaff,
        lastContacted: "Today",
        followUpDate: nextFollowUpDate,
        followUpTime: nextFollowUpTime,
        status: "Upcoming",
        priority: lead.priority,
        remarks: finalRemarks,
      });
    }

    addToast(`Call log & remarks saved for ${lead.studentName}!`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between select-none shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <FileText className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">Log Candidate Call & Remarks</span>
                <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">
                  WeGrow Jobz
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium">
                {lead.studentName} • {lead.phone} ({lead.preferredDomain || "Job Candidate"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {/* Staff Member Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-900">
                1. Telecaller Staff (Who Spoke?):
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

          {/* Disposition Outcome */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-900">
                2. Placement Call Outcome:
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

          {/* Remarks / Discussion Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              3. Call Discussion & Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Candidate is interested in React Developer position. Has 1 year experience, agreed to attend client interview on Friday..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium"
            />
          </div>

          {/* Follow-up Scheduling */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              📅 Next Follow-up Date & Time (Optional)
            </label>
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
                <option value="11:00 AM">11:00 AM</option>
                <option value="02:30 PM">02:30 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="05:30 PM">05:30 PM</option>
              </select>
            </div>
          </div>

          {/* CTC & Notice Period updates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Expected Salary (Monthly)
              </label>
              <input
                type="text"
                placeholder="e.g. ₹25,000 / month"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Notice Period
              </label>
              <select
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
              >
                <option value="Immediate">Immediate Joiner</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="Serving Notice">Serving Notice</option>
              </select>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-orange-300" />
              <span>Save Call Log & Notes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
