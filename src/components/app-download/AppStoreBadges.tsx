"use client";

import { APP_CONFIG } from "@/config/app-download";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface AppStoreBadgesProps {
  /** Layout direction */
  direction?: "row" | "col";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Optional UTM source tag appended to store URLs */
  source?: string;
}

const IOS_ICON = (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5 fill-current shrink-0"
    aria-hidden
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const ANDROID_ICON = (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5 fill-current shrink-0"
    aria-hidden
  >
    <path d="M3.18 23.76A1 1 0 0 1 3 23.1V.9A1 1 0 0 1 3.18.24l11.27 11.76zm1.87-.9 10.14-5.76-2.27-2.37zm10.14-14.76L5.05 2.14l7.87 8.21zM16.82 7.1 13.6 12l3.22 4.9 4.1-2.34a1 1 0 0 0 0-1.72z" />
  </svg>
);

const SIZE_CLS = {
  sm: "py-2 px-3.5 text-xs gap-2",
  md: "py-3 px-5 text-sm gap-2.5",
  lg: "py-3.5 px-6 text-base gap-3",
};

export function AppStoreBadges({
  direction = "row",
  size = "md",
  className,
  source = "web",
}: AppStoreBadgesProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  const cls = cn(
    "inline-flex items-center rounded-2xl font-bold transition-all",
    SIZE_CLS[size],
  );

  const wrapperCls = cn(
    "flex flex-wrap gap-3",
    direction === "col" && "flex-col",
    className,
  );

  // ── Pre-launch ────────────────────────────────────────────────────────────
  // The app is not on the stores yet, so the badges become plain labels.
  // Linking to a store page that does not exist would be worse than saying
  // nothing, and a disabled-looking button invites a pointless click.
  if (!APP_CONFIG.released) {
    const comingSoon = isAr ? "قريباً على" : "Coming soon to";
    // Keeps each badge's own solid colour rather than a translucent treatment:
    // these sit on both white and near-black sections, and the site pins the
    // light theme, so a background-dependent style would be unreadable on one
    // of them. Same shape and weight as the live badges — only the sub-line
    // and the absence of a link change.
    return (
      <div className={wrapperCls}>
        {[
          { icon: IOS_ICON, store: "App Store", tone: "bg-slate-900 text-white" },
          { icon: ANDROID_ICON, store: "Google Play", tone: "bg-[#FF4B19] text-white" },
        ].map(({ icon, store, tone }) => (
          <div key={store} className={cn(cls, tone, "cursor-default")}>
            {icon}
            <div className="text-start leading-tight">
              <p className="text-[10px] opacity-70 font-normal">{comingSoon}</p>
              <p className="font-black leading-none">{store}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Live ──────────────────────────────────────────────────────────────────
  const iosUrl = `${APP_CONFIG.urls.ios}?utm_source=${source}`;
  const androidUrl = `${APP_CONFIG.urls.android}&utm_source=${source}`;

  return (
    <div className={wrapperCls}>
      {/* App Store */}
      <a
        href={iosUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download on the App Store"
        className={cn(cls, "bg-black text-white hover:bg-slate-800 active:scale-95")}
      >
        {IOS_ICON}
        <div className="text-start leading-tight">
          <p className="text-[10px] opacity-70 font-normal">Download on the</p>
          <p className="font-black leading-none">App Store</p>
        </div>
      </a>

      {/* Google Play */}
      <a
        href={androidUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get it on Google Play"
        className={cn(cls, "bg-[#FF4B19] text-white hover:bg-[#e84213] active:scale-95")}
      >
        {ANDROID_ICON}
        <div className="text-start leading-tight">
          <p className="text-[10px] opacity-80 font-normal">Get it on</p>
          <p className="font-black leading-none">Google Play</p>
        </div>
      </a>
    </div>
  );
}
