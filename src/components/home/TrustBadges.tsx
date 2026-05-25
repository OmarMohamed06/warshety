"use client";

import { useLanguage } from "@/context/LanguageContext";

const badges = [
  {
    icon: "savings",
    titleKey: "home.trust.cheaperTitle",
    descKey: "home.trust.cheaperDesc",
  },
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
    <section className="border-y border-border/60 bg-muted/30 py-5">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {badges.map((b) => (
            <div
              key={b.titleKey}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span
                className="material-symbols-outlined text-[28px] text-[#FF4B19]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {b.icon}
              </span>
              <p className="text-[13px] font-bold leading-tight text-foreground">
                {t(b.titleKey)}
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t(b.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
