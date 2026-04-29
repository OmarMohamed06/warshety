"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/hooks";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

interface FeaturedPart {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviews: number;
  badge: string;
  icon: string;
  image: string | null;
  vendorId: string;
  href: string;
}

const FALLBACK_PARTS: FeaturedPart[] = [
  {
    id: "1",
    name: "Brembo Brake Pad Set — Front",
    brand: "Brembo",
    category: "Brake Pads",
    price: 1850,
    originalPrice: 2200,
    rating: 4.8,
    reviews: 124,
    badge: "Best Seller",
    icon: "minor_crash",
    vendorId: "",
    image:
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80",
    href: "/parts/brake-system/brake-pads/vp-001",
  },
  {
    id: "2",
    name: "Mann-Filter Oil Filter W 712/75",
    brand: "Mann-Filter",
    category: "Oil Filters",
    price: 285,
    originalPrice: 340,
    rating: 4.7,
    reviews: 89,
    badge: "Top Rated",
    icon: "filter_alt",
    vendorId: "",
    image:
      "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400&q=80",
    href: "/parts/filters/oil-filters/vp-002",
  },
  {
    id: "3",
    name: "NGK Spark Plug BKR6E (Set of 4)",
    brand: "NGK",
    category: "Spark Plugs",
    price: 780,
    originalPrice: null,
    rating: 4.9,
    reviews: 213,
    badge: "New",
    icon: "bolt",
    vendorId: "",
    image:
      "https://images.unsplash.com/photo-1504222490345-c075b7d25daa?w=400&q=80",
    href: "/parts/electric-system/spark-plugs/vp-003",
  },
  {
    id: "4",
    name: "Monroe Front Shock Absorber G8071",
    brand: "Monroe",
    category: "Shock Absorbers",
    price: 3600,
    originalPrice: 4200,
    rating: 4.8,
    reviews: 45,
    badge: "Best Seller",
    icon: "shutter_speed",
    vendorId: "",
    image:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&q=80",
    href: "/parts/suspension/shock-absorbers/vp-004",
  },
  {
    id: "5",
    name: "SKF Timing Belt Kit VKMC 03316",
    brand: "SKF",
    category: "Timing Belt Kits",
    price: 4750,
    originalPrice: 5500,
    rating: 4.9,
    reviews: 67,
    badge: "Top Rated",
    icon: "settings",
    vendorId: "",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
    href: "/parts/engine-parts/timing-belt-kits/vp-005",
  },
  {
    id: "6",
    name: "Denso Air Filter 17801-0D010",
    brand: "Denso",
    category: "Air Filters",
    price: 420,
    originalPrice: null,
    rating: 4.8,
    reviews: 58,
    badge: "Sale",
    icon: "air",
    vendorId: "",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
    href: "/parts/filters/air-filters/vp-009",
  },
];

/** Reverse map: DB category → URL slug */
const CAT_TO_SLUG: Record<string, string> = {
  Brakes: "brake-system",
  Filters: "filters",
  Suspension: "suspension",
  Engine: "engine-parts",
  Electrical: "electric-system",
  Exhaust: "exhaust-system",
  Transmission: "transmission-clutch",
  Cooling: "engine-cooling",
  Steering: "steering",
  "Body Parts": "car-body-interior",
  "Fuel System": "fuel-system",
  HVAC: "heating-ac",
  "Oils & Fluids": "oils-fluids",
  Lighting: "lighting",
  Wipers: "wipers",
};

const BADGE_LABELS = ["Best Seller", "Top Rated", "New", "Sale"];

const BADGE_COLORS: Record<string, string> = {
  "Best Seller": "bg-[#FF4B19] text-white",
  "Top Rated": "bg-amber-400 text-white",
  New: "bg-slate-800 text-white dark:bg-white dark:text-slate-900",
  Sale: "bg-red-500 text-white",
};

/** Raw DB row shape (subset of products table columns we select) */
export interface RawProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  subcategory: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  vendor_id: string | null;
  sold_count?: number;
}

