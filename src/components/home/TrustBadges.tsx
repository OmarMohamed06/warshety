"use client";

import { useLanguage } from "@/context/LanguageContext";

const badges = [
  {
    icon: "verified_user",
    titleKey: "home.trust.vettedTitle",
    descKey: "home.trust.vettedDesc",
  },
  {
    icon: "workspace_premium",
    titleKey: "home.trust.warrantyTitle",
    descKey: "home.trust.warrantyDesc",
  },
  {
    icon: "calendar_clock",
    titleKey: "home.trust.bookingTitle",
    descKey: "home.trust.bookingDesc",
  },
];

export default function TrustBadges() {
  const { t } = useLanguage();

  return (
    <section className="border-y border-border/60 bg-muted/30 py-4">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-start justify-around gap-2">
          {badges.map((b) => (
            <div
              key={b.titleKey}
              className="flex flex-1 flex-col items-center gap-1 text-center"
            >
              <span
                className="material-symbols-outlined text-[22px] sm:text-[28px] text-[#FF4B19]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {b.icon}
              </span>
              <p className="text-[11px] sm:text-[13px] font-bold leading-tight text-foreground">
                {t(b.titleKey)}
              </p>
              <p className="hidden sm:block text-[11px] leading-snug text-muted-foreground">
                {t(b.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
