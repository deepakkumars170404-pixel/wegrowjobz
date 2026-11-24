"use client";

import React, { useState, useRef, useEffect } from "react";
import { Shield, ShieldAlert, Lock, X, CheckCircle2, Delete, KeyRound } from "lucide-react";
import { useCRM } from "@/context/CRMContext";

interface SecurityPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: "Owner" | "Admin";
  onSuccess: () => void;
}

export function SecurityPinModal({
  isOpen,
  onClose,
  targetRole,
  onSuccess,
}: SecurityPinModalProps) {
  const { verifySecurityPin } = useCRM();

  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-focus first input on open
  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", ""]);
      setErrorMessage("");
      setIsSuccess(false);
      setIsShaking(false);
      setTimeout(() => {
        inputRefs[0]?.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    if (errorMessage) setErrorMessage("");

    // Auto-advance
    if (char && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }

    // Auto-check on 4th digit entered
    if (char && index === 3) {
      const fullPin = updated.join("");
      checkPin(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handleKeypadPress = (num: string) => {
    const firstEmpty = digits.findIndex((d) => d === "");
    if (firstEmpty !== -1) {
      handleDigitChange(firstEmpty, num);
    }
  };

  const handleKeypadBackspace = () => {
    const lastFilled = [...digits].reverse().findIndex((d) => d !== "");
    if (lastFilled !== -1) {
      const idx = 3 - lastFilled;
      const updated = [...digits];
      updated[idx] = "";
      setDigits(updated);
      inputRefs[idx]?.current?.focus();
      if (errorMessage) setErrorMessage("");
    }
  };

  const handleKeypadClear = () => {
    setDigits(["", "", "", ""]);
    setErrorMessage("");
    inputRefs[0]?.current?.focus();
  };

  const checkPin = (pin: string) => {
    setIsVerifying(true);
    setTimeout(() => {
      const valid = verifySecurityPin(pin);
      if (valid) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsVerifying(false);
          onSuccess();
          onClose();
        }, 500);
      } else {
        setIsVerifying(false);
        setIsShaking(true);
        setErrorMessage("Access Denied! Unauthorized attempt. Invalid PIN.");
        setDigits(["", "", "", ""]);
        setTimeout(() => {
          setIsShaking(false);
          inputRefs[0]?.current?.focus();
        }, 600);
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col transition-all duration-200 ${
          isShaking ? "animate-[shake_0.5s_ease-in-out]" : ""
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center relative border-b border-slate-100 bg-gradient-to-b from-purple-50/70 to-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 shadow-inner ring-4 ring-purple-50">
            <Shield className="w-7 h-7 text-purple-600" />
          </div>

          <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
            Executive Security PIN
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Enter 4-digit Management PIN to unlock{" "}
            <span className="font-bold text-purple-700">{targetRole} View</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* 4 Digit Boxes */}
          <div className="flex justify-center items-center gap-3">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isVerifying || isSuccess}
                className={`w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 transition-all outline-none ${
                  isSuccess
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : errorMessage
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : digit
                    ? "border-purple-600 bg-purple-50/30 text-purple-900 shadow-sm"
                    : "border-slate-200 bg-slate-50 focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-100"
                }`}
              />
            ))}
          </div>

          {/* Success / Error Messages */}
          {isSuccess && (
            <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PIN Verified! Unlocking {targetRole}...</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* On-Screen Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num.toString())}
                className="py-3 bg-slate-50 hover:bg-purple-50 active:bg-purple-100 border border-slate-200/80 rounded-2xl text-base font-bold text-slate-800 transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-2xl transition-all active:scale-95 cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="py-3 bg-slate-50 hover:bg-purple-50 active:bg-purple-100 border border-slate-200/80 rounded-2xl text-base font-bold text-slate-800 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Backspace"
            >
              <Delete className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="pt-2 text-center border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              Default System PIN: <strong className="font-mono text-purple-700">7708</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
