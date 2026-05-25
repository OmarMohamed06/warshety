"use client";

import Image from "next/image";
import VehicleFilterBar from "@/components/home/VehicleFilterBar";
import { useLanguage } from "@/context/LanguageContext";

export default function HeroSection() {
  const { t } = useLanguage();
  return (
    <section className="relative w-full overflow-hidden bg-background">
      {/* bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />

      {/* ── Side cars — desktop only ── */}
      <Image
        src="/transparent1.png"
        alt=""
        aria-hidden
        width={600}
        height={400}
        priority
        sizes="38vw"
        className="pointer-events-none absolute bottom-0 left-0 hidden h-[90%] w-auto max-w-[38%] select-none object-contain object-bottom md:block"
        style={{ transform: "translateX(-44%) translateY(-10%)" }}
      />
      <Image
        src="/3dhoodcar.png"
        alt=""
        aria-hidden
        width={600}
        height={400}
        priority
        sizes="38vw"
        className="pointer-events-none absolute bottom-0 right-0 hidden h-[90%] w-auto max-w-[38%] select-none object-contain object-bottom md:block"
        style={{ transform: "translateX(44%)" }}
      />

      {/* ── Mobile layout: text on reading-start side, car bleeds off reading-end edge ── */}
      {/* CSS flex-row in RTL automatically puts text on the right and car on the left.   */}
      {/* marginInlineEnd is a logical property: margin-right in LTR, margin-left in RTL. */}
      <div className="relative z-10 md:hidden">
        <div className="flex items-end pt-10 gap-0">
          {/* Text — 60% width, padding on the inline-start side */}
          <div className="w-[60%] shrink-0 pb-6 rtl:pb-14 ps-5 min-w-0">
            <h1 className="font-black uppercase leading-tight tracking-tight text-foreground text-[clamp(1.7rem,8.5vw,2.8rem)] text-start break-words">
              {t("home.heroTitle1")}
              <br />
              <span className="text-[#FF4B19]">{t("home.heroTitle2")}</span>
            </h1>
          </div>

          {/* Car — 70vw wide, bleeds off the inline-end edge in both LTR and RTL */}
          <div
            className="shrink-0 self-end"
            style={{ width: "70vw", marginInlineEnd: "-35vw" }}
          >
            <Image
              src="/3dhoodcar.png"
              alt=""
              aria-hidden
              width={400}
              height={260}
              priority
              sizes="70vw"
              className="pointer-events-none w-full h-auto object-contain object-bottom select-none drop-shadow-2xl rtl:[transform:scaleX(-1)]"
              style={{ maxHeight: "260px" }}
            />
          </div>
        </div>

        {/* Filter bar — full width below */}
        <div className="px-5 pb-10">
          <VehicleFilterBar />
        </div>
      </div>

      {/* ── Desktop layout: centred column (unchanged) ── */}
      <div className="relative z-10 mx-auto hidden max-w-xl flex-col items-center px-5 py-14 text-center sm:py-16 md:flex">
        <h1 className="font-black uppercase leading-none tracking-tighter text-foreground text-[clamp(2.8rem,9vw,4.5rem)]">
          {t("home.heroTitle1")}
          <br />
          <span className="text-[#FF4B19]">{t("home.heroTitle2")}</span>
        </h1>
        <VehicleFilterBar />
      </div>
    </section>
  );
}
