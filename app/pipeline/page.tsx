"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Phone,
  ArrowRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Percent,
  Layers,
  Building,
  Calendar,
  Sparkles,
  PhoneCall,
  Search,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { Lead } from "@/types";

interface JobStageConfig {
  stage: string;
  label: string;
  probability: number;
  color: string;
  badgeBg: string;
  headerBorder: string;
}

const JOB_STAGES: JobStageConfig[] = [
  {
    stage: "New Enquiry",
    label: "New Candidate",
    probability: 10,
    color: "text-blue-700",
    badgeBg: "bg-blue-50 border-blue-200",
    headerBorder: "border-blue-400",
  },
  {
    stage: "Contacted",
    label: "Contacted",
    probability: 25,
    color: "text-indigo-700",
    badgeBg: "bg-indigo-50 border-indigo-200",
    headerBorder: "border-indigo-400",
  },
  {
    stage: "Interested",
    label: "Interested",
    probability: 45,
    color: "text-emerald-700",
    badgeBg: "bg-emerald-50 border-emerald-200",
    headerBorder: "border-emerald-400",
  },
  {
    stage: "Profile Sent",
    label: "Profile Sent",
    probability: 60,
    color: "text-purple-700",
    badgeBg: "bg-purple-50 border-purple-200",
    headerBorder: "border-purple-400",
  },
  {
    stage: "Interview Scheduled",
    label: "Interview Scheduled",
    probability: 80,
    color: "text-amber-700",
    badgeBg: "bg-amber-50 border-amber-200",
    headerBorder: "border-amber-400",
  },
  {
    stage: "Shortlisted",
    label: "Shortlisted",
    probability: 90,
    color: "text-cyan-700",
    badgeBg: "bg-cyan-50 border-cyan-200",
    headerBorder: "border-cyan-400",
  },
  {
    stage: "Placed",
    label: "Placed (Won)",
    probability: 100,
    color: "text-emerald-800",
    badgeBg: "bg-emerald-100 border-emerald-400",
    headerBorder: "border-emerald-500",
  },
  {
    stage: "Lost",
    label: "Lost / Closed",
    probability: 0,
    color: "text-rose-700",
    badgeBg: "bg-rose-50 border-rose-200",
    headerBorder: "border-rose-400",
  },
];

// Approximate Placement Referral / Service value per candidate
const DOMAIN_VALUE_MAP: Record<string, number> = {
  "IT & Software Development": 25000,
  "Full Stack Development": 25000,
  "Python & AI / Data Science": 25000,
  "Digital Marketing & SEO": 20000,
  "Software Testing (QA)": 20000,
  "HR & Talent Acquisition": 18000,
  "Sales & Business Development": 18000,
  "Finance & Accounting": 18000,
};

const getCandidateDealValue = (domain?: string): number => {
  if (!domain) return 20000;
  for (const [key, val] of Object.entries(DOMAIN_VALUE_MAP)) {
    if (domain.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(domain.toLowerCase())) {
      return val;
    }
  }
  return 20000;
};

