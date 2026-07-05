"use client";

import { APP_CONFIG } from "@/config/app-download";
import { AppStoreBadges } from "./AppStoreBadges";
import { PhoneMockup } from "./PhoneMockup";

interface Props {
  locale?: "en" | "ar";
}

export function GarageAppPromo({ locale = "en" }: Props) {
  if (!APP_CONFIG.enabled || !APP_CONFIG.features.garagePromo) return null;
  const isAr = locale === "ar";

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a0800] p-6 sm:p-8 mt-8 text-white"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Background glow */}
      <div className="absolute -bottom-16 -end-16 w-64 h-64 bg-[#FF4B19]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-center gap-8">
        {/* Phone (decorative) */}
        <div className="hidden md:block shrink-0 scale-[0.75] origin-center">
          <PhoneMockup />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="material-symbols-outlined text-[#FF4B19]"
              style={{ fontSize: 18 }}
            >
              garage
            </span>
            <span className="text-[#FF4B19] text-xs font-bold uppercase tracking-wider">
              {isAr ? "كراجي في التطبيق" : "My Garage — Mobile App"}
            </span>
          </div>

          <p className="font-black text-xl leading-tight mb-2">
            {isAr
              ? "إدارة أكثر من سيارة أسهل بكثير في التطبيق."
              : "Managing multiple vehicles is easier in the Warshety app."}
          </p>
          <p className="text-slate-300 text-sm mb-5">
            {isAr
              ? "احفظ سياراتك، تتبع سجل الصيانة، واحجز الخدمة المناسبة من أي مكان."
              : "Save your vehicles, track maintenance history, and book the right service from anywhere."}
          </p>

          {/* Feature list */}
          <ul className="space-y-2 mb-6">
            {[
              {
                en: "Full vehicle maintenance history",
                ar: "سجل الصيانة الكامل لكل سيارة",
              },
              {
                en: "Recall & service alerts",
                ar: "تنبيهات الاستدعاء وخدمة السيارة",
              },
              { en: "Quick booking from garage", ar: "الحجز السريع من الكراج" },
            ].map((item) => (
              <li
                key={item.en}
                className="flex items-center gap-2 text-sm text-slate-200"
              >
                <span
                  className="material-symbols-outlined text-[#FF4B19] shrink-0"
                  style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {isAr ? item.ar : item.en}
              </li>
            ))}
          </ul>

          <AppStoreBadges size="md" source="garage_page" />
        </div>
      </div>
    </div>
  );
}
