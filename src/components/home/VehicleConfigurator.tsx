"use client";

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useLanguage } from "@/context/LanguageContext";

export default function VehicleConfigurator() {
  const { t } = useLanguage();

  const CARDS = [
    {
      labelKey: "home.bookService",
      href: "/services",
      bg: "#FF4B19",
      textColor: "#fff",
      img: "/tools.png",
      imgClass: "bottom-0 right-2 h-[75%] w-auto object-contain object-bottom",
    },
    {
      labelKey: "home.findParts",
      href: "/parts",
      bg: "#0f172a",
      textColor: "#fff",
      img: "/barkes.png",
      imgClass: "bottom-0 right-0 h-[80%] w-auto object-contain object-bottom",
    },
  ];

  return (
    <section className="hidden sm:grid w-full grid-cols-2 mt-0">
      {CARDS.map((card) => (
        <Link
          key={card.labelKey}
          href={card.href}
          className="group relative flex h-36 sm:h-44 md:h-48 overflow-hidden"
          style={{ background: card.bg }}
        >
          {/* Background / decorative image */}
          <img
            src={card.img}
            alt=""
            aria-hidden
            className={`pointer-events-none absolute select-none transition-transform duration-500 group-hover:scale-105 ${card.imgClass}`}
          />

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/15" />

          {/* Label */}
          <span
            className="relative z-10 m-3 self-start font-black uppercase leading-tight tracking-tight text-[clamp(0.85rem,2.2vw,1.15rem)]"
            style={{ color: card.textColor }}
          >
            {t(card.labelKey)}
          </span>

          {/* Arrow on hover */}
          <span
            className="material-symbols-outlined absolute bottom-3 right-3 z-10 text-[20px] opacity-0 transition-all duration-300 group-hover:opacity-100"
            style={{ color: card.textColor }}
          >
            arrow_forward
          </span>
        </Link>
      ))}
    </section>
  );
}
