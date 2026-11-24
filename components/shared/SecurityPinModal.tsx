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
  Snowflake,
  Sparkles,
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
  const { users, currentUser, loginAsUser, setSelfNewPassword } = useCRM();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Forced Self-Service Password Reset Mode (Triggered by Admin/Owner or first login)
  const [isForceResetMode, setIsForceResetMode] = useState<boolean>(false);
  const [newSecretPassword, setNewSecretPassword] = useState<string>("");
  const [confirmSecretPassword, setConfirmSecretPassword] = useState<string>("");
  const [showSecretPassword, setShowSecretPassword] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize selected user based on targetRole or targetUser
  useEffect(() => {
    if (isOpen) {
      setPasswordInput("");
      setErrorMessage("");
      setIsSuccess(false);
      setIsShaking(false);
      setShowPassword(false);
      setIsForceResetMode(false);
      setNewSecretPassword("");
      setConfirmSecretPassword("");
      setResetError("");

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
  const isSelectedFrozen = selectedUser?.isFrozen || selectedUser?.status === "Inactive";

  const handleKeypadPress = (val: string) => {
    if (isForceResetMode) {
      setNewSecretPassword((prev) => prev + val);
      if (resetError) setResetError("");
    } else {
      setPasswordInput((prev) => prev + val);
      if (errorMessage) setErrorMessage("");
    }
    inputRef.current?.focus();
  };

  const handleKeypadBackspace = () => {
    if (isForceResetMode) {
      setNewSecretPassword((prev) => prev.slice(0, -1));
      if (resetError) setResetError("");
    } else {
      setPasswordInput((prev) => prev.slice(0, -1));
      if (errorMessage) setErrorMessage("");
    }
    inputRef.current?.focus();
  };

  const handleKeypadClear = () => {
    if (isForceResetMode) {
      setNewSecretPassword("");
      setConfirmSecretPassword("");
      if (resetError) setResetError("");
    } else {
      setPasswordInput("");
      if (errorMessage) setErrorMessage("");
    }
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSelectedFrozen) {
      setErrorMessage(`Access Suspended: ${selectedUser?.name}'s account is frozen by Management.`);
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMessage("Please enter your account password or PIN.");
      inputRef.current?.focus();
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");

    setTimeout(() => {
      const res = loginAsUser(selectedUserId, passwordInput);
      if (res.requirePasswordChange) {
        setIsVerifying(false);
        setIsForceResetMode(true);
        setNewSecretPassword("");
        setConfirmSecretPassword("");
        setResetError("");
        return;
      }

      if (res.success) {
        setIsSuccess(true);
        setIsVerifying(false);
        setTimeout(() => {
          onSuccess?.(res.user || selectedUser);
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

  const handleForceResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    if (!newSecretPassword.trim()) {
      setResetError("Please enter your new confidential password.");
      return;
    }

    if (newSecretPassword !== confirmSecretPassword) {
      setResetError("New password and confirm password do not match.");
      return;
    }

    if (newSecretPassword.trim().length < 3) {
      setResetError("Password must be at least 3 characters or digits.");
      return;
    }

    const res = setSelfNewPassword(selectedUserId, newSecretPassword);
    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess?.(selectedUser);
        onClose();
      }, 400);
    } else {
      setResetError(res.error || "Failed to set password. Try again.");
    }
  };

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
            {isForceResetMode ? (
              <Sparkles className="w-7 h-7 text-emerald-600 animate-pulse" />
            ) : isOwnerTarget ? (
              <Crown className="w-7 h-7 text-blue-600" />
            ) : isAdminTarget ? (
              <Shield className="w-7 h-7 text-purple-600" />
            ) : (
              <KeyRound className="w-7 h-7 text-emerald-600" />
            )}
          </div>

          <h3 className="font-black text-slate-900 text-lg tracking-tight">
            {isForceResetMode ? "Set Your Confidential Password" : "Account Security Login"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isForceResetMode
              ? "Management has reset your access. Please set your own private password."
              : "Enter your personal password / PIN to access this account."}
          </p>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* User Account Selector (Only shown in normal login mode) */}
          {!isForceResetMode && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Select Staff Profile:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200/80 rounded-2xl scrollbar-thin">
                {users.map((u) => {
                  const isSelected = u.id === selectedUserId;
                  const roleBadge = getRoleBadge(u.role);
                  const isFrozen = u.isFrozen || u.status === "Inactive";

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
                      className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border relative ${
                        isSelected
                          ? "bg-white border-blue-600 shadow-xs ring-2 ring-blue-100"
                          : "bg-white/60 border-slate-200/60 hover:bg-white hover:border-slate-300"
                      } ${isFrozen ? "opacity-75 bg-slate-100/80" : ""}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-200 font-black text-slate-700 text-[11px] flex items-center justify-center shrink-0 overflow-hidden">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                            {u.name}
                          </p>
                          {isFrozen && <Snowflake className="w-3 h-3 text-sky-600 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 truncate">
                            {roleBadge.label}
                          </span>
                          {u.mustChangePassword && (
                            <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-1 rounded-xs">
                              Reset
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Profile Info Banner */}
          {selectedUser && (
            <div className={`flex items-center justify-between p-3 rounded-2xl border ${
              isSelectedFrozen ? "bg-rose-50/70 border-rose-200" : "bg-slate-50/80 border-slate-200"
            }`}>
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
                  <p className="text-[10px] text-slate-500">
                    Last login: {selectedUser.lastLoginAt || "First login"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isSelectedFrozen ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-200 flex items-center gap-1">
                    <Snowflake className="w-3 h-3 text-rose-600" />
                    <span>Frozen</span>
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${currentBadge.bg}`}
                  >
                    <BadgeIcon className="w-3 h-3" />
                    <span>{currentBadge.label}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Frozen Account Warning Banner */}
          {isSelectedFrozen && !isForceResetMode && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-rose-600 shrink-0" />
              <span>This account is temporarily frozen by Management. Contact Owner/Admin to unlock.</span>
            </div>
          )}

          {/* =========================================================
              VIEW 1: REGULAR PASSWORD LOGIN FORM
          ========================================================== */}
          {!isForceResetMode ? (
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
                    disabled={isVerifying || isSuccess || isSelectedFrozen}
                    placeholder={`Password for ${selectedUser?.name || "account"}`}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-sm font-semibold tracking-wider outline-none focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50"
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

              {/* Quick Numeric Keypad */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isSelectedFrozen}
                    onClick={() => handleKeypadPress(num.toString())}
                    className="py-2.5 bg-slate-50 hover:bg-blue-50 active:bg-blue-100 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-40"
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
                  disabled={isSelectedFrozen}
                  onClick={() => handleKeypadPress("0")}
                  className="py-2.5 bg-slate-50 hover:bg-blue-50 active:bg-blue-100 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-40"
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
                disabled={isVerifying || isSuccess || isSelectedFrozen}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isVerifying ? "Verifying..." : `Unlock as ${selectedUser?.name}`}</span>
              </button>

              {/* Initial Passwords Hint */}
              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-[11px] text-slate-400">
                  💡 Passwords: <span className="font-semibold text-slate-600">Thavabalan: 7708</span> •{" "}
                  <span className="font-semibold text-slate-600">Gopinath: 5678</span> •{" "}
                  <span className="font-semibold text-slate-600">Vijay: 9944</span> •{" "}
                  <span className="font-semibold text-slate-600">Muthumeena: 1234</span>
                </p>
              </div>
            </form>
          ) : (
            /* =========================================================
                VIEW 2: FORCED ZERO-KNOWLEDGE PRIVATE PASSWORD SETUP
            ========================================================== */
            <form onSubmit={handleForceResetSubmit} className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Choose Your Private Confidential Password</span>
                </h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed mt-1">
                  Management has triggered a password reset for you. Please type your preferred new password.
                  Neither Owner nor Admin will see this password.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Your New Secret Password / PIN:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecretPassword(!showSecretPassword)}
                    className="text-[11px] text-blue-600 font-semibold flex items-center gap-1"
                  >
                    {showSecretPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSecretPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <input
                  type={showSecretPassword ? "text" : "password"}
                  required
                  placeholder="Enter your new private password (min 3 chars)"
                  value={newSecretPassword}
                  onChange={(e) => {
                    setNewSecretPassword(e.target.value);
                    if (resetError) setResetError("");
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-600 rounded-xl text-sm font-semibold tracking-wider outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password:
                </label>
                <input
                  type={showSecretPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter your new password to confirm"
                  value={confirmSecretPassword}
                  onChange={(e) => {
                    setConfirmSecretPassword(e.target.value);
                    if (resetError) setResetError("");
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-600 rounded-xl text-sm font-semibold tracking-wider outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              {resetError && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {isSuccess && (
                <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Password saved! Entering desk...</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Password & Unlock Desk</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
