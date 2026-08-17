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
      className="relative overflow-hidden bg-slate-900 py-20 sm:py-28"
      dir={isAr ? "rtl" : "ltr"}
    >

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Text side */}
          <div className="flex-1 text-center lg:text-start">
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
