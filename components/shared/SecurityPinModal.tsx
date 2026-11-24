"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  Lock,
  X,
  CheckCircle2,
  Delete,
  Eye,
  EyeOff,
  UserCheck,
  Headphones,
  Crown,
  KeyRound,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { AppUser } from "@/types";

interface SecurityPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole?: "Owner" | "Admin" | "Telecaller";
  targetUser?: AppUser | null;
  onSuccess?: (user?: AppUser) => void;
}

export function SecurityPinModal({
  isOpen,
  onClose,
  targetRole = "Owner",
  targetUser = null,
  onSuccess,
}: SecurityPinModalProps) {
  const { users, currentUser, loginAsUser } = useCRM();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize selected user based on targetRole or targetUser
  useEffect(() => {
    if (isOpen) {
      setPasswordInput("");
      setErrorMessage("");
      setIsSuccess(false);
      setIsShaking(false);
      setShowPassword(false);

      if (targetUser) {
        setSelectedUserId(targetUser.id);
      } else if (targetRole === "Owner") {
        const ownerUser = users.find((u) => u.role === "Owner" || u.role === "Owner / MD");
        setSelectedUserId(ownerUser ? ownerUser.id : users[0]?.id || "");
      } else if (targetRole === "Admin") {
        const adminUser = users.find((u) => u.role === "Admin");
        setSelectedUserId(adminUser ? adminUser.id : users[1]?.id || "");
      } else {
        const callerUser = users.find((u) => u.role === "Telecaller");
        setSelectedUserId(callerUser ? callerUser.id : currentUser?.id || users[0]?.id || "");
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    }
  }, [isOpen, targetRole, targetUser, users, currentUser]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  const handleKeypadPress = (val: string) => {
    setPasswordInput((prev) => prev + val);
    if (errorMessage) setErrorMessage("");
    inputRef.current?.focus();
  };

  const handleKeypadBackspace = () => {
    setPasswordInput((prev) => prev.slice(0, -1));
    if (errorMessage) setErrorMessage("");
    inputRef.current?.focus();
  };

  const handleKeypadClear = () => {
    setPasswordInput("");
    if (errorMessage) setErrorMessage("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMessage("Please enter your account password or PIN.");
      inputRef.current?.focus();
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");

    setTimeout(() => {
      const res = loginAsUser(selectedUserId, passwordInput);
      if (res.success) {
        setIsSuccess(true);
        setIsVerifying(false);
        setTimeout(() => {
          onSuccess?.(selectedUser);
          onClose();
        }, 400);
      } else {
        setIsVerifying(false);
        setIsShaking(true);
        setErrorMessage(res.error || `Incorrect password for ${selectedUser?.name || "account"}.`);
        setPasswordInput("");
        setTimeout(() => {
          setIsShaking(false);
          inputRef.current?.focus();
        }, 600);
      }
    }, 250);
  };

  // Filter staff by category for quick selector tabs
  const isOwnerTarget = targetRole === "Owner";
  const isAdminTarget = targetRole === "Admin";

  const getRoleBadge = (role: string) => {
    if (role === "Owner" || role === "Owner / MD") {
      return {
        bg: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Crown,
        label: "Owner",
      };
    }
    if (role === "Admin") {
      return {
        bg: "bg-purple-100 text-purple-800 border-purple-200",
        icon: UserCheck,
        label: "Admin",
      };
    }
    return {
      bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: Headphones,
      label: "Telecaller",
    };
  };

  const currentBadge = getRoleBadge(selectedUser?.role || "Owner");
  const BadgeIcon = currentBadge.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col transition-all duration-200 ${
          isShaking ? "animate-[shake_0.5s_ease-in-out]" : ""
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 text-center relative border-b border-slate-100 bg-gradient-to-b from-blue-50/70 via-purple-50/30 to-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-md border border-slate-200/80 flex items-center justify-center mb-3 ring-4 ring-blue-50">
            {isOwnerTarget ? (
              <Crown className="w-7 h-7 text-blue-600" />
            ) : isAdminTarget ? (
              <Shield className="w-7 h-7 text-purple-600" />
            ) : (
              <KeyRound className="w-7 h-7 text-emerald-600" />
            )}
          </div>

          <h3 className="font-black text-slate-900 text-lg tracking-tight">
            Account Security Login
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Enter your personal password / PIN to access this account.
          </p>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* User Account Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Select Staff Profile:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200/80 rounded-2xl scrollbar-thin">
              {users.map((u) => {
                const isSelected = u.id === selectedUserId;
                const roleBadge = getRoleBadge(u.role);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setPasswordInput("");
                      setErrorMessage("");
                      inputRef.current?.focus();
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border ${
                      isSelected
                        ? "bg-white border-blue-600 shadow-xs ring-2 ring-blue-100"
                        : "bg-white/60 border-slate-200/60 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-200 font-black text-slate-700 text-[11px] flex items-center justify-center shrink-0 overflow-hidden">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        u.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                        {u.name}
                      </p>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {roleBadge.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Profile Info Banner */}
          {selectedUser && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-blue-700 text-xs">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedUser.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                    {selectedUser.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${currentBadge.bg}`}
              >
                <BadgeIcon className="w-3 h-3" />
                <span>{currentBadge.label}</span>
              </span>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Enter Password / PIN for {selectedUser?.name}:
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  placeholder={`Password for ${selectedUser?.name || "account"}`}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  disabled={isVerifying || isSuccess}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-sm font-semibold tracking-wider outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* Success / Error Messages */}
            {isSuccess && (
              <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified! Welcome back, {selectedUser?.name}...</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick Numeric Keypad for fast PIN login */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num.toString())}
                  className="py-2.5 bg-slate-50 hover:bg-blue-50 active:bg-blue-100 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress("0")}
                className="py-2.5 bg-slate-50 hover:bg-blue-50 active:bg-blue-100 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Backspace"
              >
                <Delete className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isVerifying || isSuccess}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isVerifying ? "Verifying..." : `Unlock as ${selectedUser?.name}`}</span>
            </button>
          </form>

          {/* Helpful Footer Note */}
          <div className="pt-2 text-center border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              💡 Initial Passwords: <span className="font-semibold text-slate-600">Thavabalan: 7708</span> •{" "}
              <span className="font-semibold text-slate-600">Admins: 5678</span> •{" "}
              <span className="font-semibold text-slate-600">Telecallers: 1234</span>. Can be changed anytime in{" "}
              <strong>Settings</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
