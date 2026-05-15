"use client";

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Image from "next/image";

// Shown in the scrollable carousel (most popular)
const FEATURED = [
  { slug: "brake-system", image: "/barkes.png" },
  { slug: "engine-parts", image: "/engine.png" },
  { slug: "suspension", image: "/suspension.png" },
  { slug: "filters", image: "/filters.png" },
  { slug: "oils-fluids", image: "/oils.png" },
  { slug: "transmission-clutch", image: "/transmission.png" },
  { slug: "electric-system", image: "/electric.png" },
  { slug: "lighting", image: "/lighting.png" },
];

function CategoryCard({ cat }: { cat: (typeof FEATURED)[0] }) {
  const { t } = useLanguage();
  return (
    <Link
      href={`/parts/${cat.slug}`}
      className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19] hover:shadow-xl transition-all group flex flex-col"
    >
      <div className="w-full aspect-[4/3] bg-slate-100 dark:bg-slate-700 overflow-hidden relative">
        <Image
          src={cat.image}
          alt={t(`home.categories.${cat.slug}`)}
          fill
          sizes="(max-width: 640px) 140px, 160px"
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="px-3 py-2.5 text-center">
        <p className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-100 group-hover:text-[#FF4B19] transition-colors">
          {t(`home.categories.${cat.slug}`)}
        </p>
      </div>
    </Link>
  );
}

export default function CategoriesGrid() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  }

  return (
    <section className="py-6 md:py-12 bg-muted/40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight mb-0.5 md:mb-1.5">
              {t("home.browseByCategory")}
            </h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/parts">
              {t("home.viewAll")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* ── Carousel ── */}
        <div className="relative px-5">
          {/* Left arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-md flex items-center justify-center hover:border-[#FF4B19] hover:text-[#FF4B19] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable row */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
          >
            {FEATURED.map((cat) => (
              <div key={cat.slug} className="flex-none w-[140px] sm:w-[160px]">
                <CategoryCard cat={cat} />
              </div>
            ))}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-md flex items-center justify-center hover:border-[#FF4B19] hover:text-[#FF4B19] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
