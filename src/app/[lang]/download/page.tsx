"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const IOS_STORE_URL = "https://apps.apple.com/app/warshety";
const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.warshety.app";

function detectOS(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

export default function DownloadPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";
  const [os, setOs] = useState<"ios" | "android" | "other">("other");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  // Store referral code in localStorage so the app can pick it up via deep link
  useEffect(() => {
    if (ref) {
      try {
        localStorage.setItem("warshety_referral_code", ref.toUpperCase());
      } catch {
        /* non-fatal */
      }
    }
  }, [ref]);

  // Auto-redirect mobile users to the correct store after a short countdown
  useEffect(() => {
    if (os === "other") return;
    const storeUrl = os === "ios" ? IOS_STORE_URL : ANDROID_STORE_URL;
    if (countdown <= 0) {
      window.location.href = storeUrl;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [os, countdown]);

  const iosUrl = IOS_STORE_URL;
  const androidUrl = ANDROID_STORE_URL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a0a00] flex flex-col items-center justify-center px-6 py-16 text-white">
      {/* Logo / brand */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-20 h-20 bg-[#FF4B19] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#FF4B19]/40">
          <span className="material-symbols-outlined text-4xl text-white">
            directions_car
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Warshety</h1>
        <p className="text-slate-300 text-sm text-center max-w-xs">
          Egypt&apos;s #1 platform for certified auto service centers
        </p>
      </div>

      {/* Referral badge */}
      {ref && (
        <div className="mb-8 bg-amber-500/20 border border-amber-500/30 rounded-2xl px-5 py-4 text-center max-w-sm w-full">
          <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            You were invited by a friend
          </p>
          <p className="text-white font-black text-lg tracking-widest font-mono">
            {ref.toUpperCase()}
          </p>
          <p className="text-slate-300 text-xs mt-1.5">
            Download the app and earn{" "}
            <span className="text-green-400 font-bold">+250 bonus points</span>{" "}
            after your first booking.
          </p>
        </div>
      )}

      {/* Auto-redirect notice */}
      {os !== "other" && (
        <p className="text-slate-400 text-sm mb-6">
          Redirecting to the {os === "ios" ? "App Store" : "Play Store"} in{" "}
          <span className="font-black text-white">{countdown}</span>…
        </p>
      )}

      {/* App store buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <a
          href={iosUrl}
          className="flex-1 flex items-center justify-center gap-2.5 bg-white text-black text-sm font-bold rounded-2xl py-4 px-5 hover:bg-slate-100 transition shadow-lg"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 fill-current shrink-0"
            aria-hidden="true"
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <div className="text-left">
            <p className="text-xs text-slate-500 leading-none font-normal">
              Download on the
            </p>
            <p className="font-black leading-tight">App Store</p>
          </div>
        </a>

        <a
          href={androidUrl}
          className="flex-1 flex items-center justify-center gap-2.5 bg-white text-black text-sm font-bold rounded-2xl py-4 px-5 hover:bg-slate-100 transition shadow-lg"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 fill-current shrink-0"
            aria-hidden="true"
          >
            <path d="M3.18 23.76A1 1 0 0 1 3 23.1V.9A1 1 0 0 1 3.18.24l11.27 11.76zm1.87-.9 10.14-5.76-2.27-2.37zm10.14-14.76L5.05 2.14l7.87 8.21zM16.82 7.1 13.6 12l3.22 4.9 4.1-2.34a1 1 0 0 0 0-1.72z" />
          </svg>
          <div className="text-left">
            <p className="text-xs text-slate-500 leading-none font-normal">
              Get it on
            </p>
            <p className="font-black leading-tight">Google Play</p>
          </div>
        </a>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md text-center text-sm">
        {[
          { icon: "search", label: "Find certified centers" },
          { icon: "calendar_month", label: "Book instantly" },
          { icon: "card_giftcard", label: "Earn loyalty points" },
        ].map((f) => (
          <div
            key={f.label}
            className="bg-white/5 border border-white/10 rounded-2xl py-4 px-3"
          >
            <span className="material-symbols-outlined text-2xl text-[#FF4B19] block mb-2">
              {f.icon}
            </span>
            <p className="text-slate-300 text-xs font-semibold">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