function mapRawProducts(data: RawProduct[]): FeaturedPart[] {
  return data.map((p, i) => {
    const catSlug =
      CAT_TO_SLUG[p.category] ?? p.category.toLowerCase().replace(/\s+/g, "-");
    const subSlug = (p.subcategory ?? "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const sold = p.sold_count ?? 0;
    const badge =
      sold >= 50
        ? "Best Seller"
        : sold >= 20
          ? "Top Rated"
          : p.original_price
            ? "Sale"
            : "New";
    return {
      id: p.id,
      name: p.name,
      brand: p.brand ?? "",
      category: p.subcategory ?? p.category,
      price: Number(p.price),
      originalPrice: p.original_price ? Number(p.original_price) : null,
      rating: 4.5 + (i % 5) * 0.1,
      reviews: sold,
      badge,
      icon: "settings",
      image: p.image_url,
      vendorId: p.vendor_id ?? "",
      href: subSlug
        ? `/parts/${catSlug}/${subSlug}/${p.id}`
        : `/parts/${catSlug}/${p.id}`,
    };
  });
}

interface Props {
  /** Server-prefetched product rows — if provided, client-side fetch is skipped */
  initialData?: RawProduct[];
}

export default function FeaturedParts({ initialData }: Props = {}) {
  const { addItem, isInCart, getItemQty, changeQty, removeItem } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [parts, setParts] = useState<FeaturedPart[]>(() => {
    if (initialData !== undefined) {
      return initialData.length > 0
        ? mapRawProducts(initialData)
        : [];
    }
    return [];
  });
  const [loading, setLoading] = useState(initialData === undefined);

  useEffect(() => {
    // Skip client-side fetch when server already provided data
    if (initialData !== undefined) return;
    const supabase = createClient();
    // Use rpc or raw SQL via supabase.rpc if available; otherwise fall back to
    // a two-step fetch: get products + aggregate order_items client-side.
    Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, brand, category, subcategory, price, original_price, image_url, vendor_id",
        )
        .eq("active", true)
        .gt("stock", 0)
        .limit(50),
      supabase.from("order_items").select("product_id, quantity"),
    ]).then(([productsRes, ordersRes]) => {
      const products = productsRes.data ?? [];
      const orderItems = ordersRes.data ?? [];
      // Sum quantities per product
      const soldMap: Record<string, number> = {};
      for (const item of orderItems as {
        product_id: string;
        quantity: number;
      }[]) {
        if (item.product_id)
          soldMap[item.product_id] =
            (soldMap[item.product_id] ?? 0) + (item.quantity ?? 1);
      }
      // Attach sold_count and sort descending
      const withSold = (products as RawProduct[]).map((p) => ({
        ...p,
        sold_count: soldMap[p.id] ?? 0,
      }));
      withSold.sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0));
      setParts(
        withSold.length > 0
          ? mapRawProducts(withSold.slice(0, 8))
          : [],
      );
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  }

  const { t, locale } = useLanguage();

  return (
    <section className="w-full py-8 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-6 md:mb-10">
          <div>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight mb-0.5 md:mb-1.5">
              {t("home.featuredParts")}
            </h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/parts">
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
              ? /* Skeleton cards — same size as real cards, no content flash */
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-none w-[200px] sm:w-[220px] bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-pulse"
                  >
                    <div className="w-full h-[140px] bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                    <div className="p-4 space-y-2">
                      <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
                      <div className="h-8 w-full bg-slate-200 dark:bg-slate-700 rounded-xl mt-3" />
                    </div>
                  </div>
                ))
              : parts.map((part) => (
                  <div
                    key={part.id}
                    className="flex-none w-[200px] sm:w-[220px] h-[340px]"
                  >
                    <Link
                      key={part.id}
                      href={part.href}
                      className="h-full bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19] hover:shadow-xl transition-all group flex flex-col"
                    >
                      {/* Image / icon header */}
                      <div className="relative w-full h-[140px] bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {part.image ? (
                          <Image
                            src={part.image}
                            alt={part.name}
                            fill
                            sizes="220px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span
                            className="material-symbols-outlined text-slate-400 group-hover:text-[#FF4B19] transition-colors duration-300"
                            style={{ fontSize: "52px" }}
                          >
                            {part.icon}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-col flex-1">
                        {/* Top block: brand / name / category / rating */}
                        <div className="px-4 pt-4 flex flex-col gap-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {part.brand}
                          </p>
                          <h3 className="font-black text-sm leading-snug line-clamp-2 h-[2.625rem]">
                            {part.name}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {part.category}
                          </p>

                          {/* Rating / sold count */}
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-[11px] font-bold">
                              {part.rating}
                            </span>
                          </div>
                        </div>

                        {/* Bottom block: price + cart button — always at the bottom */}
                        <div className="flex flex-col gap-2 mt-auto pt-2">
                          {/* Price */}
                          <div className="px-4 flex items-baseline gap-1.5">
                            <span className="text-sm font-black">
                              EGP {part.price.toLocaleString()}
                            </span>
                            {part.originalPrice && (
                              <span className="text-[11px] text-slate-400 line-through">
                                {part.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Add to Cart / Quantity stepper */}
                          {isInCart(part.id) ? (
                            <div
                              onClick={(e) => e.preventDefault()}
                              className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  if (getItemQty(part.id) <= 1)
                                    removeItem(part.id);
                                  else changeQty(part.id, -1);
                                }}
                                className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors font-black text-lg"
                              >
                                −
                              </button>
                              <span className="text-sm font-black text-slate-800 dark:text-slate-100 min-w-[20px] text-center">
                                {getItemQty(part.id)}
                              </span>
                              <button
                                onClick={() => changeQty(part.id, 1)}
                                className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-[#FF4B19]/10 hover:text-[#FF4B19] transition-colors font-black text-lg"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                addItem({
                                  id: part.id,
                                  name: part.name,
                                  vendor: part.brand,
                                  vendorId: part.vendorId,
                                  sku: `SKU-${part.id}`,
                                  compatible: "",
                                  price: part.price,
                                  icon: part.icon,
                                  image: part.image ?? undefined,
                                  stock: 99,
                                });
                              }}
                              className="w-full rounded-none py-2.5 text-xs font-bold bg-[#FF4B19] text-white hover:bg-[#e03d10] transition-all flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                shopping_cart
                              </span>
                              {t("home.addToCart")}
                            </button>
                          )}
                        </div>
                      </div>
                    </Link>
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
