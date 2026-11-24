"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users2,
  PhoneCall,
  CalendarClock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Shield,
  Headphones,
  Settings,
  GitBranch,
} from "lucide-react";
import { WeGrowLogo } from "@/components/shared/WeGrowLogo";
import { useCRM } from "@/context/CRMContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onMobileClose,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const { followUps, activeUserRole, setActiveUserRole } = useCRM();

  // Badges calculation
  const pendingFollowUpCount = followUps.filter(
    (f) => f.status === "Today" || f.status === "Overdue" || (f.status as string) === "Pending"
  ).length;

  const isOwner = activeUserRole === "Owner" || activeUserRole === "Owner / MD";
  const isAdmin = activeUserRole === "Admin";
  const isManagement = isOwner || isAdmin;

  const navItems = isManagement
    ? [
        {
          title: "Dashboard",
          href: "/",
          icon: LayoutDashboard,
        },
        {
          title: "Candidates Pool",
          href: "/leads",
          icon: Users2,
        },
        {
          title: "Job Deals Pipeline",
          href: "/pipeline",
          icon: GitBranch,
        },
        {
          title: "Call History & Logs",
          href: "/calls",
          icon: PhoneCall,
        },
        {
          title: "Follow-up Tasks",
          href: "/follow-ups",
          icon: CalendarClock,
          badge: pendingFollowUpCount > 0 ? pendingFollowUpCount : undefined,
          badgeColor: "bg-amber-500",
        },
        {
          title: "Staff & Attendance",
          href: "/team",
          icon: UserCheck,
        },
        {
          title: "Performance Reports",
          href: "/reports",
          icon: BarChart3,
        },
        {
          title: "System Settings",
          href: "/settings",
          icon: Settings,
        },
      ]
    : [
        {
          title: "Telecaller Desk",
          href: "/",
          icon: LayoutDashboard,
        },
        {
          title: "My Candidates Queue",
          href: "/leads",
          icon: Users2,
        },
        {
          title: "Job Deals Pipeline",
          href: "/pipeline",
          icon: GitBranch,
        },
        {
          title: "My Call Logs",
          href: "/calls",
          icon: PhoneCall,
        },
        {
          title: "Scheduled Follow-ups",
          href: "/follow-ups",
          icon: CalendarClock,
          badge: pendingFollowUpCount > 0 ? pendingFollowUpCount : undefined,
          badgeColor: "bg-amber-500",
        },
        {
          title: "My Preferences",
          href: "/settings",
          icon: Settings,
        },
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container - Light Executive Theme */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white text-slate-700 transition-all duration-300 ease-in-out border-r border-slate-200 select-none shadow-sm",
          collapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header with WeGrow JobZ Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 bg-white">
          <Link href="/" className="flex items-center" onClick={onMobileClose}>
            <WeGrowLogo collapsed={collapsed} size="md" />
          </Link>
          <button
            onClick={handleToggleCollapse}
            aria-label="Toggle Sidebar"
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 3 Roles Switcher: Owner vs Admin vs Telecaller */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-2">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Role View
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  isOwner ? "bg-blue-100 text-blue-700" :
                  isAdmin ? "bg-purple-100 text-purple-700" :
                  "bg-emerald-100 text-emerald-700"
                )}>
                  {isOwner ? "Owner" : isAdmin ? "Admin" : "Telecaller"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-lg text-center">
                <button
                  type="button"
                  onClick={() => setActiveUserRole("Owner")}
                  className={cn(
                    "flex items-center justify-center gap-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                    isOwner
                      ? "bg-white text-blue-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Executive Owner & Management View"
                >
                  <Shield className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>Owner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUserRole("Admin")}
                  className={cn(
                    "flex items-center justify-center gap-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                    isAdmin
                      ? "bg-white text-purple-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Supervisor Admin Floor & Allocation View"
                >
                  <UserCheck className="w-3 h-3 text-purple-600 shrink-0" />
                  <span>Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUserRole("Telecaller")}
                  className={cn(
                    "flex items-center justify-center gap-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                    !isManagement
                      ? "bg-white text-emerald-800 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Calling Floor Agent Desk"
                >
                  <Headphones className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Caller</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150",
                  isActive
                    ? "bg-blue-50/80 text-blue-900 font-bold border border-blue-200/70 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.title : undefined}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-full" />
                )}

                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />

                {!collapsed && (
                  <span className="truncate flex-1 text-[13.5px]">{item.title}</span>
                )}

                {!collapsed && item.badge !== undefined && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-full text-white shadow-xs",
                      item.badgeColor || "bg-amber-500"
                    )}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Badge Dot */}
                {collapsed && item.badge !== undefined && (
                  <span
                    className={cn(
                      "absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white",
                      item.badgeColor || "bg-amber-500"
                    )}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div
            className={cn(
              "flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/60 shadow-xs",
              collapsed && "justify-center p-1"
            )}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs ring-1 ring-blue-300">
              {isOwner ? "OW" : "TC"}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {isOwner ? "Thavabalan" : "Telecalling Staff"}
                </p>
                <p className="text-[10px] font-medium text-slate-500 truncate">
                  {isOwner ? "WeGrow Jobz Owner" : "Active Telecaller"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
