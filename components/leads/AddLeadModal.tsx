"use client";

import React, { useState } from "react";
import { X, UserPlus, Briefcase, Sparkles, Building2, Phone, Mail, MapPin, DollarSign, Clock, Award } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { LeadPriority, LeadStatus, WEGROW_STAFF_MEMBERS } from "@/types";
import { WEGROW_JOB_DOMAINS, ALL_JOB_ROLES } from "@/data/job-domains";
import { ALL_INDIA_COLLEGES_LIST } from "@/data/academic-data";

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose }) => {
  const { addLead, telecallers, addToast } = useCRM();

  const [candidateName, setCandidateName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredDomain, setPreferredDomain] = useState(WEGROW_JOB_DOMAINS[0]?.name || "Full Stack Developer");
  const [experienceYears, setExperienceYears] = useState("Fresher (0 - 6 Months)");
  const [expectedSalary, setExpectedSalary] = useState("₹20,000 - ₹30,000 / month");
  const [noticePeriod, setNoticePeriod] = useState("Immediate");
  const [currentCompany, setCurrentCompany] = useState("");
  const [city, setCity] = useState("Chennai");
  const [qualification, setQualification] = useState("B.E / B.Tech");
  const [collegeName, setCollegeName] = useState("");
  const [passedOutYear, setPassedOutYear] = useState("2025");
  const [leadSource, setLeadSource] = useState<any>("Job Portal");
  const [assignedCaller, setAssignedCaller] = useState<string>(WEGROW_STAFF_MEMBERS[0] || "MuthuSelvi");
  const [priority, setPriority] = useState<LeadPriority>("Hot");
  const [status, setStatus] = useState<LeadStatus>("New");
  const [skillsNotes, setSkillsNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !phone.trim()) {
      addToast("Candidate name and phone number are required.", "warning");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    addLead({
      studentName: candidateName.trim(),
      phone: phone.trim(),
      email: email.trim() || `${candidateName.trim().toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      courseInterested: preferredDomain,
      preferredDomain,
      experienceYears,
      expectedSalary,
      noticePeriod,
      currentCompany: currentCompany.trim() || "Looking for Job",
      leadSource,
      assignedCaller,
      priority,
      status,
      enquiryDate: today,
      nextFollowUpDate: today,
      nextFollowUpTime: "11:00 AM",
      city,
      qualification,
      collegeName: collegeName.trim() || undefined,
      passedOutYear,
      notes: skillsNotes.trim()
        ? [
            {
              id: "nt-" + Date.now(),
              author: assignedCaller,
              timestamp: "Just now",
              content: `Registered as ${preferredDomain} candidate (${experienceYears}). Notes: ${skillsNotes.trim()}`,
            },
          ]
        : [],
    });

    addToast(`Candidate ${candidateName} successfully added to WeGrow Jobz!`, "success");

    // Reset and close
    setCandidateName("");
    setPhone("");
    setEmail("");
    setCurrentCompany("");
    setSkillsNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header - WeGrow Jobz Light Theme */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Briefcase className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Add New Job Candidate
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">
                  WeGrow Jobz
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Register candidate for recruitment, interview screening & placement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Candidate Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Candidate Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Karthik Raja"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Target Domain / Job Role & Experience Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Domain / Job Role <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="all-job-roles"
                placeholder="Type letter to search jobs (e.g. Python, Full Stack)..."
                value={preferredDomain}
                onChange={(e) => setPreferredDomain(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
              <datalist id="all-job-roles">
                {ALL_JOB_ROLES.map((role, idx) => (
                  <option key={idx} value={role} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Experience Level
              </label>
              <select
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              >
                <option value="Fresher (0 - 6 Months)">Fresher (0 - 6 Months)</option>
                <option value="1 Year Experience">1 Year Experience</option>
                <option value="2 Years Experience">2 Years Experience</option>
                <option value="3 - 5 Years Experience">3 - 5 Years Experience</option>
                <option value="5+ Years Senior">5+ Years Senior</option>
              </select>
            </div>
          </div>

          {/* Row 3: Expected Salary & Notice Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expected Salary (Monthly CTC)
              </label>
              <input
                type="text"
                placeholder="e.g. ₹25,000 / month"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notice Period / Availability
              </label>
              <select
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              >
                <option value="Immediate">Immediate Joiner</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days (1 Month)</option>
                <option value="Currently Employed / Serving Notice">Currently Serving Notice</option>
              </select>
            </div>
          </div>

          {/* Row 4: Email & Current Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="karthik@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Company / Status
              </label>
              <input
                type="text"
                placeholder="e.g. Looking for Job / Freelance"
                value={currentCompany}
                onChange={(e) => setCurrentCompany(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>
          </div>

          {/* Row 5: Lead Source & Assign Telecaller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lead Source
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              >
                <option value="Job Portal">Job Portal (Naukri / Indeed)</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Job Search App">Job Search App</option>
                <option value="Website">WeGrow Website</option>
                <option value="Walk-in">Direct Walk-in</option>
                <option value="Referral">Staff Referral</option>
                <option value="Phone">Direct Inbound Call</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assign Telecaller
              </label>
              <select
                value={assignedCaller}
                onChange={(e) => setAssignedCaller(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              >
                {WEGROW_STAFF_MEMBERS.map((staff) => (
                  <option key={staff} value={staff}>
                    {staff} (Telecaller)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Priority & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Candidate Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Hot", "Warm", "Cold"] as LeadPriority[]).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        isSelected
                          ? p === "Hot"
                            ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20"
                            : p === "Warm"
                            ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20"
                            : "bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-500/20"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {p === "Hot" ? "🔥 Hot" : p === "Warm" ? "⭐ Warm" : "❄️ Cold"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Initial Pipeline Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              >
                <option value="New">New Candidate</option>
                <option value="Interested">Interested</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Placed">Placed</option>
                <option value="Call Later">Call Later</option>
              </select>
            </div>
          </div>

          {/* Row 7: Location & Qualification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current City / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Chennai, Bangalore, Madurai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Highest Qualification
              </label>
              <input
                type="text"
                placeholder="e.g. B.Tech IT 2024 / MCA / MBA"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>
          </div>

          {/* College / University Name Autocomplete */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              College / University Name (All-India Search)
            </label>
            <input
              type="text"
              list="all-india-colleges"
              placeholder="Type letter to search Colleges (e.g. Mepco, ANJAC, Anna University, IIT)..."
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
            />
            <datalist id="all-india-colleges">
              {ALL_INDIA_COLLEGES_LIST.map((col, idx) => (
                <option key={idx} value={col} />
              ))}
            </datalist>
          </div>

          {/* Row 8: Key Skills / Initial Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Skills, Resume Summary & Screening Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Good in React and JavaScript. Looking for Immediate Joining in Chennai with ₹25k budget..."
              value={skillsNotes}
              onChange={(e) => setSkillsNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none font-medium"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-orange-300" />
              <span>Save Candidate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
