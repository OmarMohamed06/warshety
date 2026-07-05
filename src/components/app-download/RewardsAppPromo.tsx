"use client";

import { APP_CONFIG } from "@/config/app-download";
import { AppStoreBadges } from "./AppStoreBadges";

const BENEFITS = [
  {
    icon: "star",
    en: "Exclusive app-only rewards",
    ar: "مكافآت حصرية للتطبيق",
  },
  {
    icon: "qr_code_2",
    en: "QR vouchers on your phone",
    ar: "قسائم QR على هاتفك",
  },
  {
    icon: "insights",
    en: "Loyalty progress tracker",
    ar: "متابعة تقدم الولاء",
  },
  { icon: "campaign", en: "App-only campaigns", ar: "حملات خاصة بالتطبيق" },
] as const;

interface Props {
  locale?: "en" | "ar";
}

export function RewardsAppPromo({ locale = "en" }: Props) {
  if (!APP_CONFIG.enabled || !APP_CONFIG.features.rewardsPromo) return null;
  const isAr = locale === "ar";

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-[#FF4B19]/10 border border-amber-500/20 dark:border-amber-500/15 p-6 mt-8"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Glow */}
      <div className="absolute -top-10 -end-10 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Left: icon + text */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
              >
                card_giftcard
              </span>
            </div>
            <span className="text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
              {isAr ? "تطبيق ورشتي" : "Warshety App"}
            </span>
          </div>

          <p className="font-black text-lg leading-tight mb-1">
            {isAr
              ? "اكسب واستبدل مكافآتك بشكل أسرع في التطبيق."
              : "Earn and redeem rewards faster in the Warshety app."}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            {isAr
              ? "عروض حصرية ومكافآت إضافية متاحة فقط لمستخدمي التطبيق."
              : "Exclusive offers and bonus rewards available only for app users."}
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {BENEFITS.map((b) => (
              <div key={b.en} className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-amber-500"
                  style={{ fontSize: 14 }}
                >
                  {b.icon}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {isAr ? b.ar : b.en}
                </span>
              </div>
            ))}
          </div>

          <AppStoreBadges size="sm" source="rewards_page" />
        </div>
      </div>
    </div>
  );
}
