"use client";

import React, { useState, useRef } from "react";
import {
  Trophy,
  Medal,
  Award,
  PhoneCall,
  UserCheck,
  GraduationCap,
  Sparkles,
  TrendingUp,
  X,
  Target,
  Clock,
  CheckCircle2,
  Camera,
  Plus,
  UserPlus,
  Power,
  SlidersHorizontal,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { Telecaller } from "@/types";
import { StaffAvatar } from "@/components/shared/StaffAvatar";

export default function TeamPerformancePage() {
  const {
    telecallers,
    updateStaffAvatar,
    addTelecaller,
    toggleTelecallerStatus,
    updateTelecallerTarget,
    reassignStaffLeads,
    activeUserRole,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<"floor" | "attendance" | "leaderboard">("floor");
  const [selectedCaller, setSelectedCaller] = useState<Telecaller | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploadTarget, setAvatarUploadTarget] = useState<string | null>(null);

  // Add Telecaller Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDailyTarget, setNewDailyTarget] = useState(50);
  const [newRole, setNewRole] = useState<"Senior Telecaller" | "Telecalling Executive" | "Admissions Counsellor">(
    "Telecalling Executive"
  );

  // Quick Target Editor State
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [tempTargetVal, setTempTargetVal] = useState<number>(50);

  // Staff Reassignment Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [fromCaller, setFromCaller] = useState("");
  const [toCaller, setToCaller] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !avatarUploadTarget) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateStaffAvatar(avatarUploadTarget, base64);
      if (selectedCaller && selectedCaller.name.toLowerCase() === avatarUploadTarget.toLowerCase()) {
        setSelectedCaller({ ...selectedCaller, avatar: base64 });
      }
      setAvatarUploadTarget(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerPhotoUpload = (callerName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAvatarUploadTarget(callerName);
    fileInputRef.current?.click();
  };

  const handleCreateTelecaller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    addTelecaller({
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, "")}@wegrowjobz.com`,
      dailyTarget: Number(newDailyTarget) || 50,
      role: newRole,
    });

    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewDailyTarget(50);
    setIsAddModalOpen(false);
  };

  const handleConfirmReassign = async () => {
    if (!fromCaller || !toCaller || fromCaller === toCaller) return;
    await reassignStaffLeads(fromCaller, toCaller);
    setIsReassignModalOpen(false);
  };

  // Sorted by rank or admissions
  const sortedCallers = [...telecallers].sort((a, b) => a.rank - b.rank);

  // Overall totals
  const totalDailyTarget = telecallers.reduce((acc, c) => acc + (c.dailyTarget || 50), 0);
  const totalCallsDone = telecallers.reduce((acc, c) => acc + (c.callsCompleted || 0), 0);
  const activeStaffCount = telecallers.filter((c) => c.status !== "Inactive").length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Executive Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-purple-600" />
              <span>Telecalling Floor & Staff Operations</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Admin & Owner Desk
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time management of telecaller accounts, daily targets, punch attendance, and conversion performance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Telecaller</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (telecallers.length > 0) {
                setFromCaller(telecallers[0].name);
                setToCaller(telecallers[1]?.name || telecallers[0].name);
              }
              setIsReassignModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Transfer Staff Leads</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-soft">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Telecallers</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{telecallers.length}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {activeStaffCount} Active Floor
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Calling floor staff strength</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-soft">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Floor Calling Target</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-700">{totalDailyTarget}</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Daily Target
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Target calls across all active staff</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-soft">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Calls Executed Today</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700">{totalCallsDone}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {totalDailyTarget > 0 ? ((totalCallsDone / totalDailyTarget) * 100).toFixed(0) : 0}% Target
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Live calls placed from telecaller app</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-soft">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Supervisor Audit Status</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-purple-700">100%</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Live Audited
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Floor monitoring active</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 bg-white px-4 pt-2 rounded-2xl shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("floor")}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === "floor"
              ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck className="w-4 h-4 text-purple-600" />
          <span>Staff & Floor Allocation</span>
          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
            {telecallers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === "attendance"
              ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Live Punch & Attendance Feed</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
            Live
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("leaderboard")}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === "leaderboard"
              ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Leaderboard & Conversions</span>
        </button>
      </div>

      {/* 4. TAB 1: Staff & Floor Allocation */}
      {activeTab === "floor" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Telecaller Staff List & Target Controller</h3>
              <p className="text-xs text-slate-500">
                Adjust daily target calls, toggle active status, and monitor calling pacing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Telecaller Staff</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Floor Calling Status</th>
                  <th className="py-3.5 px-4">Daily Target</th>
                  <th className="py-3.5 px-4">Today&apos;s Progress</th>
                  <th className="py-3.5 px-4 text-right">Floor Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {telecallers.map((caller) => {
                  const isActive = caller.status !== "Inactive";
                  const target = caller.dailyTarget || 50;
                  const completed = caller.callsCompleted || 0;
                  const pct = Math.min(100, Math.round((completed / target) * 100));

                  return (
                    <tr key={caller.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Avatar & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative group/avatar shrink-0">
                            <StaffAvatar
                              name={caller.name}
                              avatarUrl={caller.avatar}
                              size={40}
                              ringColor={isActive ? "ring-2 ring-emerald-400" : "ring-2 ring-slate-300"}
                            />
                            <button
                              type="button"
                              onClick={(e) => triggerPhotoUpload(caller.name, e)}
                              className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                              title="Update staff picture"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{caller.name}</span>
                            <span className="text-[11px] text-slate-400 block">{caller.role}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <div>
                          <span>📞 {caller.phone}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                            {caller.email}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          <span>{isActive ? "Active on Floor" : "Inactive / Off Floor"}</span>
                        </span>
                      </td>

                      {/* Daily Target Controller */}
                      <td className="py-3.5 px-4">
                        {editingTargetId === caller.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={10}
                              max={200}
                              value={tempTargetVal}
                              onChange={(e) => setTempTargetVal(parseInt(e.target.value, 10) || 50)}
                              className="w-16 px-2 py-1 border border-purple-400 rounded-md text-xs font-bold outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateTelecallerTarget(caller.id, tempTargetVal);
                                setEditingTargetId(null);
                              }}
                              className="px-2 py-1 bg-purple-600 text-white rounded-md text-[11px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTargetId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded-md text-[11px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs">{target} calls/day</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTargetId(caller.id);
                                setTempTargetVal(target);
                              }}
                              className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                            <span>{completed} / {target} calls</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-blue-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleTelecallerStatus(caller.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                              isActive
                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            <Power className="w-3 h-3 inline mr-1" />
                            <span>{isActive ? "Deactivate" : "Activate"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFromCaller(caller.name);
                              const other = telecallers.find((t) => t.name !== caller.name);
                              if (other) setToCaller(other.name);
                              setIsReassignModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            Transfer Leads
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 2: Live Punch & Attendance Feed */}
      {activeTab === "attendance" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Telecaller Staff Punch-In / Punch-Out Attendance Feed</span>
              </h3>
              <p className="text-xs text-slate-500">
                Track calling session start time, break intervals, and total active talk hours.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Today: {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {telecallers.map((caller) => {
              const isPunched = caller.isPunchedIn !== false;
              const punchIn = caller.punchInTime || "10:30 AM";
              const punchOut = caller.punchOutTime || (isPunched ? "Active on Floor" : "06:00 PM");
              const workHours = caller.workingHours || "4h 25m";

              return (
                <div
                  key={caller.id}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <StaffAvatar name={caller.name} avatarUrl={caller.avatar} size={36} />
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{caller.name}</h4>
                        <span className="text-[10px] text-slate-400">{caller.role}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPunched
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isPunched ? "🟢 Online" : "⚪ Punched Out"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Morning Punch In:</span>
                      <strong className="text-slate-800">{punchIn}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Evening Punch Out:</span>
                      <strong className="text-slate-800">{punchOut}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium">Logged Working Time:</span>
                    <span className="font-bold text-purple-700 font-mono">{workHours}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TAB 3: Leaderboard & Performance */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {/* Top 3 Podium Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sortedCallers.slice(0, 3).map((caller, index) => {
              let badgeColor = "bg-[#D5A52B] text-[#142B52]";
              let ringColor = "ring-[#D5A52B]";
              let rankLabel = "🏆 Rank 1 • Top Performer";

              if (index === 1) {
                badgeColor = "bg-slate-300 text-slate-800";
                ringColor = "ring-slate-300";
                rankLabel = "🥈 Rank 2 • Silver";
              } else if (index === 2) {
                badgeColor = "bg-amber-700 text-white";
                ringColor = "ring-amber-700";
                rankLabel = "🥉 Rank 3 • Bronze";
              }

              return (
                <div
                  key={caller.id}
                  onClick={() => setSelectedCaller(caller)}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft hover:shadow-card cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeColor}`}>
                        {rankLabel}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {caller.conversionRate}% Conv.
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative group/avatar">
                        <StaffAvatar
                          name={caller.name}
                          avatarUrl={caller.avatar}
                          size={56}
                          ringColor={`ring-4 ${ringColor}`}
                        />
                        <button
                          type="button"
                          onClick={(e) => triggerPhotoUpload(caller.name, e)}
                          className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          title="Upload new picture"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {caller.name}
                        </h3>
                        <p className="text-xs text-slate-500">{caller.role}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Calls Made</span>
                        <span className="font-bold text-slate-800">{caller.callsCompleted}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Placements</span>
                        <span className="font-bold text-emerald-700">{caller.admissionsGenerated}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Target: {caller.dailyTarget} calls/day</span>
                    <span className="text-blue-600 font-semibold group-hover:underline">
                      View Audit Profile &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Modal: Add New Telecaller */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-purple-700 text-white">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-200" />
                <h3 className="font-bold text-base">Enroll New Telecaller</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-purple-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTelecaller} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telecaller Full Name: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priyadharshini"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone / Calling SIM Number: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9845123098"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Email Address:
                </label>
                <input
                  type="email"
                  placeholder="e.g. priya@wegrowjobz.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Daily Call Target:
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={newDailyTarget}
                    onChange={(e) => setNewDailyTarget(parseInt(e.target.value, 10) || 50)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designation Role:
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                  >
                    <option value="Telecalling Executive">Telecalling Executive</option>
                    <option value="Senior Telecaller">Senior Telecaller</option>
                    <option value="Admissions Counsellor">Admissions Counsellor</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Enroll Telecaller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: Reassign Staff Leads */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-base">Transfer Staff Leads</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                If a telecaller is on leave or shifting shifts, transfer their pending candidate calling queue to another active staff member with 1-click.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Transfer Leads FROM (Current Staff):
                </label>
                <select
                  value={fromCaller}
                  onChange={(e) => setFromCaller(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-600 font-semibold"
                >
                  {telecallers.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.status || "Active"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assign Leads TO (Target Staff):
                </label>
                <select
                  value={toCaller}
                  onChange={(e) => setToCaller(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-600 font-semibold"
                >
                  {telecallers.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReassign}
                  disabled={!fromCaller || !toCaller || fromCaller === toCaller}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Profile Audit Modal */}
      {selectedCaller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#142B52] text-white">
              <h3 className="font-bold text-base">Counsellor Audit Profile</h3>
              <button
                type="button"
                onClick={() => setSelectedCaller(null)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-4">
                <StaffAvatar name={selectedCaller.name} avatarUrl={selectedCaller.avatar} size={64} />
                <div>
                  <h4 className="font-bold text-base text-slate-900">{selectedCaller.name}</h4>
                  <p className="text-slate-500">{selectedCaller.role}</p>
                  <p className="text-slate-400 font-mono mt-0.5">📞 {selectedCaller.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Calls Completed</span>
                  <span className="text-base font-bold text-slate-800">{selectedCaller.callsCompleted}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Placement Conversion</span>
                  <span className="text-base font-bold text-emerald-600">{selectedCaller.conversionRate}%</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCaller(null)}
                  className="px-5 py-2 bg-[#142B52] hover:bg-[#1E3B6E] text-white rounded-xl font-bold cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
