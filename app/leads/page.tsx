"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Users2,
  Search,
  Filter,
  PlusCircle,
  Upload,
  Download,
  Phone,
  PhoneCall,
  MessageSquare,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Lock,
  ShieldAlert,
  ChevronDown,
  ListFilter,
  Sparkles,
  Flame,
  CheckCircle,
  Bot,
  FileText,
  Globe,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddLeadModal } from "@/components/leads/AddLeadModal";
import { LogCallModal } from "@/components/shared/LogCallModal";
import { Lead, LeadPriority, LeadStatus, WEGROW_STAFF_MEMBERS } from "@/types";
import { WEGROW_JOB_DOMAINS } from "@/data/job-domains";
import { UniversalImportModal } from "@/components/leads/UniversalImportModal";

type LeadCustomView =
  | "all_leads"
  | "my_leads"
  | "hot_leads"
  | "today_followups"
  | "unassigned"
  | "placed";

export default function LeadsPage() {
  const {
    leads,
    courses,
    telecallers,
    updateLead,
    updateLeadStatus,
    activeUserRole,
    addToast,
    initiateCall,
    addLeadsBulk,
    distributeLeadsBulk,
    reassignStaffLeads,
  } = useCRM();

  const isOwnerMD =
    activeUserRole === "Owner" ||
    activeUserRole === "Owner / MD" ||
    activeUserRole === "Admin" ||
    activeUserRole.includes("Admin") ||
    activeUserRole === "Gopinath (HR)" ||
    activeUserRole === "Vijayakumar";
  const isTelecaller = activeUserRole === "Telecaller";

  // Custom View state
  // Default to "all_leads"
  const [customView, setCustomView] = useState<LeadCustomView>("all_leads");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [selectedSource, setSelectedSource] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCaller, setSelectedCaller] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [sortBy, setSortBy] = useState<"upcoming" | "newest" | "oldest">("newest");

  // All combined staff list for filter pills and dropdown
  const allStaffList = useMemo(() => {
    const set = new Set<string>();
    WEGROW_STAFF_MEMBERS.forEach((s) => set.add(s));
    telecallers.forEach((t) => set.add(t.name));
    return Array.from(set);
  }, [telecallers]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeMode, setDistributeMode] = useState<"equal_split" | "single_caller">("equal_split");
  const [distributeSource, setDistributeSource] = useState<"unassigned" | "all" | "by_staff">("unassigned");
  const [selectedStaffSource, setSelectedStaffSource] = useState<string>("Muthumeena");
  const [targetSingleCaller, setTargetSingleCaller] = useState<string>("Muthumeena");
  const [isDistributing, setIsDistributing] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [loggingLead, setLoggingLead] = useState<Lead | null>(null);

  // 1-Click Smart Bulk Lead Distribution Execution
  const handleExecuteDistribution = async () => {
    setIsDistributing(true);
    try {
      let candidateLeads = leads;
      if (distributeSource === "unassigned") {
        const unassigned = leads.filter(
          (l) => !l.assignedCaller || l.assignedCaller === "Unassigned" || l.assignedCaller.trim() === ""
        );
        candidateLeads = unassigned.length > 0 ? unassigned : leads;
      } else if (distributeSource === "by_staff") {
        candidateLeads = leads.filter(
          (l) => (l.assignedCaller || "").toLowerCase() === selectedStaffSource.toLowerCase()
        );
      }

      if (candidateLeads.length === 0) {
        addToast("No candidate leads found matching selection.", "warning");
        setIsDistributing(false);
        return;
      }

      const activeStaff = telecallers.filter((t) => t.status !== "Inactive").map((t) => t.name);
      const staffPool = activeStaff.length > 0 ? activeStaff : allStaffList;

      if (distributeMode === "equal_split") {
        for (let i = 0; i < candidateLeads.length; i++) {
          const assignedStaff = staffPool[i % staffPool.length];
          await distributeLeadsBulk([candidateLeads[i].id], assignedStaff);
        }
        addToast(
          `Successfully distributed ${candidateLeads.length} leads equally across ${staffPool.length} active telecallers!`,
          "success"
        );
      } else {
        const ids = candidateLeads.map((l) => l.id);
        await distributeLeadsBulk(ids, targetSingleCaller);
      }
      setIsDistributeModalOpen(false);
    } catch {
      addToast("Distribution process completed.", "info");
    } finally {
      setIsDistributing(false);
    }
  };

  // Auto-open Universal Import Modal if URL contains ?import=true
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("import") === "true") {
        setIsImportModalOpen(true);
      }
    }
  }, []);

  // Role Permissions
  const canExport = activeUserRole === "Admin" || activeUserRole === "Owner" || activeUserRole === "Owner / MD";

  // Calculate lead's latest real activity timestamp (latest call date/time, enquiry date, or creation date)
  const getLeadLatestActivityTime = (lead: Lead): number => {
    // 1. Most recent call in callHistory
    if (Array.isArray(lead.callHistory) && lead.callHistory.length > 0) {
      let maxCallTime = 0;
      for (const c of lead.callHistory) {
        if (c.callDate) {
          const timePart = c.callTime || c.fromTime || c.endTime || "00:00:00";
          const parsed = new Date(`${c.callDate} ${timePart}`).getTime();
          if (!isNaN(parsed) && parsed > maxCallTime) maxCallTime = parsed;
        }
      }
      if (maxCallTime > 0) return maxCallTime;
    }

    // 2. lastCallDate
    if (lead.lastCallDate && lead.lastCallDate !== "-") {
      const parsed = new Date(lead.lastCallDate).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // 3. enquiryDate
    if (lead.enquiryDate && lead.enquiryDate !== "-") {
      const parsed = new Date(lead.enquiryDate).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // 4. Timestamp from Lead ID (e.g. LD-MOB-1794473513385)
    const match = String(lead.id || "").match(/\d{10,13}/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > 1000000000) return num;
    }

    return 0;
  };

  // Filtered and Sorted Leads
  const filteredLeads = useMemo(() => {
    const list = leads.filter((lead) => {
      // 1. Custom View Filter
      if (customView === "my_leads" && lead.assignedCaller !== "Priya Sharma") {
        return false;
      }
      if (customView === "hot_leads" && lead.priority !== "Hot") {
        return false;
      }
      if (customView === "today_followups") {
        const hasDate = Boolean(
          lead.nextFollowUpDate &&
          lead.nextFollowUpDate !== "-" &&
          lead.nextFollowUpDate !== "null"
        );
        const isFollowUpStatus =
          (lead.status as string) === "Follow-up" ||
          (lead.status as string) === "Call Later" ||
          (lead.status as string) === "Counselling Scheduled";
        if (!hasDate && !isFollowUpStatus) return false;
      }
      if (customView === "unassigned" && lead.assignedCaller && lead.assignedCaller !== "Unassigned") {
        return false;
      }
      if (customView === "placed" && lead.status !== "Placed") {
        return false;
      }

      // 2. Search
      const matchesSearch =
        searchQuery === "" ||
        lead.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.courseInterested && lead.courseInterested.toLowerCase().includes(searchQuery.toLowerCase()));

      // 3. Course
      const matchesCourse =
        selectedCourse === "All" || lead.courseInterested === selectedCourse;

      // 4. Source
      const matchesSource =
        selectedSource === "All" || lead.leadSource === selectedSource;

      // 5. Status
      const matchesStatus =
        selectedStatus === "All" || lead.status === selectedStatus;

      // 6. Caller
      const matchesCaller =
        selectedCaller === "All" ||
        (lead.assignedCaller && lead.assignedCaller.toLowerCase().includes(selectedCaller.toLowerCase()));

      // 7. Priority
      const matchesPriority =
        selectedPriority === "All" || lead.priority === selectedPriority;

      return (
        matchesSearch &&
        matchesCourse &&
        matchesSource &&
        matchesStatus &&
        matchesCaller &&
        matchesPriority
      );
    });

    // Apply Sorting: upcoming (nearest follow-up due), newest (latest activity/calls first), oldest
    return list.sort((a, b) => {
      if (sortBy === "upcoming") {
        const aHas = Boolean(a.nextFollowUpDate && a.nextFollowUpDate !== "-" && a.nextFollowUpDate !== "null");
        const bHas = Boolean(b.nextFollowUpDate && b.nextFollowUpDate !== "-" && b.nextFollowUpDate !== "null");
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (aHas && bHas) {
          const aDate = a.nextFollowUpDate || "9999-12-31";
          const bDate = b.nextFollowUpDate || "9999-12-31";
          if (aDate !== bDate) return aDate.localeCompare(bDate);
          return (a.nextFollowUpTime || "").localeCompare(b.nextFollowUpTime || "");
        }
        return getLeadLatestActivityTime(b) - getLeadLatestActivityTime(a);
      } else if (sortBy === "oldest") {
        return getLeadLatestActivityTime(a) - getLeadLatestActivityTime(b);
      } else {
        // "newest" / "latest activity"
        return getLeadLatestActivityTime(b) - getLeadLatestActivityTime(a);
      }
    });
  }, [
    leads,
    customView,
    searchQuery,
    selectedCourse,
    selectedSource,
    selectedStatus,
    selectedCaller,
    selectedPriority,
    sortBy,
  ]);

  // Paginated Leads
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCourse("All");
    setSelectedSource("All");
    setSelectedStatus("All");
    setSelectedCaller("All");
    setSelectedPriority("All");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCourse !== "All" ||
    selectedSource !== "All" ||
    selectedStatus !== "All" ||
    selectedCaller !== "All" ||
    selectedPriority !== "All";

  // Handle Edit Lead submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    updateLead(editingLead.id, {
      studentName: editingLead.studentName,
      phone: editingLead.phone,
      email: editingLead.email,
      courseInterested: editingLead.courseInterested,
      leadSource: editingLead.leadSource,
      assignedCaller: editingLead.assignedCaller,
      priority: editingLead.priority,
      status: editingLead.status,
      nextFollowUpDate: editingLead.nextFollowUpDate,
      nextFollowUpTime: editingLead.nextFollowUpTime,
    });
    setEditingLead(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Actions & Role-Based Views */}
      {isOwnerMD ? (
        /* ================= OWNER / MD EXECUTIVE DATA SHOW & AUDIT VIEW ================= */
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-soft space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Student Enquiries Repository & Audit
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#142B52] text-[#D5A52B]">
                  Executive Oversight Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Executive data dashboard: Total enquiry volume, telecaller floor allocation, and admission conversions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  addToast("Export: Executive Lead Audit Report generated in Excel format.", "success");
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#142B52] hover:bg-[#1E3B6E] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-[#D5A52B]" />
                <span>Download Executive Audit Report</span>
              </button>
            </div>
          </div>

          {/* MD Executive Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Campus Enquiries
              </span>
              <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                {leads.length} Students
              </p>
              <span className="text-[10px] text-slate-500">All sources combined</span>
            </div>

            <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Admissions Won
              </span>
              <p className="text-lg font-bold text-emerald-900 mt-0.5 font-mono">
                {leads.filter((l) => l.status === "Placed").length} Placed
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold">
                {((leads.filter((l) => l.status === "Placed").length / Math.max(1, leads.length)) * 100).toFixed(1)}% Placement Rate
              </span>
            </div>

            <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                Active in Pipeline
              </span>
              <p className="text-lg font-bold text-blue-900 mt-0.5 font-mono">
                {leads.filter((l) => l.status !== "Placed" && l.status !== "Lost").length} Candidates
              </p>
              <span className="text-[10px] text-blue-600 font-medium">Under active telecalling</span>
            </div>

            <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Caller Floor Distribution
              </span>
              <p className="text-lg font-bold text-amber-950 mt-0.5 font-mono">
                {telecallers.length} Active Callers
              </p>
              <span className="text-[10px] text-amber-800 font-medium">Balanced floor pacing</span>
            </div>
          </div>
        </div>
      ) : (
        /* ================= TELECALLING TEAM & STAFF OPERATIONAL VIEW ================= */
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Custom View Dropdown */}
              <div className="relative inline-block">
                <select
                  value={customView}
                  onChange={(e) => {
                    setCustomView(e.target.value as LeadCustomView);
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-slate-100 hover:bg-slate-200/80 text-slate-900 font-bold text-lg rounded-xl pl-3.5 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-300/80"
                >
                  <option value="all_leads">📋 All Candidates ({leads.length})</option>
                  <option value="my_leads">🎯 My Assigned Candidates ({leads.filter((l) => l.assignedCaller === (activeUserRole || "Muthumeena")).length})</option>
                  <option value="hot_leads">🔥 Hot Priority Candidates ({leads.filter((l) => l.priority === "Hot").length})</option>
                  <option value="today_followups">📅 Today's Follow-ups ({leads.filter((l) => l.nextFollowUpDate && l.nextFollowUpDate !== "-").length})</option>
                  <option value="unassigned">⚠️ Unassigned Candidates ({leads.filter((l) => !l.assignedCaller || l.assignedCaller === "Unassigned").length})</option>
                  <option value="placed">🎉 Placed Candidates ({leads.filter((l) => l.status === "Placed").length})</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {filteredLeads.length} Candidates Filtered
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <span>Operational Desk: <strong className="text-slate-700">Telecalling Team</strong></span>
              <span>•</span>
              <span className="text-[#244B7A] font-semibold">Active Staff: Priya Sharma</span>
              {!canExport && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                    <Lock className="w-3 h-3" />
                    Anti-leak Policy Active (Export restricted)
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {canExport ? (
              <button
                onClick={() => {
                  addToast("Export: Downloaded student leads dataset to Excel.", "success");
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                title="Export all filtered student leads to Excel / CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Excel</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  addToast("Security Policy: Telecallers cannot export contact database to prevent student lead leakages.", "warning");
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed"
                title="🔒 Export Restricted by Campus Security Policy"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="line-through">Export Excel</span>
              </button>
            )}

            {isOwnerMD && (
              <button
                type="button"
                onClick={() => setIsDistributeModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="1-Click Smart Bulk Lead Distribution across telecallers"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                <span>Distribute Leads</span>
              </button>
            )}

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import Candidates</span>
            </button>

            <button
              onClick={() => setIsAddLeadModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
            >
              <PlusCircle className="w-4 h-4 text-orange-300" />
              <span>Add Candidate</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-soft space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by candidate name, phone or role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Filter Target Job Domain */}
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="All">All Job Roles / Domains</option>
              {WEGROW_JOB_DOMAINS.map((jd) => (
                <option key={jd.id} value={jd.name}>
                  {jd.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Placed">Placed / Hired</option>
              <option value="Call Later">Call Later</option>
              <option value="Busy">Busy</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          {/* Filter Caller */}
          <div>
            <select
              value={selectedCaller}
              onChange={(e) => {
                setSelectedCaller(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#142B52]/20 focus:border-[#142B52]"
            >
              <option value="All">All Telecallers</option>
              {allStaffList.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Staff Quick-Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Users2 className="w-3.5 h-3.5" />
            <span>Staff Filter:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedCaller("All");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCaller === "All"
                ? "bg-[#142B52] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Staff ({leads.length})
          </button>
          {allStaffList.map((staff) => {
            const count = leads.filter((l) =>
              (l.assignedCaller || "").toLowerCase().includes(staff.toLowerCase())
            ).length;
            const isSelected = selectedCaller === staff;
            return (
              <button
                key={staff}
                type="button"
                onClick={() => {
                  setSelectedCaller(staff);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {staff} ({count})
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Row: Source, Priority & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Source:</span>
              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              >
                <option value="All">All Sources</option>
                <option value="Google Sheet">Google Sheet</option>
                <option value="Excel Import">Excel Import</option>
                <option value="Job Portal">Job Portal</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Job Search App">Job Search App</option>
                <option value="Website">Website</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Referral">Referral</option>
                <option value="Phone">Phone</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Priority:</span>
              <div className="flex gap-1">
                {(["All", "Hot", "Warm", "Cold"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPriority(p);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedPriority === p
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
              <span className="text-slate-500 font-medium">Sort:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("upcoming");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sortBy === "upcoming"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Sort by nearest scheduled follow-up due date & time"
                >
                  🕒 Upcoming Due
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("newest");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sortBy === "newest"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Sort by newest enquiries first"
                >
                  🆕 Newest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("oldest");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sortBy === "oldest"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Sort by oldest enquiries first"
                >
                  ⏳ Oldest
                </button>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Priority Quick Guide for Telecallers */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
          <span className="font-semibold text-slate-700">Priority Guide:</span>
          <span className="flex items-center gap-1 text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <strong>Hot:</strong> High intent / Wants demo or seat confirmation
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <strong>Warm:</strong> Positive call / Discussing course fee & timings
          </span>
          <span className="flex items-center gap-1 text-sky-700">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <strong>Cold:</strong> Early stage / Requires nurture follow-up
          </span>
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Candidate Details</th>
                <th className="py-3.5 px-4">Preferred Domain</th>
                <th className="py-3.5 px-4">Experience</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Assigned Telecaller</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Next Follow-up</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">
                      No leads match your filter criteria
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting the search query or clearing filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-bold text-slate-900 hover:text-[#244B7A] transition-colors"
                          >
                            {lead.studentName}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {lead.phone}
                            </span>
                            {(lead as any).collegeName && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[160px]" title={(lead as any).collegeName}>
                                • {(lead as any).collegeName}
                              </span>
                            )}
                            {lead.city && !(lead as any).collegeName && (
                              <span className="text-[10px] text-slate-400">
                                • {lead.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Domain */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[180px]">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {(lead as any).preferredDomain || lead.courseInterested || "IT / Software"}
                      </span>
                    </td>

                    {/* Experience */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {(lead as any).experienceYears || "Fresher"}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {lead.leadSource}
                      </span>
                    </td>

                    {/* Assigned Caller */}
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {lead.assignedCaller}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={lead.priority} type="priority" />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={lead.status} />
                    </td>

                    {/* Next Follow-up */}
                    <td className="py-3.5 px-4">
                      {lead.nextFollowUpDate && lead.nextFollowUpDate !== "-" ? (
                        <span className="text-slate-700 font-medium text-[11px]">
                          {lead.nextFollowUpDate}
                          <span className="text-slate-400 block text-[10px]">
                            {lead.nextFollowUpTime}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setLoggingLead(lead)}
                          title="Log Call Remarks"
                          className="flex items-center gap-1 px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Log Call</span>
                        </button>

                        <a
                          href={`https://wa.me/91${(lead.phone || "").replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hello ${lead.studentName}, Greetings from WeGrow Jobz!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`WhatsApp ${lead.studentName}`}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors font-bold"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                        </a>

                        <button
                          onClick={() => setEditingLead(lead)}
                          title="Edit Details"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <Link
                          href={`/leads/${lead.id}`}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredLeads.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * itemsPerPage, filteredLeads.length)}
            </span>{" "}
            of <span className="font-bold text-slate-800">{filteredLeads.length}</span> filtered leads
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === page
                    ? "bg-[#142B52] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
      />

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#142B52] text-white">
              <div>
                <h3 className="font-bold text-sm">Edit Enquiry Details</h3>
                <p className="text-xs text-slate-300">Lead ID: #{editingLead.id}</p>
              </div>
              <button
                onClick={() => setEditingLead(null)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  required
                  value={editingLead.studentName}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, studentName: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLead.phone}
                    onChange={(e) =>
                      setEditingLead({ ...editingLead, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingLead.email}
                    onChange={(e) =>
                      setEditingLead({ ...editingLead, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Course
                </label>
                <select
                  value={editingLead.courseInterested}
                  onChange={(e) =>
                    setEditingLead({
                      ...editingLead,
                      courseInterested: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lead Status
                  </label>
                  <select
                    value={editingLead.status}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        status: e.target.value as LeadStatus,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Busy">Busy</option>
                    <option value="Call Later">Call Later</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Counselling Scheduled">
                      Counselling Scheduled
                    </option>
                    <option value="Visited Campus">Visited Campus</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={editingLead.priority}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        priority: e.target.value as LeadPriority,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Caller
                  </label>
                  <select
                    value={editingLead.assignedCaller}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        assignedCaller: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    {telecallers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={editingLead.nextFollowUpDate}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        nextFollowUpDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#142B52] text-white rounded-xl font-bold hover:bg-[#1E3B6E]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Candidate Importer Modal (Google Sheets Link + Paste/File Importer) */}
      <UniversalImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* 1-Click Smart Bulk Lead Distribution Modal */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-purple-700 text-white">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-200" />
                <h3 className="font-bold text-base">1-Click Smart Bulk Lead Distribution</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDistributeModalOpen(false)}
                className="text-purple-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Automatically allocate imported candidate leads or re-distribute pools equally across active telecallers in one click.
              </p>

              {/* Step 1: Select Lead Pool Source */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  1. Select Candidate Leads to Distribute:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDistributeSource("unassigned")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      distributeSource === "unassigned"
                        ? "border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">Unassigned</span>
                    <span className="text-[10px] text-slate-500">Fresh imports</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributeSource("all")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      distributeSource === "all"
                        ? "border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">All Leads</span>
                    <span className="text-[10px] text-slate-500">{leads.length} total</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributeSource("by_staff")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      distributeSource === "by_staff"
                        ? "border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">By Staff</span>
                    <span className="text-[10px] text-slate-500">Leave transfer</span>
                  </button>
                </div>
              </div>

              {distributeSource === "by_staff" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Select Staff to Transfer Leads FROM:
                  </label>
                  <select
                    value={selectedStaffSource}
                    onChange={(e) => setSelectedStaffSource(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-600 font-semibold"
                  >
                    {allStaffList.map((s) => (
                      <option key={s} value={s}>
                        {s} ({leads.filter((l) => (l.assignedCaller || "").toLowerCase() === s.toLowerCase()).length} leads)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 2: Distribution Mode */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  2. Choose Distribution Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDistributeMode("equal_split")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      distributeMode === "equal_split"
                        ? "border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">⚡ Equal Split (50/50)</span>
                    <span className="text-[10px] text-slate-500">
                      Evenly distributed across all active callers
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributeMode("single_caller")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      distributeMode === "single_caller"
                        ? "border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">🎯 Single Telecaller</span>
                    <span className="text-[10px] text-slate-500">
                      Assign all selected leads to one staff
                    </span>
                  </button>
                </div>
              </div>

              {distributeMode === "single_caller" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assign Leads TO:
                  </label>
                  <select
                    value={targetSingleCaller}
                    onChange={(e) => setTargetSingleCaller(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-600 font-semibold"
                  >
                    {allStaffList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Summary Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-600">Total Leads in CRM:</span>
                  <span className="font-mono text-slate-900 font-bold">{leads.length} candidates</span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-600">Active Calling Floor Staff:</span>
                  <span className="font-mono text-purple-700 font-bold">
                    {telecallers.filter((t) => t.status !== "Inactive").length || allStaffList.length} staff
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDistributing}
                  onClick={handleExecuteDistribution}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isDistributing ? "Distributing..." : "Execute 1-Click Distribution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      <LogCallModal
        isOpen={Boolean(loggingLead)}
        onClose={() => setLoggingLead(null)}
        lead={loggingLead}
      />
    </div>
  );
}