export default function JobzPipelinePage() {
  const { leads, updateLeadStatus, telecallers, activeUserRole, showToast, initiateCall } = useCRM();

  const isOwner = activeUserRole === "Owner" || activeUserRole === "Owner / MD" || activeUserRole === "Admin" || activeUserRole.includes("Admin") || activeUserRole === "Gopinath (HR)" || activeUserRole === "Vijayakumar";

  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedCaller, setSelectedCaller] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter leads according to domain, caller and search
  const filteredLeads = leads.filter((l) => {
    // If Telecaller, default to viewing only their candidates unless owner/admin
    if (!isOwner && l.assignedCaller && activeUserRole && l.assignedCaller !== activeUserRole) {
      // If role matches telecaller
      if (["Muthumeena"].includes(activeUserRole)) {
        return false;
      }
    }

    if (selectedDomain !== "All") {
      const dom = (l.preferredDomain || l.courseInterested || "").toLowerCase();
      if (!dom.includes(selectedDomain.toLowerCase())) return false;
    }

    if (selectedCaller !== "All" && l.assignedCaller !== selectedCaller) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (l.studentName || "").toLowerCase().includes(q);
      const matchPhone = (l.phone || "").includes(q);
      const matchDomain = (l.preferredDomain || l.courseInterested || "").toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchDomain) return false;
    }

    return true;
  });

  // Unique domains for filtering
  const allDomains = Array.from(
    new Set(
      leads
        .map((l) => l.preferredDomain || l.courseInterested)
        .filter(Boolean) as string[]
    )
  );

  // Pipeline Metric Calculations
  const totalPipelineCandidates = filteredLeads.length;

  const totalPipelineValue = filteredLeads.reduce((acc, lead) => {
    return acc + getCandidateDealValue(lead.preferredDomain || lead.courseInterested);
  }, 0);

  const weightedForecastRevenue = filteredLeads.reduce((acc, lead) => {
    const stage = lead.stage || lead.status;
    const stageObj = JOB_STAGES.find((s) => s.stage === stage) || JOB_STAGES[0];
    const prob = stageObj ? stageObj.probability : 20;
    const val = getCandidateDealValue(lead.preferredDomain || lead.courseInterested);
    return acc + (val * prob) / 100;
  }, 0);

  const placedCount = filteredLeads.filter(
    (l) => (l.stage || l.status) === "Placed"
  ).length;

  const placedValue = filteredLeads
    .filter((l) => (l.stage || l.status) === "Placed")
    .reduce((acc, lead) => acc + getCandidateDealValue(lead.preferredDomain || lead.courseInterested), 0);

  // Advance to next stage helper
  const getNextStage = (currentStage: string): string | null => {
    const stageIndex = JOB_STAGES.findIndex((s) => s.stage === currentStage);
    if (stageIndex >= 0 && stageIndex < JOB_STAGES.length - 2) {
      return JOB_STAGES[stageIndex + 1].stage;
    }
    return null;
  };

  const handleAdvanceStage = (leadId: string, currentStage: string) => {
    const next = getNextStage(currentStage);
    if (next) {
      updateLeadStatus(leadId, next as any, next as any);
      showToast({
        type: "success",
        title: "Candidate Advanced!",
        message: `Candidate moved to "${next}".`,
      });
    }
  };

  const handleMarkLost = (leadId: string) => {
    updateLeadStatus(leadId, "Lost" as any, "Lost" as any);
    showToast({
      type: "info",
      title: "Candidate Closed",
      message: "Candidate marked as Lost.",
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1700px] mx-auto min-h-screen bg-slate-50/50">
      {/* Header & Role Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  WeGrow Jobz Deals Pipeline
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-900 border border-amber-300">
                  Stage Conversion Probabilities
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Track candidate progression, interview conversions, and placement pipeline in real time.
              </p>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 w-44"
            />
          </div>

          {/* Domain Filter */}
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          >
            <option value="All">All Job Domains</option>
            {allDomains.map((dom) => (
              <option key={dom} value={dom}>
                {dom}
              </option>
            ))}
          </select>

          {/* Telecaller Filter (Available for Owner or all) */}
          {isOwner && (
            <select
              value={selectedCaller}
              onChange={(e) => setSelectedCaller(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
            >
              <option value="All">All Telecallers</option>
              {telecallers.map((caller) => {
                const callerName = typeof caller === "string" ? caller : (caller as any).name;
                const callerId = typeof caller === "string" ? caller : (caller as any).id || callerName;
                return (
                  <option key={callerId} value={callerName}>
                    {callerName}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </div>

      {/* Top 3 High-Impact KPI Summary Cards (Exactly as in user design) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Pipeline Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Pipeline Value
              </p>
              <p className="text-2xl font-black text-slate-900 mt-2">
                ₹{(totalPipelineValue / 100000).toFixed(2)} Lakhs
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {totalPipelineCandidates} Candidates
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Active candidates across all hiring stages</span>
          </div>
        </div>

        {/* Weighted Forecast Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Weighted Forecast Revenue
              </p>
              <p className="text-2xl font-black text-indigo-950 mt-2">
                ₹{(weightedForecastRevenue / 100000).toFixed(2)} Lakhs
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Prob Weighted
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600/80">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Expected realization based on stage % probability</span>
          </div>
        </div>

        {/* Closed-Won (Placed) */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Closed-Won (Placed Candidates)
              </p>
              <p className="text-2xl font-black text-emerald-900 mt-2">
                ₹{(placedValue / 100000).toFixed(2)} Lakhs
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {placedCount} Placed (100% Won)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Officially placed and onboarded successfully</span>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Kanban Columns */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-[1550px]">
          {JOB_STAGES.map((col) => {
            const stageLeads = filteredLeads.filter(
              (l) => (l.stage || l.status) === col.stage
            );

            const stageSum = stageLeads.reduce(
              (acc, l) => acc + getCandidateDealValue(l.preferredDomain || l.courseInterested),
              0
            );

            return (
              <div
                key={col.stage}
                className="w-72 shrink-0 flex flex-col bg-slate-100/70 rounded-2xl border border-slate-200/80 p-3"
              >
                {/* Column Header */}
                <div className={`p-3 bg-white rounded-xl border-t-4 ${col.headerBorder} border-x border-b border-slate-200/80 shadow-2xs mb-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Stage Value: <b className="text-slate-800">₹{(stageSum / 1000).toFixed(0)}k</b></span>
                    <span className="font-semibold text-slate-600">{col.probability}% Prob</span>
                  </div>
                </div>

                {/* Candidate Cards in this Stage */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[680px] pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/40">
                      <p className="text-xs text-slate-400">No candidates in this stage</p>
                    </div>
                  ) : (
                    stageLeads.map((cand) => {
                      const dealVal = getCandidateDealValue(cand.preferredDomain || cand.courseInterested);
                      const priorityColor =
                        cand.priority === "Hot"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : cand.priority === "Warm"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-50 text-slate-600 border-slate-200";

                      return (
                        <div
                          key={cand.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow duration-150 group relative"
                        >
                          {/* Name & Priority */}
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/leads/${cand.id}`}
                              className="text-xs font-bold text-slate-900 hover:text-orange-600 transition-colors line-clamp-1"
                            >
                              {cand.studentName || "Candidate"}
                            </Link>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${priorityColor}`}
                            >
                              • {cand.priority || "Warm"}
                            </span>
                          </div>

                          {/* Domain / Job Role */}
                          <p className="text-[11px] text-slate-600 font-medium mt-1 line-clamp-1 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                            {cand.preferredDomain || cand.courseInterested || "General Job Inquiry"}
                          </p>

                          {/* Phone & Location */}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                            <span className="font-mono">{cand.phone}</span>
                            <span>{cand.city || "Tamil Nadu"}</span>
                          </div>

                          {/* Deal Value Pill */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-400">
                              Val: <b className="text-slate-800">₹{(dealVal / 1000).toFixed(0)}k</b>
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[100px]">
                              👤 {cand.assignedCaller || "Unassigned"}
                            </span>
                          </div>

                          {/* Action Button: Advance Stage */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
                            {col.stage !== "Placed" && col.stage !== "Lost" ? (
                              <button
                                onClick={() => handleAdvanceStage(cand.id, col.stage)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors flex items-center gap-1 ml-auto"
                              >
                                <span>Advance</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 ml-auto flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Placed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
