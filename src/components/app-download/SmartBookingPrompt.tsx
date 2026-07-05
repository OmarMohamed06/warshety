"use client";

import { useState } from "react";
import { APP_CONFIG } from "@/config/app-download";
import { AppStoreBadges } from "./AppStoreBadges";

interface Props {
  /** Open/close controlled externally */
  open: boolean;
  onClose: () => void;
  locale?: "en" | "ar";
}

const BENEFITS = [
  {
    icon: "radio_button_checked",
    en: "Real-time status updates",
    ar: "تحديثات الحالة اللحظية",
  },
  { icon: "notifications", en: "Push notifications", ar: "إشعارات فورية" },
  {
    icon: "card_giftcard",
    en: "Rewards points credited",
    ar: "نقاط مكافآت فورية",
  },
  { icon: "replay", en: "Easy rebooking", ar: "إعادة الحجز بسهولة" },
] as const;

export function SmartBookingPrompt({ open, onClose, locale = "en" }: Props) {
  if (!APP_CONFIG.enabled || !APP_CONFIG.features.smartBookingPrompt || !open)
    return null;

  const isAr = locale === "ar";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="fixed inset-x-4 bottom-0 sm:inset-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 max-w-md w-full animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl border border-slate-100 dark:border-slate-800">
          {/* Success icon */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-green-600 dark:text-green-400"
                style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <div>
              <p className="font-black text-base leading-tight">
                {isAr ? "تم الحجز بنجاح!" : "Booking Confirmed!"}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {isAr
                  ? "تتبع حجزك مباشرة في التطبيق"
                  : "Track your booking live in the Warshety app."}
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {BENEFITS.map((b) => (
              <div
                key={b.en}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5"
              >
                <span
                  className="material-symbols-outlined text-[#FF4B19]"
                  style={{ fontSize: 16 }}
                >
                  {b.icon}
                </span>
                <span className="text-xs font-semibold leading-tight">
                  {isAr ? b.ar : b.en}
                </span>
              </div>
            ))}
          </div>

          {/* Store badges */}
          <AppStoreBadges
            direction="col"
            size="md"
            source="booking_success"
            className="w-full [&>a]:w-full [&>a]:justify-center"
          />

          {/* Dismiss */}
          <button
            onClick={onClose}
            className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2 transition-colors"
          >
            {isAr ? "تابع على الموقع" : "Continue on Website"}
          </button>
        </div>
      </div>
    </>
  );
}

/** Convenience hook that shows the prompt once after a fresh booking */
export function useSmartBookingPrompt() {
  const [open, setOpen] = useState(false);
  const trigger = () => setOpen(true);
  const dismiss = () => setOpen(false);
  return { open, trigger, dismiss };
}
