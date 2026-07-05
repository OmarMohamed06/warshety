"use client";

import { APP_CONFIG } from "@/config/app-download";
import { AppStoreBadges } from "./AppStoreBadges";
import { PhoneMockup } from "./PhoneMockup";

const FEATURES = [
  {
    icon: "radio_button_checked",
    label: "Live Booking Tracking",
    labelAr: "تتبع الحجز المباشر",
  },
  {
    icon: "card_giftcard",
    label: "Rewards & Loyalty",
    labelAr: "مكافآت وولاء",
  },
  { icon: "directions_car", label: "My Garage", labelAr: "كراجي" },
  { icon: "bolt", label: "Faster Booking", labelAr: "حجز أسرع" },
  {
    icon: "notifications",
    label: "Push Notifications",
    labelAr: "إشعارات فورية",
  },
] as const;

interface Props {
  locale?: "en" | "ar";
}

export function AppDownloadHero({ locale = "en" }: Props) {
  if (!APP_CONFIG.enabled || !APP_CONFIG.features.hero) return null;
  const isAr = locale === "ar";

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a0800] py-20 sm:py-28"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -end-32 w-96 h-96 bg-[#FF4B19]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -start-32 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Text side */}
          <div className="flex-1 text-center lg:text-start">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 bg-[#FF4B19]/15 border border-[#FF4B19]/25 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#FF4B19] animate-pulse" />
              <span className="text-[#FF4B19] text-xs font-bold tracking-wider uppercase">
                {isAr
                  ? "تطبيق ورشتي متاح الآن"
                  : "Warshety App — Available Now"}
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5">
              {isAr ? (
                <>
                  كل ما تحتاجه لإدارة سيارتك{" "}
                  <span className="text-[#FF4B19]">في جيبك</span>
                </>
              ) : (
                <>
                  Everything you need to manage your car,{" "}
                  <span className="text-[#FF4B19]">right in your pocket.</span>
                </>
              )}
            </h2>

            <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              {isAr
                ? "احجز مراكز خدمة موثوقة، تتبع حجوزاتك مباشرة، أدر كراجك، اكسب مكافآت، واستقبل عروضاً حصرية."
                : "Book trusted service centers, track your bookings live, manage your garage, earn rewards, and receive exclusive offers."}
            </p>

            {/* Store badges */}
            <div className="flex justify-center lg:justify-start mb-10">
              <AppStoreBadges size="lg" source="hero" />
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2.5 justify-center lg:justify-start">
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-3.5 py-2 backdrop-blur-sm"
                >
                  <span
                    className="material-symbols-outlined text-[#FF4B19]"
                    style={{ fontSize: 14 }}
                  >
                    {f.icon}
                  </span>
                  <span className="text-white text-xs font-semibold">
                    {isAr ? f.labelAr : f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative flex-shrink-0">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
