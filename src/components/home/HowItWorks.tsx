"use client";

import { useLanguage } from "@/context/LanguageContext";

const steps = [
  {
    icon: "location_on",
    titleKey: "home.how.step1Title",
    descKey: "home.how.step1Desc",
  },
  {
    icon: "calendar_month",
    titleKey: "home.how.step2Title",
    descKey: "home.how.step2Desc",
  },
  {
    icon: "car_repair",
    titleKey: "home.how.step3Title",
    descKey: "home.how.step3Desc",
  },
];

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-4xl px-6 text-center">
        {/* Label */}
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF4B19]">
          {t("home.how.label")}
        </p>
        <h2 className="mb-8 text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
          {t("home.how.heading")}
        </h2>

        {/* Steps */}
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-0">
          {steps.map((step, i) => (
            <div
              key={step.titleKey}
              className="relative flex flex-1 flex-col items-center gap-3 px-4"
            >
              {/* Connector line between steps */}
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+36px)] top-5 hidden h-px w-[calc(100%-72px)] bg-border sm:block" />
              )}

              {/* Icon circle */}
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#FF4B19] bg-background shadow-sm">
                <span
                  className="material-symbols-outlined text-[22px] text-[#FF4B19]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {step.icon}
                </span>
              </div>

              {/* Step number */}
              <span className="absolute -top-1 left-[calc(50%+18px)] flex h-4 w-4 items-center justify-center rounded-full bg-[#FF4B19] text-[9px] font-black text-white">
                {i + 1}
              </span>

              <div className="text-center">
                <p className="text-[13px] font-bold text-foreground">
                  {t(step.titleKey)}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  {t(step.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
