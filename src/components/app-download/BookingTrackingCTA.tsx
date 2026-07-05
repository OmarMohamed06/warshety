"use client";

import { APP_CONFIG } from "@/config/app-download";
import { AppStoreBadges } from "./AppStoreBadges";

interface Props {
  locale?: "en" | "ar";
}

export function BookingTrackingCTA({ locale = "en" }: Props) {
  if (!APP_CONFIG.enabled || !APP_CONFIG.features.bookingTrackingCTA)
    return null;
  const isAr = locale === "ar";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(APP_CONFIG.urls.download)}&bgcolor=ffffff&color=FF4B19&qzone=1`;

  return (
    <div
      className="bg-gradient-to-br from-slate-900 to-[#1a0800] rounded-3xl p-6 text-white mt-6"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* QR code */}
        <div className="shrink-0 hidden sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Scan to download the Warshety app"
            width={80}
            height={80}
            className="rounded-xl"
            loading="lazy"
          />
        </div>

        <div className="flex-1">
          {/* Icon + label */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="material-symbols-outlined text-[#FF4B19]"
              style={{ fontSize: 18 }}
            >
              smartphone
            </span>
            <span className="text-[#FF4B19] text-xs font-bold uppercase tracking-wider">
              {isAr ? "ورشتي للموبايل" : "Warshety Mobile"}
            </span>
          </div>

          <p className="font-black text-base leading-tight mb-1">
            {isAr
              ? "للتحديثات المباشرة والإشعارات، استخدم تطبيق ورشتي."
              : "For live updates and notifications, use the Warshety app."}
          </p>
          <p className="text-slate-300 text-xs mb-4">
            {isAr
              ? "تتبع حجزك خطوة بخطوة واستقبل إشعارات فورية عند كل تحديث."
              : "Track your booking step-by-step and get instant push notifications on every update."}
          </p>

          <AppStoreBadges size="sm" source="booking_tracking" />
        </div>
      </div>
    </div>
  );
}
