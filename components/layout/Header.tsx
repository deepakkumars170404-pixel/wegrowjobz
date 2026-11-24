"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Search,
  Plus,
  X,
  ExternalLink,
  Shield,
  Headphones,
  ChevronDown,
  UserCheck,
  Check,
  Lock,
  User,
  Settings,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { SecurityPinModal } from "@/components/shared/SecurityPinModal";
import { UserProfileModal } from "@/components/shared/UserProfileModal";
import { AppUser } from "@/types";

interface HeaderProps {
  onMobileMenuToggle: () => void;
  onOpenAddLeadModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMobileMenuToggle,
  onOpenAddLeadModal,
}) => {
  const pathname = usePathname();
  const {
    leads,
    activeUserRole,
    setActiveUserRole,
    telecallers,
    users,
    currentUser,
    isManagementUnlocked,
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTargetRole, setAuthTargetRole] = useState<"Owner" | "Admin" | "Telecaller">("Owner");
  const [authTargetUser, setAuthTargetUser] = useState<AppUser | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isOwner = activeUserRole === "Owner" || activeUserRole === "Owner / MD";
  const isAdmin = activeUserRole === "Admin" || activeUserRole === "Admin (Gopinath)" || activeUserRole === "Admin (Vijayakumar)";
  const isTelecaller = !isOwner && !isAdmin;

  const staffList = [
    "Muthumeena",
  ];

  // Page title mapping for WeGrow Jobz
  const getPageMeta = () => {
    switch (pathname) {
      case "/":
        return { title: isOwner ? "Executive Jobz Overview" : "Telecaller Desk", breadcrumb: "Dashboard" };
      case "/leads":
        return { title: "Candidates Database & Import", breadcrumb: "Candidates" };
      case "/calls":
        return { title: "Call Logs & Durations", breadcrumb: "Call History" };
      case "/follow-ups":
        return { title: "Candidate Follow-up Tasks", breadcrumb: "Follow-ups" };
      case "/reports":
        return { title: "Placement & Calling Reports", breadcrumb: "Reports" };
      case "/settings":
        return { title: "System Settings", breadcrumb: "Settings" };
      default:
        if (pathname.startsWith("/leads/")) {
          return { title: "Candidate Profile", breadcrumb: "Candidates / Profile" };
        }
        return { title: "WeGrow Jobz", breadcrumb: "CRM" };
    }
  };

  const meta = getPageMeta();

  // Search matching candidates
  const searchResults = searchQuery.trim()
    ? leads
        .filter(
          (l) =>
            (l.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (l.phone || "").includes(searchQuery) ||
            (l.courseInterested || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            ((l as any).preferredDomain || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 shadow-xs flex items-center justify-between px-3 sm:px-6">
      {/* Left side: Hamburger + Page Titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          aria-label="Open navigation menu"
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="font-bold text-blue-700">WeGrow Jobz</span>
            <span>/</span>
            <span className="text-slate-600 font-semibold">{meta.breadcrumb}</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Center: Global Candidate Search Bar */}
      <div className="relative hidden md:block w-72 lg:w-96">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate by name, phone, domain..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Candidates Found ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center text-slate-500">
                No matching candidate found for "{searchQuery}"
              </div>
            ) : (
              searchResults.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads`}
                  onClick={() => setIsSearchOpen(false)}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {lead.studentName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lead.phone} • {lead.courseInterested || "Job Placement"}
                    </p>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                    {lead.status}
                  </span>
                </Link>
              ))
            )}
            <div className="border-t border-slate-100 mt-1 pt-1 px-3">
              <Link
                href="/leads"
                onClick={() => setIsSearchOpen(false)}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center justify-between py-1"
              >
                <span>View all Candidates</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Right side: Add Candidate Button + Role Badge */}
      <div className="flex items-center gap-3">
        {/* + Add Candidate Button */}
        <button
          onClick={onOpenAddLeadModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Candidate</span>
        </button>

        {/* My Profile Button */}
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl transition-all shadow-2xs group cursor-pointer"
          title="My Profile, Password & Settings"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 overflow-hidden flex items-center justify-center font-bold text-blue-700 text-xs shrink-0">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              (currentUser?.name || "ME").slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-bold text-slate-800 leading-tight">
              {currentUser?.name || "My Profile"}
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold leading-none">
              {currentUser?.role || "Staff"}
            </span>
          </div>
          <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </button>

        {/* Role & Telecaller Switcher Dropdown */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-xs"
          >
            {isOwner ? (
              <>
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-blue-900">👑 Owner Mode</span>
              </>
            ) : (
              <>
                <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-emerald-900">{activeUserRole}</span>
              </>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
              {/* My Profile Quick Option */}
              <button
                onClick={() => {
                  setIsRoleDropdownOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50/70 transition-colors border-b border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>My Profile & Settings</span>
                </div>
                <Settings className="w-3 h-3 text-blue-500" />
              </button>
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Management Roles
              </div>
              <button
                onClick={() => {
                  setIsRoleDropdownOpen(false);
                  if (currentUser?.role === "Owner" && isManagementUnlocked) {
                    setActiveUserRole("Owner");
                  } else {
                    setAuthTargetRole("Owner");
                    setIsAuthModalOpen(true);
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>👑 Owner (Thavabalan)</span>
                </div>
                {isOwner && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>

              <div className="border-t border-slate-100 my-1" />
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Admins (Full Access)
              </div>
              <button
                onClick={() => {
                  setIsRoleDropdownOpen(false);
                  if (currentUser?.role === "Admin" && isManagementUnlocked) {
                    setActiveUserRole("Admin (Gopinath)");
                  } else {
                    setAuthTargetRole("Admin");
                    setIsAuthModalOpen(true);
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                  <span>🛡️ Gopinath (HR)</span>
                </div>
                {activeUserRole === "Admin (Gopinath)" && <Check className="w-3.5 h-3.5 text-purple-600" />}
              </button>
              <button
                onClick={() => {
                  setIsRoleDropdownOpen(false);
                  if (currentUser?.role === "Admin" && isManagementUnlocked) {
                    setActiveUserRole("Admin (Vijayakumar)");
                  } else {
                    setAuthTargetRole("Admin");
                    setIsAuthModalOpen(true);
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                  <span>🛡️ Vijayakumar</span>
                </div>
                {activeUserRole === "Admin (Vijayakumar)" && <Check className="w-3.5 h-3.5 text-purple-600" />}
              </button>

              <div className="border-t border-slate-100 my-1" />
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Telecaller Staff
              </div>

              {staffList.map((staff) => {
                const isSelected = activeUserRole === `Telecaller (${staff})` || (activeUserRole === "Telecaller" && staff === "Muthumeena");
                return (
                  <button
                    key={staff}
                    onClick={() => {
                      setActiveUserRole(`Telecaller (${staff})`);
                      setIsRoleDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{staff}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Account Security Login Modal */}
      <SecurityPinModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        targetRole={authTargetRole}
        targetUser={authTargetUser}
        onSuccess={(user) => {
          if (user) {
            setActiveUserRole(user.role);
          } else {
            setActiveUserRole(authTargetRole);
          }
        }}
      />

      {/* My Profile & Settings Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};
