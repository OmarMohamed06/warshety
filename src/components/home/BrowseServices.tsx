"use client";

import { useRef } from "react";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";
import Image from "next/image";

export default function BrowseServices() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -340 : 340,
      behavior: "smooth",
    });
  }

  return (
    <section className="py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight mb-0.5 md:mb-1.5">
              {t("home.browseByService")}
            </h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/services">
              {t("home.viewAll")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Carousel */}
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
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
          >
            {SERVICE_CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/services?category=${encodeURIComponent(cat.key)}`}
                className="flex-none w-[260px] sm:w-[300px] rounded-2xl overflow-hidden relative group"
              >
                {/* Background image */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  <Image
                    src={cat.image}
                    alt={t(`home.serviceCategories.${cat.key}`)}
                    fill
                    sizes="(max-width: 640px) 260px, 300px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Icon badge — top left */}
                  <div className="absolute top-3 left-3">
                    <span className="material-symbols-outlined text-white text-2xl drop-shadow">
                      {cat.icon}
                    </span>
                  </div>

                  {/* Text — bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-black text-sm uppercase tracking-wide leading-tight mb-2">
                      {t(`home.serviceCategories.${cat.key}`)}
                    </h3>
                    {/* Sub-services list */}
                    <div className="flex flex-wrap gap-1">
                      {cat.services.slice(0, 3).map((svc) => (
                        <span
                          key={svc}
                          className="text-[10px] text-white/80 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20"
                        >
                          {t(`home.services.${svc}`)}
                        </span>
                      ))}
                      {cat.services.length > 3 && (
                        <span className="text-[10px] text-white/60 px-1 py-0.5">
                          +{cat.services.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
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
