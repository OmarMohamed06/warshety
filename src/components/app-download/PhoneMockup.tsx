"use client";

import { cn } from "@/lib/utils";

/**
 * PhoneMockup — CSS-only iPhone-style frame with a stylized app screen.
 * No external assets required. Purely illustrative.
 */
export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto select-none",
        "w-[220px] sm:w-[260px]",
        className,
      )}
      aria-hidden
    >
      {/* Outer frame */}
      <div className="relative rounded-[3rem] bg-slate-900 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.6)] ring-[6px] ring-slate-800 p-3">
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-full z-10" />

        {/* Screen */}
        <div className="rounded-[2.25rem] overflow-hidden bg-gradient-to-br from-[#0f0f0f] to-[#1a1a2e] aspect-[9/19.5] relative">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-7 pb-2">
            <span className="text-white text-[8px] font-bold">9:41</span>
            <div className="flex gap-1.5 items-center">
              <div className="flex gap-0.5 items-end">
                {[3, 5, 7, 9].map((h) => (
                  <div
                    key={h}
                    className="w-[2px] bg-white rounded-sm"
                    style={{ height: h }}
                  />
                ))}
              </div>
              <div className="w-3 h-2 border border-white rounded-[2px] relative">
                <div className="absolute inset-[1px] bg-white rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* App header */}
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#FF4B19] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            </div>
            <span className="text-white text-[10px] font-black">Warshety</span>
          </div>

          {/* Booking card */}
          <div className="mx-3 mt-1 bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-[9px] font-bold">
                Active Booking
              </span>
              <span className="bg-[#FF4B19] text-white text-[7px] font-bold px-2 py-0.5 rounded-full">
                IN PROGRESS
              </span>
            </div>
            <p className="text-white/70 text-[8px]">Toyota Camry 2022</p>
            <p className="text-white text-[9px] font-semibold mt-0.5">
              AutoCare Cairo — Oil Change
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF4B19] rounded-full"
                style={{ width: "65%" }}
              />
            </div>
          </div>

          {/* Points card */}
          <div className="mx-3 mt-2 bg-gradient-to-r from-[#FF4B19]/30 to-amber-500/20 backdrop-blur-sm rounded-2xl p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#FF4B19] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
              </svg>
            </div>
            <div>
              <p className="text-amber-300 text-[9px] font-bold">
                1,250 Points
              </p>
              <p className="text-white/50 text-[7px]">
                Earn more with bookings
              </p>
            </div>
          </div>

          {/* Garage row */}
          <div className="mx-3 mt-2">
            <p className="text-white/50 text-[8px] mb-1.5 font-semibold">
              MY GARAGE
            </p>
            <div className="flex gap-2">
              {["Toyota", "BMW"].map((make) => (
                <div
                  key={make}
                  className="flex-1 bg-white/10 rounded-xl p-2 text-center"
                >
                  <div className="w-6 h-6 bg-white/20 rounded-lg mx-auto mb-1 flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 fill-white/70"
                    >
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                    </svg>
                  </div>
                  <p className="text-white text-[7px] font-semibold">{make}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm border-t border-white/10 flex items-center justify-around px-4 py-2">
            {[
              "home",
              "calendar_month",
              "garage",
              "card_giftcard",
              "person",
            ].map((icon, i) => (
              <div
                key={icon}
                className={cn(
                  "flex flex-col items-center gap-0.5",
                  i === 0 ? "text-[#FF4B19]" : "text-white/40",
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-sm",
                    i === 0 ? "bg-[#FF4B19]" : "bg-white/20",
                  )}
                />
                <div className="w-3 h-0.5 rounded-full bg-current opacity-60" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-16 bg-[#FF4B19]/30 blur-2xl rounded-full pointer-events-none" />
    </div>
  );
}
