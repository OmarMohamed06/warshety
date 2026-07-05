"use client";

import { APP_CONFIG } from "@/config/app-download";
import { AppStoreBadges } from "./AppStoreBadges";

interface Props {
  locale?: "en" | "ar";
}

export function ServiceCenterAppCTA({ locale = "en" }: Props) {
  if (!APP_CONFIG.enabled || !APP_CONFIG.features.serviceCenterCTA) return null;
  const isAr = locale === "ar";

  return (
    <div
      className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#FF4B19]/10 flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-[#FF4B19]"
            style={{ fontSize: 18 }}
          >
            phone_iphone
          </span>
        </div>
        <div>
          <p className="font-black text-sm">
            {isAr ? "تفضّل الموبايل؟" : "Prefer mobile?"}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
            {isAr
              ? "احجز في ثوانٍ، استقبل تحديثات مباشرة، واكسب مكافآت مع تطبيق ورشتي."
              : "Book in seconds, receive live updates, and earn rewards with the Warshety app."}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <AppStoreBadges size="sm" source="service_center" />
        <a
          href="#booking"
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            language
          </span>
          {isAr ? "تابع على الموقع" : "Continue on Website"}
        </a>
      </div>
    </div>
  );
}
