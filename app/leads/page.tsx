"use client";

import React, { useState, useMemo } from "react";
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
import { parseGoogleSheetCSV, ParsedLeadRow } from "@/lib/sheetParser";

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
  const [importMode, setImportMode] = useState<"sheet" | "paste">("sheet");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [fetchedLeads, setFetchedLeads] = useState<ParsedLeadRow[]>([]);
  const [selectedImportCaller, setSelectedImportCaller] = useState("Muthumeena");
  const [importText, setImportText] = useState("");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [loggingLead, setLoggingLead] = useState<Lead | null>(null);

  // Fetch Google Sheet live CSV via server API
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setSheetError("Please enter a Google Sheet link.");
      return;
    }
    setSheetError("");
    setIsFetchingSheet(true);
    setFetchedLeads([]);

    try {
      const res = await fetch("/api/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: googleSheetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSheetError(data.error || "Failed to fetch Google Sheet. Make sure General Access is 'Anyone with the link can view'.");
        setIsFetchingSheet(false);
        return;
      }

      const { leads } = parseGoogleSheetCSV(data.csvText, selectedImportCaller);
      if (leads.length === 0) {
        setSheetError("No valid candidate rows found. Please ensure the sheet has Candidate Name and Phone number columns.");
      } else {
        setFetchedLeads(leads);
      }
    } catch (err: any) {
      setSheetError(err?.message || "Network error. Please try again.");
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // Confirm and load fetched Google Sheet leads to CRM
  const handleConfirmImportSheet = () => {
    if (fetchedLeads.length === 0) return;

    const leadsToAdd = fetchedLeads.map((l) => ({
      studentName: l.studentName,
      phone: l.phone,
      email: l.email || `${l.studentName.toLowerCase().replace(/\s+/g, "")}@candidate.wegrow`,
      courseInterested: l.courseInterested || "IT & Software Development",
      preferredDomain: l.preferredDomain || l.courseInterested || "IT & Software Development",
      experienceYears: l.experienceYears || "Fresher",
      collegeName: l.collegeName || "",
      qualification: l.qualification || "",
      leadSource: "Google Sheet" as const,
      assignedCaller: selectedImportCaller || "Muthumeena",
      priority: "Warm" as const,
      status: "New" as const,
      stage: "New Enquiry" as const,
      enquiryDate: new Date().toISOString().split("T")[0],
      nextFollowUpDate: "",
      nextFollowUpTime: "",
    }));

    addLeadsBulk(leadsToAdd);
    setFetchedLeads([]);
    setGoogleSheetUrl("");
    setIsImportModalOpen(false);
  };

  // Process pasted text or uploaded local file
  const handleProcessImport = () => {
    if (!importText.trim()) {
      alert("Please paste data or choose a file first.");
      return;
    }

    const { leads } = parseGoogleSheetCSV(importText, selectedImportCaller);
    if (leads.length === 0) {
      alert("No valid leads parsed. Format: Candidate Name, Phone Number, Job Field, Experience, College");
      return;
    }

    const leadsToAdd = leads.map((l) => ({
      studentName: l.studentName,
      phone: l.phone,
      email: l.email || `${l.studentName.toLowerCase().replace(/\s+/g, "")}@candidate.wegrow`,
      courseInterested: l.courseInterested || "IT & Software Development",
      preferredDomain: l.preferredDomain || l.courseInterested || "IT & Software Development",
      experienceYears: l.experienceYears || "Fresher",
      collegeName: l.collegeName || "",
      qualification: l.qualification || "",
      leadSource: "Excel Import" as const,
      assignedCaller: selectedImportCaller || "Muthumeena",
      priority: "Warm" as const,
      status: "New" as const,
      stage: "New Enquiry" as const,
      enquiryDate: new Date().toISOString().split("T")[0],
      nextFollowUpDate: "",
      nextFollowUpTime: "",
    }));

    addLeadsBulk(leadsToAdd);
    setImportText("");
    setIsImportModalOpen(false);
  };

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

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import Leads</span>
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {lead.phone}
                            </span>
                            {lead.city && (
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

      {/* Import Leads Modal (Google Sheets Link + Paste/File Importer) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#142B52] text-white">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#D5A52B]" />
                <h3 className="font-bold text-sm sm:text-base">Universal Leads Importer</h3>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setFetchedLeads([]);
                  setSheetError("");
                }}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setImportMode("sheet")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                  importMode === "sheet"
                    ? "bg-white text-blue-700 border-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 border-transparent"
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Google Sheet Link (One-Click)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode("paste")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                  importMode === "paste"
                    ? "bg-white text-blue-700 border-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 border-transparent"
                }`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Paste Text / Upload File</span>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Telecaller Assignment Selector */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    Assign Telecaller Staff:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Leads will be assigned to this staff member's Calling Queue
                  </span>
                </div>
                <select
                  value={selectedImportCaller}
                  onChange={(e) => setSelectedImportCaller(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {WEGROW_STAFF_MEMBERS.map((staff) => (
                    <option key={staff} value={staff}>
                      {staff}
                    </option>
                  ))}
                </select>
              </div>

              {/* TAB 1: Google Sheet Link */}
              {importMode === "sheet" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Paste Google Sheet Share Link:</span>
                      <span className="text-[11px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ⚡ Live Direct Sync
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X.../edit?usp=sharing"
                        value={googleSheetUrl}
                        onChange={(e) => {
                          setGoogleSheetUrl(e.target.value);
                          if (sheetError) setSheetError("");
                        }}
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono pr-28"
                      />
                      <button
                        type="button"
                        onClick={handleFetchGoogleSheet}
                        disabled={isFetchingSheet || !googleSheetUrl.trim()}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#142B52] hover:bg-blue-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        {isFetchingSheet ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[#D5A52B]" />
                            <span>Fetch Sheet</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      💡 <strong>Tip:</strong> In your Google Sheet, click <strong>Share</strong> ➔ set General Access to <strong>&quot;Anyone with the link can view&quot;</strong> so CRM can read candidates.
                    </p>
                  </div>

                  {sheetError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Fetch Error: </span>
                        <span>{sheetError}</span>
                      </div>
                    </div>
                  )}

                  {fetchedLeads.length > 0 && (
                    <div className="space-y-2 border border-emerald-300 bg-emerald-50/50 p-3.5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Found {fetchedLeads.length} Candidates from Sheet!
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          Ready to Load
                        </span>
                      </div>

                      {/* Preview Table */}
                      <div className="max-h-40 overflow-y-auto border border-emerald-200 rounded-lg bg-white">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-50 text-slate-600 border-b">
                            <tr>
                              <th className="p-1.5 font-bold">#</th>
                              <th className="p-1.5 font-bold">Candidate</th>
                              <th className="p-1.5 font-bold">Phone</th>
                              <th className="p-1.5 font-bold">Domain</th>
                              <th className="p-1.5 font-bold">College</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {fetchedLeads.slice(0, 5).map((l, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-1.5 text-slate-400">{i + 1}</td>
                                <td className="p-1.5 font-semibold text-slate-800">{l.studentName}</td>
                                <td className="p-1.5 font-mono text-blue-700">{l.phone}</td>
                                <td className="p-1.5 text-slate-600 truncate max-w-[100px]">{l.courseInterested}</td>
                                <td className="p-1.5 text-slate-500 truncate max-w-[100px]">{l.collegeName || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {fetchedLeads.length > 5 && (
                        <p className="text-[10px] text-slate-400 text-center">
                          + {fetchedLeads.length - 5} more candidates will be imported
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setFetchedLeads([]);
                        setSheetError("");
                      }}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImportSheet}
                      disabled={fetchedLeads.length === 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import {fetchedLeads.length > 0 ? `${fetchedLeads.length} ` : ""}Leads to Queue</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Paste Raw Text / File */}
              {importMode === "paste" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Paste Candidates Data (Any format: Name, Phone, Job Field, Experience, College):
                    </label>
                    <textarea
                      className="w-full h-36 p-3 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#142B52] outline-none"
                      placeholder={`Candidate Name, Phone Number, Job Field, Experience, College\nExample:\nKavitha, 9845123098, Full Stack Developer, 1 Year, Anna University\nSuresh Kumar, 9789123456, Data Analytics, Fresher, Loyola College`}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 block">
                        Or select file to autofill:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Supports .csv, .txt, or exported excel
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".csv, .txt, .xlsx, .xls, .doc, .docx"
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#142B52] file:text-white cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            if (content) setImportText(content);
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessImport}
                      className="px-4 py-2 bg-[#142B52] text-white rounded-xl text-xs font-bold hover:bg-[#1E3B6E] flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Load to Calling Queue</span>
                    </button>
                  </div>
                </div>
              )}
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

