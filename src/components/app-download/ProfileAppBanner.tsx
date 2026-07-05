"use client";

import { APP_CONFIG } from "@/config/app-download";
import { AppStoreBadges } from "./AppStoreBadges";

const BENEFITS = [
  {
    icon: "fingerprint",
    en: "Face ID / Fingerprint login",
    ar: "تسجيل بصمة / Face ID",
  },
  {
    icon: "notifications_active",
    en: "Instant push notifications",
    ar: "إشعارات فورية",
  },
  { icon: "bolt", en: "Faster bookings", ar: "حجز أسرع" },
  {
    icon: "cloud_off",
    en: "Offline booking history",
    ar: "سجل الحجوزات بدون إنترنت",
  },
  {
    icon: "phone_iphone",
    en: "Better mobile experience",
    ar: "تجربة موبايل محسّنة",
  },
] as const;

interface Props {
  locale?: "en" | "ar";
}

export function ProfileAppBanner({ locale = "en" }: Props) {
  if (!APP_CONFIG.enabled || !APP_CONFIG.features.profileBanner) return null;
  const isAr = locale === "ar";

  return (
    <div
      className="bg-gradient-to-br from-[#FF4B19] to-orange-600 rounded-3xl p-6 text-white mt-6 relative overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Decorative circles */}
      <div className="absolute -top-12 -end-12 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
      <div className="absolute -bottom-8 -start-8 w-28 h-28 bg-black/10 rounded-full pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="material-symbols-outlined text-white/80"
            style={{ fontSize: 18 }}
          >
            phone_iphone
          </span>
          <span className="text-white/80 text-xs font-bold uppercase tracking-wider">
            {isAr ? "تطبيق ورشتي" : "Warshety App"}
          </span>
        </div>

        <p className="font-black text-xl leading-tight mb-1">
          {isAr
            ? "حمّل تطبيق ورشتي للتجربة الكاملة."
            : "Download the Warshety app for the complete experience."}
        </p>
        <p className="text-white/80 text-sm mb-5">
          {isAr
            ? "الميزات المتقدمة متاحة فقط على التطبيق."
            : "Advanced features are available exclusively on the app."}
        </p>

        {/* Benefits */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
          {BENEFITS.map((b) => (
            <div key={b.en} className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
              >
                {b.icon}
              </span>
              <span className="text-white text-xs font-semibold">
                {isAr ? b.ar : b.en}
              </span>
            </div>
          ))}
        </div>

        {/* Badges (inverted for readability on orange bg) */}
        <div className="flex flex-wrap gap-3">
          <a
            href={APP_CONFIG.urls.ios}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-black/30 hover:bg-black/40 transition border border-white/20 text-white rounded-2xl px-4 py-2.5 text-sm font-bold"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
          </a>
          <a
            href={APP_CONFIG.urls.android}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-black/30 hover:bg-black/40 transition border border-white/20 text-white rounded-2xl px-4 py-2.5 text-sm font-bold"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
              <path d="M3.18 23.76A1 1 0 0 1 3 23.1V.9A1 1 0 0 1 3.18.24l11.27 11.76zm1.87-.9 10.14-5.76-2.27-2.37zm10.14-14.76L5.05 2.14l7.87 8.21zM16.82 7.1 13.6 12l3.22 4.9 4.1-2.34a1 1 0 0 0 0-1.72z" />
            </svg>
            Google Play
          </a>
        </div>
      </div>
    </div>
  );
}
