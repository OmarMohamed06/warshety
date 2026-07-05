"use client";

import { useEffect, useState } from "react";
import { APP_CONFIG } from "@/config/app-download";
import { useLanguage } from "@/context/LanguageContext";

const STORAGE_KEY = "warshety_app_banner_dismissed";

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(STORAGE_KEY);
    if (!ts) return false;
    const days = APP_CONFIG.bannerDismissDays;
    return Date.now() - parseInt(ts) < days * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}

export function FloatingAppBanner() {
  const { locale } = useLanguage();
  const isAr = locale === "ar";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      !APP_CONFIG.enabled ||
      !APP_CONFIG.features.floatingBanner ||
      !isMobileBrowser() ||
      isDismissed()
    )
      return;
    // Small delay so it doesn't flash on initial paint
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const storeUrl = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? APP_CONFIG.urls.ios
    : APP_CONFIG.urls.android;

  return (
    <div
      className="fixed bottom-[66px] sm:bottom-4 left-3 right-3 z-50 animate-in slide-in-from-bottom-4 duration-300"
      dir={isAr ? "rtl" : "ltr"}
      role="banner"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/20 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
        {/* App icon */}
        <div className="w-12 h-12 bg-[#FF4B19] rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-[#FF4B19]/30">
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: 22 }}
          >
            directions_car
          </span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-tight">Warshety</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {isAr
              ? "افتح في التطبيق لتجربة أسرع وأفضل"
              : "Open in the app for a faster experience."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              dismiss();
              setVisible(false);
            }}
            aria-label="Dismiss"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              close
            </span>
          </button>
          <a
            href={APP_CONFIG.urls.deepLink}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {isAr ? "فتح" : "Open"}
          </a>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-black text-white bg-[#FF4B19] rounded-xl px-3 py-2 hover:opacity-90 transition"
          >
            {isAr ? "تنزيل" : "Download"}
          </a>
        </div>
      </div>
    </div>
  );
}
