"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import {
  ArrowRight,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

interface ServiceCenter {
  id: string;
  name: string;
  city: string | null;
  rating: number;
  reviews: number;
  makes: string[];
  image: string | null;
  completedBookings: number;
}

/** Raw DB row shape (subset of vendors table columns we select) */
export interface RawVendor {
  id: string;
  business_name: string;
  city: string | null;
  rating: number | null;
  total_reviews: number | null;
  cover_image_url: string | null;
  supported_makes: string[] | null;
  completed_bookings?: number | null;
}

function mapRawVendors(data: RawVendor[]): ServiceCenter[] {
  return data.map((v) => ({
    id: v.id,
    name: v.business_name,
    city: v.city,
    rating: Number(v.rating) || 0,
    reviews: v.total_reviews ?? 0,
    makes: v.supported_makes?.length
      ? v.supported_makes.slice(0, 3)
      : ["All Makes"],
    image: v.cover_image_url,
    completedBookings: v.completed_bookings ?? 0,
  }));
}

interface Props {
  /** Server-prefetched vendor rows — if provided, client-side fetch is skipped */
  initialData?: RawVendor[];
}

export default function FeaturedServiceCenters({ initialData }: Props = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [centers, setCenters] = useState<ServiceCenter[]>(() => {
    if (initialData !== undefined) {
      return initialData.length > 0 ? mapRawVendors(initialData) : [];
    }
    return [];
  });
  const [loading, setLoading] = useState(initialData === undefined);
  const { t } = useLanguage();

  useEffect(() => {
    // Skip client-side fetch when server already provided data
    if (initialData !== undefined) return;
    const supabase = createClient();
    supabase
      .from("vendors")
      .select(
        "id, business_name, city, rating, total_reviews, cover_image_url, supported_makes, completed_bookings",
      )
      .in("status", ["approved", "pending"])
      .eq("vendor_type", "service_center")
      .order("completed_bookings", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setCenters(data && data.length > 0 ? mapRawVendors(data) : []);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -248 : 248,
      behavior: "smooth",
    });
  }

  return (
    <section className="py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-6 md:mb-10">
          <div>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight mb-0.5 md:mb-1.5">
              {t("home.featuredCenters")}
            </h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/services">
              {t("home.viewAll")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="relative px-5">
          {/* Left arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-md flex items-center justify-center hover:border-[#FF4B19] hover:text-[#FF4B19] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-none w-[220px] h-[260px] rounded-2xl bg-muted animate-pulse border border-slate-100 dark:border-slate-700"
                  />
                ))
              : centers.map((center) => (
                  <Link
                    key={center.id}
                    href={`/services/${center.id}`}
                    className="group flex-none w-[220px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden hover:shadow-lg hover:border-[#FF4B19]/60 transition-all duration-200 flex flex-col"
                  >
                    {/* Cover image / placeholder */}
                    <div className="relative h-[110px] flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 overflow-hidden">
                      {center.image ? (
                        <Image
                          src={center.image}
                          alt={center.name}
                          fill
                          sizes="220px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30">
                          <span className="material-symbols-outlined text-5xl text-slate-500">
                            car_repair
                          </span>
                        </div>
                      )}
                      {/* Rating pill */}
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 bg-white/95 dark:bg-slate-900/90 text-foreground text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          {center.rating > 0 ? center.rating.toFixed(1) : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <p className="text-sm font-bold leading-tight line-clamp-2 group-hover:text-[#FF4B19] transition-colors">
                        {center.name}
                      </p>
                      <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {center.city ?? t("home.egypt")}
                        </span>
                        {center.reviews > 0 && (
                          <>
                            <span className="mx-1 opacity-40">·</span>
                            <span className="flex-shrink-0">
                              {center.reviews} {t("home.reviews")}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Makes */}
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {center.makes.slice(0, 3).map((make) => (
                          <span
                            key={make}
                            className="text-[10px] font-medium bg-muted text-muted-foreground rounded-md px-1.5 py-0.5"
                          >
                            {make}
                          </span>
                        ))}
                      </div>

                      {/* Book button */}
                      <div className="mt-2 w-full text-center text-[11px] font-bold text-[#FF4B19] border border-[#FF4B19]/30 rounded-lg py-1.5 group-hover:bg-[#FF4B19] group-hover:text-white transition-colors">
                        {t("home.bookInspection")}
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
