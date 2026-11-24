"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  X,
  Globe,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { WEGROW_STAFF_MEMBERS } from "@/types";
import { parseGoogleSheetCSV, ParsedLeadRow } from "@/lib/sheetParser";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface UniversalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UniversalImportModal({ isOpen, onClose }: UniversalImportModalProps) {
  const { addLeadsBulk, showToast } = useCRM();

  const [importMode, setImportMode] = useState<"sheet" | "paste">("sheet");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [fetchedLeads, setFetchedLeads] = useState<ParsedLeadRow[]>([]);
  const [selectedCaller, setSelectedCaller] = useState("Muthumeena");
  const [importText, setImportText] = useState("");

  if (!isOpen) return null;

  // 1. Fetch Google Sheet live CSV via server endpoint
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
        setSheetError(
          data.error ||
            "Failed to fetch Google Sheet. Please check that Share is set to 'Anyone with the link can view'."
        );
        setIsFetchingSheet(false);
        return;
      }

      const { leads } = parseGoogleSheetCSV(data.csvText, selectedCaller);
      if (leads.length === 0) {
        setSheetError(
          "No valid candidates found in this sheet. Please ensure columns include Candidate Name and Phone number."
        );
      } else {
        setFetchedLeads(leads);
      }
    } catch (err: any) {
      setSheetError(err?.message || "Network error. Please try again.");
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // 2. Confirm and Import Google Sheet Leads
  const handleConfirmImportSheet = async () => {
    if (fetchedLeads.length === 0) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const timestamp = Date.now();

    const leadsToAdd = fetchedLeads.map((l, idx) => ({
      id: `LD-${timestamp + idx}`,
      studentName: l.studentName,
      phone: l.phone,
      email: l.email || `${l.studentName.toLowerCase().replace(/[^a-z0-9]/g, "")}@candidate.wegrow`,
      courseInterested: l.courseInterested || "IT & Software Development",
      preferredDomain: l.preferredDomain || l.courseInterested || "IT & Software Development",
      experienceYears: l.experienceYears || "Fresher",
      collegeName: l.collegeName || "",
      qualification: l.qualification || "",
      leadSource: "Google Sheet" as const,
      assignedCaller: selectedCaller || "Muthumeena",
      priority: "Warm" as const,
      status: "New" as const,
      stage: "New Enquiry" as const,
      enquiryDate: todayStr,
      nextFollowUpDate: "",
      nextFollowUpTime: "",
      callCount: 0,
      notes: [],
      callHistory: [],
    }));

    // Add to CRMContext state
    addLeadsBulk(leadsToAdd);

    // Direct cloud upsert to Supabase jobz_leads for instant persistence
    if (isSupabaseConfigured() && supabase) {
      try {
        const rows = leadsToAdd.map((l) => ({
          id: l.id,
          student_name: l.studentName,
          phone: l.phone,
          email: l.email || null,
          course_interested: l.courseInterested,
          preferred_domain: l.preferredDomain,
          experience_years: l.experienceYears || null,
          college_name: l.collegeName || null,
          qualification: l.qualification || null,
          lead_source: "Google Sheet",
          assigned_caller: l.assignedCaller,
          priority: "Warm",
          status: "New",
          stage: "New Enquiry",
          enquiry_date: todayStr,
        }));
        await supabase.from("jobz_leads").upsert(rows, { onConflict: "id" });
      } catch (err) {
        console.warn("Direct Supabase import error:", err);
      }
    }

    showToast({
      type: "success",
      title: "Google Sheet Leads Imported",
      message: `Successfully loaded ${leadsToAdd.length} candidates into calling queue!`,
    });

    setFetchedLeads([]);
    setGoogleSheetUrl("");
    onClose();
  };

  // 3. Process pasted text or local file
  const handleProcessPaste = async () => {
    if (!importText.trim()) {
      alert("Please paste candidates data or select a file first.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const timestamp = Date.now();

    const { leads } = parseGoogleSheetCSV(importText, selectedCaller);
    if (leads.length === 0) {
      alert("No valid candidates parsed. Format: Candidate Name, Phone Number, Job Domain, Experience, College");
      return;
    }

    const leadsToAdd = leads.map((l, idx) => ({
      id: `LD-${timestamp + idx}`,
      studentName: l.studentName,
      phone: l.phone,
      email: l.email || `${l.studentName.toLowerCase().replace(/[^a-z0-9]/g, "")}@candidate.wegrow`,
      courseInterested: l.courseInterested || "IT & Software Development",
      preferredDomain: l.preferredDomain || l.courseInterested || "IT & Software Development",
      experienceYears: l.experienceYears || "Fresher",
      collegeName: l.collegeName || "",
      qualification: l.qualification || "",
      leadSource: "Excel Import" as const,
      assignedCaller: selectedCaller || "Muthumeena",
      priority: "Warm" as const,
      status: "New" as const,
      stage: "New Enquiry" as const,
      enquiryDate: todayStr,
      nextFollowUpDate: "",
      nextFollowUpTime: "",
      callCount: 0,
      notes: [],
      callHistory: [],
    }));

    addLeadsBulk(leadsToAdd);

    if (isSupabaseConfigured() && supabase) {
      try {
        const rows = leadsToAdd.map((l) => ({
          id: l.id,
          student_name: l.studentName,
          phone: l.phone,
          email: l.email || null,
          course_interested: l.courseInterested,
          preferred_domain: l.preferredDomain,
          experience_years: l.experienceYears || null,
          college_name: l.collegeName || null,
          qualification: l.qualification || null,
          lead_source: "Excel Import",
          assigned_caller: l.assignedCaller,
          priority: "Warm",
          status: "New",
          stage: "New Enquiry",
          enquiry_date: todayStr,
        }));
        await supabase.from("jobz_leads").upsert(rows, { onConflict: "id" });
      } catch (err) {
        console.warn("Direct Supabase import error:", err);
      }
    }

    showToast({
      type: "success",
      title: "Candidates Imported",
      message: `Successfully loaded ${leadsToAdd.length} candidates into calling queue!`,
    });

    setImportText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#142B52] text-white">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#D5A52B]" />
            <h3 className="font-bold text-sm sm:text-base">Universal Candidate Importer</h3>
          </div>
          <button
            onClick={() => {
              setFetchedLeads([]);
              setSheetError("");
              onClose();
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
                Candidates will be placed in this staff member's Calling Queue
              </span>
            </div>
            <select
              value={selectedCaller}
              onChange={(e) => setSelectedCaller(e.target.value)}
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
                    setFetchedLeads([]);
                    setSheetError("");
                    onClose();
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                  <span>Import {fetchedLeads.length > 0 ? `${fetchedLeads.length} ` : ""}Candidates to Queue</span>
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
                  onClick={onClose}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessPaste}
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
  );
}
