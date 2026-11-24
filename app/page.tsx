"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users2,
  PhoneCall,
  CalendarClock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Upload,
  CheckCircle2,
  Briefcase,
  FileSpreadsheet,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { WEGROW_STAFF_MEMBERS } from "@/types";
import { UniversalImportModal } from "@/components/leads/UniversalImportModal";

export default function DashboardPage() {
  const { leads, followUps, activeUserRole } = useCRM();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const isOwner =
    activeUserRole === "Owner" ||
    activeUserRole === "Owner / MD" ||
    activeUserRole === "Admin" ||
    activeUserRole.includes("Admin") ||
    activeUserRole === "Gopinath (HR)" ||
    activeUserRole === "Vijayakumar";

  // Real-time statistics from active leads
  const stats = useMemo(() => {
    const totalCandidates = leads.length;

    // Count calls across all leads
    let totalCalls = 0;
    leads.forEach((l) => {
      totalCalls += l.callCount || (l.callHistory ? l.callHistory.length : 0);
    });

    // Shortlisted / Placed / Interested
    const shortlistedCount = leads.filter(
      (l) =>
        l.status === "Shortlisted" ||
        l.status === "Placed" ||
        l.status === "Interview Scheduled" ||
        l.stage === "Interview Scheduled"
    ).length;

    // Follow-ups pending
    const followUpsToday = followUps.filter(
      (f) => (f.status as string) === "Pending" || f.status === "Today" || f.status === "Overdue"
    ).length;

    return {
      totalCandidates,
      totalCalls,
      shortlistedCount,
      followUpsToday,
    };
  }, [leads, followUps]);

  // Telecaller Staff Breakdown
  const staffPerformance = useMemo(() => {
    return WEGROW_STAFF_MEMBERS.map((staff) => {
      const assigned = leads.filter((l) =>
        (l.assignedCaller || "").toLowerCase().includes(staff.toLowerCase())
      );
      let callsCount = 0;
      assigned.forEach((l) => {
        callsCount += l.callCount || (l.callHistory ? l.callHistory.length : 0);
      });
      const shortlisted = assigned.filter(
        (l) => l.status === "Shortlisted" || l.status === "Placed" || l.status === "Interview Scheduled"
      ).length;

      return {
        name: staff,
        assignedCount: assigned.length,
        callsCount,
        shortlisted,
        targetCalls: 100,
        percentage: Math.min(100, Math.round((callsCount / 100) * 100)),
      };
    });
  }, [leads]);

  // Recent Candidates (Top 6)
  const recentCandidates = useMemo(() => {
    return leads.slice(0, 6);
  }, [leads]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
              WeGrow Jobz Telecalling
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Hiring & Placements</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isOwner ? "Executive Placement Overview" : "Telecaller Calling Desk"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time candidate pipelines, telecaller logs, and interview conversions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>Import Candidates</span>
          </button>

          <Link
            href="/reports"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Daily Excel Report</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Candidates
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users2 className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats.totalCandidates}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-blue-700">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active Talent Pool</span>
          </div>
        </div>

        {/* Total Calls Made */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Calls Logged
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <PhoneCall className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats.totalCalls}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced from Mobile SIM</span>
          </div>
        </div>

        {/* Shortlisted / Placed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Shortlisted / Placed
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Award className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats.shortlistedCount}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-orange-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interviews & Offers</span>
          </div>
        </div>

        {/* Follow-ups Today */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Follow-ups Pending
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <CalendarClock className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats.followUpsToday}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-amber-700">
            <span>Scheduled Call Backs</span>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Telecaller Performance & Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Telecaller Performance Leaderboard */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Telecaller Team Performance
              </h2>
              <p className="text-xs text-slate-500">
                Daily target progress (100 calls/day per caller)
              </p>
            </div>
            <Link
              href="/calls"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Call History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {staffPerformance.map((staff, idx) => (
              <div
                key={staff.name}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {staff.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {staff.name}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ★ Top Caller
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {staff.assignedCount} candidates assigned • {staff.shortlisted} shortlisted
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">{staff.callsCount} calls</span>
                      <span className="text-slate-400">Target: 100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, staff.percentage)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-800 w-10 text-right">
                    {staff.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Quick Universal Importer Card */}
        <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-md shadow-blue-500/20">
              <Upload className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              Universal Candidate Importer
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Import hundreds of job candidates in 1 second from <strong>Excel (.xlsx)</strong>, <strong>CSV</strong>, <strong>Word (.docx)</strong>, or raw text paste.
            </p>

            <div className="space-y-2 bg-white/80 p-3 rounded-xl border border-blue-100 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Auto detects Name, Phone & College</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Assigns Job Domain (IT, BPO, Sales)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Instant sync to Mobile App</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <span>Open Candidate Importer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Recent Candidates Pool Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Job Candidates
            </h2>
            <p className="text-xs text-slate-500">
              Fresh candidate entries in WeGrow Jobz talent pool
            </p>
          </div>
          <Link
            href="/leads"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All ({leads.length})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Preferred Domain</th>
                <th className="py-3 px-4">Experience</th>
                <th className="py-3 px-4">Assigned Telecaller</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No candidates found. Click "Import Candidates" to add your first batch!
                  </td>
                </tr>
              ) : (
                recentCandidates.map((c) => {
                  const domain = (c as any).preferredDomain || c.courseInterested || "IT / Software";
                  const exp = (c as any).experienceYears || "Fresher";

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.studentName}
                        {c.collegeName && (
                          <span className="block text-[11px] font-normal text-slate-400">
                            {c.collegeName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {c.phone}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          <Briefcase className="w-3 h-3 text-indigo-500" />
                          {domain}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {exp}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {c.assignedCaller || "Unassigned"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {c.status || "Interested"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <a
                          href={`https://wa.me/91${(c.phone || "").replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hello ${c.studentName}, Greetings from WeGrow Jobz! We have exciting job placement opportunities for you.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Universal Candidate Importer Modal (Google Sheets, Excel, Text) */}
      <UniversalImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
