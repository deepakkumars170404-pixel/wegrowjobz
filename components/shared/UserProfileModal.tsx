"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  User,
  Shield,
  KeyRound,
  Lock,
  Phone,
  Mail,
  Languages,
  Briefcase,
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  Save,
  MessageSquare,
  Award,
  Crown,
  Headphones,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { AppUser } from "@/types";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "profile" | "security" | "stats";
}

const AVAILABLE_LANGUAGES = [
  "Tamil (தமிழ்)",
  "English",
  "Hindi (हिंदी)",
  "Telugu (తెలుగు)",
  "Malayalam (മലയാളം)",
  "Kannada (ಕನ್ನಡ)",
];

const RECRUITMENT_DOMAINS = [
  "General Recruitment & Screening",
  "IT & Software Engineering",
  "Core Engineering & Manufacturing",
  "Banking, Finance & Insurance (BFSI)",
  "Healthcare & Life Sciences",
  "BPO & Customer Experience",
  "Sales & Marketing Placements",
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = "profile",
}) => {
  const {
    currentUser,
    telecallers,
    updateUserProfile,
    updateUserPassword,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "stats">(initialTab);

  // Profile Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setWhatsapp(currentUser.whatsapp || currentUser.phone || "");
      setEmail(currentUser.email || "");
      setLanguages(currentUser.languages || ["Tamil (தமிழ்)", "English"]);
      setSpecialization(currentUser.specialization || RECRUITMENT_DOMAINS[0]);
      setBio(currentUser.bio || "");
      setAvatar(currentUser.avatar || "");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setPasswordSuccess(false);
      setActiveTab(initialTab);
    }
  }, [isOpen, currentUser, initialTab]);

  if (!isOpen || !currentUser) return null;

  const currentTelecaller = telecallers.find(
    (t) =>
      t.name.toLowerCase() === currentUser.name.toLowerCase() ||
      t.id.toLowerCase() === currentUser.id.toLowerCase()
  );

  const handleLanguageToggle = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(currentUser.id, {
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      languages,
      specialization,
      bio: bio.trim(),
      avatar,
    });
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!newPassword.trim()) {
      setPasswordError("Please enter your new password or PIN.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.trim().length < 3) {
      setPasswordError("Password must be at least 3 characters or digits.");
      return;
    }

    const res = updateUserPassword(currentUser.id, newPassword, currentPassword);
    if (!res.success) {
      setPasswordError(res.error || "Failed to update password. Verify current password.");
    } else {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    }
  };

  const isOwner = currentUser.role === "Owner" || currentUser.role === "Owner / MD";
  const isAdmin = currentUser.role === "Admin";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header & Cover Banner */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-5 sm:p-6 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar with Camera upload trigger */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 border-2 border-white/60 overflow-hidden flex items-center justify-center text-xl sm:text-2xl font-black shadow-lg">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  (name || "ME").slice(0, 2).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer text-[10px] font-bold"
                title="Change Photo"
              >
                <Camera className="w-4 h-4 mb-0.5" />
                <span>Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
            </div>

            {/* Title & Identity Badges */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold truncate">{currentUser.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 border border-white/30 text-white flex items-center gap-1">
                  {isOwner ? <Crown className="w-3 h-3 text-amber-300" /> : isAdmin ? <Shield className="w-3 h-3 text-purple-200" /> : <Headphones className="w-3 h-3 text-emerald-300" />}
                  <span>{currentUser.role}</span>
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 truncate">{currentUser.email || "No email"}</p>
              <p className="text-[11px] text-blue-200/80 mt-1 flex items-center gap-2 font-mono">
                <span>📞 {currentUser.phone || "No phone"}</span>
                <span>•</span>
                <span>Joined {currentUser.joinedDate}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/15 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "profile"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "security"
                  ? "bg-white text-purple-900 shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password & Security</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "stats"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>My Floor Metrics</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* TAB 1: PERSONAL PROFILE */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Display Name: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Work Email:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Primary Calling Phone: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    WhatsApp Calling / Number:
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Recruitment Domain Specialization */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Primary Recruitment Specialization / Industry Domain:
                </label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                >
                  {RECRUITMENT_DOMAINS.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>

              {/* Spoken Languages */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-blue-600" />
                  <span>Spoken Languages for Candidate Calls:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_LANGUAGES.map((lang) => {
                    const isSelected = languages.includes(lang);
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => handleLanguageToggle(lang)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        <span>{lang}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio & Intro Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Telecaller Notes / Pitch Style:
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Specializing in fresh graduate IT placements and BPO counselling calls..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile Details</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PASSWORD & SECURITY (SELF-SERVICE) */}
          {activeTab === "security" && (
            <form onSubmit={handleSavePassword} className="space-y-4 max-w-lg mx-auto">
              <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-950 text-xs">Zoho CRM Style Confidential Password</h4>
                  <p className="text-[11px] text-purple-800/80 mt-0.5">
                    You can set your own secret PIN / password anytime. Neither Admin nor Owner will see or alter your confidential password.
                  </p>
                </div>
              </div>

              {/* Current Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Current Password / PIN: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    New Secret Password: <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      placeholder="e.g. 7708 or mySecret"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Confirm New Password: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your private password has been successfully updated!</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Update My Secret Password</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MY CALLING STATS & ATTENDANCE */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Calls Executed</span>
                  <span className="text-2xl font-black text-blue-900 mt-1 block">
                    {currentTelecaller?.callsCompleted || 0}
                  </span>
                  <span className="text-[10px] text-blue-600 font-medium">Logged calls today</span>
                </div>

                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Daily Target</span>
                  <span className="text-2xl font-black text-purple-900 mt-1 block">
                    {currentTelecaller?.dailyTarget || 50}
                  </span>
                  <span className="text-[10px] text-purple-600 font-medium">Calls assigned</span>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Interested Leads</span>
                  <span className="text-2xl font-black text-emerald-900 mt-1 block">
                    {currentTelecaller?.interestedLeads || 0}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Warm conversions</span>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Floor Rank</span>
                  <span className="text-2xl font-black text-amber-900 mt-1 block">
                    #{currentTelecaller?.rank || 1}
                  </span>
                  <span className="text-[10px] text-amber-600 font-medium">Team leaderboard</span>
                </div>
              </div>

              {/* Punch-in Time & Working Hours */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Attendance & Session Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 Punched In & Online
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Morning Punch-In:</span>
                    <strong className="text-slate-800 text-xs font-mono">{currentTelecaller?.punchInTime || "10:00 AM"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Active Session:</span>
                    <strong className="text-purple-700 text-xs font-mono">{currentTelecaller?.workingHours || "4h 25m"}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
