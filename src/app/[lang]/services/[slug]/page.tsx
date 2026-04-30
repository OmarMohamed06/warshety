import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { servicePageSeo, pick } from "@/utils/seo";
import { createClient } from "@/lib/supabase/server";
import BookingSidebar from "@/components/services/BookingSidebar";
import ReviewsSection from "@/components/services/ReviewsSection";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";
import type { DbService } from "@/types/database";
import type { DbReview } from "@/services/reviewService";
import enMessages from "../../../../../messages/en.json";
import arMessages from "../../../../../messages/ar.json";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  CheckCircle2,
  Phone,
  Clock,
  Wrench,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

type Locale = "en" | "ar";

interface Props {
  params: Promise<{ lang: string; slug: string }>;
}

// ── Working hours formatter ───────────────────────────────────────────────────
const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function fmt12(t: string, locale: Locale) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm =
    hh >= 12 ? (locale === "ar" ? "م" : "PM") : locale === "ar" ? "ص" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${mm.toString().padStart(2, "0")} ${ampm}`;
}

function formatWorkingHours(hours: any[], locale: Locale): string | null {
  if (!hours || hours.length === 0) return null;
  const dayNames = locale === "ar" ? DAY_AR : DAY_EN;
  const openDays = [...hours]
    .filter((h) => h.is_open)
    .sort((a, b) => a.day_of_week - b.day_of_week);
  if (openDays.length === 0) return locale === "ar" ? "مغلق" : "Closed";
  const groups: { from: number; to: number; open: string; close: string }[] =
    [];
  for (const day of openDays) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.open === day.open_time &&
      last.close === day.close_time &&
      day.day_of_week === last.to + 1
    ) {
      last.to = day.day_of_week;
    } else {
      groups.push({
        from: day.day_of_week,
        to: day.day_of_week,
        open: day.open_time,
        close: day.close_time,
      });
    }
  }
  return groups
    .map((g) => {
      const label =
        g.from === g.to
          ? dayNames[g.from]
          : `${dayNames[g.from]}–${dayNames[g.to]}`;
      return `${label}: ${fmt12(g.open, locale)} – ${fmt12(g.close, locale)}`;
    })
    .join("\n");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = (lang === "ar" ? "ar" : "en") as Locale;
  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("business_name, business_name_ar, city, city_ar")
    .eq(UUID_RE.test(slug) ? "id" : "slug", slug)
    .single();
  const name = vendor
    ? pick(vendor, "business_name", locale)
    : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const city = vendor
    ? pick(vendor, "city", locale) || vendor?.city || "Cairo"
    : "Cairo";
  return servicePageSeo(name, city, locale);
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ServiceCenterPage({ params }: Props) {
  const { lang, slug } = await params;
  const locale = (lang === "ar" ? "ar" : "en") as Locale;
  const supabase = await createClient();

  let vendorData: any = null;
  let rawReviews: any[] | null = null;
  let rawBranches: any[] | null = null;
  let rawHours: any[] | null = null;
  let completedBookingsCount = 0;

  try {
    // Resolve slug or UUID to vendor ID
    const { data: vendorLookup } = await supabase
      .from("vendors")
      .select("id")
      .eq(UUID_RE.test(slug) ? "id" : "slug", slug)
      .eq("vendor_type", "service_center")
      .maybeSingle();
    if (!vendorLookup) {
      notFound();
      return;
    }
    const vendorId = vendorLookup.id;

    const [
      { data: v },
      { data: rev },
      { data: br },
      { data: wh },
      { count: cbCount },
    ] = await Promise.all([
      supabase.from("vendors").select("*").eq("id", vendorId).single(),
      supabase
        .from("reviews")
        .select("*, user:users(full_name, avatar_url)")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("vendor_branches")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("status", "active")
        .order("is_main", { ascending: false })
        .order("created_at"),
      supabase
        .from("vendor_working_hours")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("day_of_week"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorId)
        .eq("status", "completed"),
    ]);
    vendorData = v;
    rawReviews = rev;
    rawBranches = br;
    rawHours = wh;
    completedBookingsCount = cbCount ?? 0;
  } catch {
    notFound();
  }

  if (!vendorData) {
    notFound();
  }

  const vendor = vendorData;
  const reviews: DbReview[] = (rawReviews ?? []) as unknown as DbReview[];

  // Fetch bookable services for the sidebar (separate from display which uses specializations)
  const { data: rawServices } = await supabase
    .from("services")
    .select("*")
    .eq("vendor_id", vendor.id)
    .eq("active", true)
    .order("name");
  const services: DbService[] = (rawServices ?? []) as unknown as DbService[];

  // Always include the vendor's own location as the main branch at the top.
  // DB branches (vendor_branches) are secondary locations only.
  type DbBranchType = import("@/types/database").DbBranch;
  const dbBranches = (rawBranches ?? []) as DbBranchType[];
  const syntheticMain: DbBranchType = {
    id: "main",
    vendor_id: vendor.id,
    name: vendor.business_name,
    name_ar: vendor.business_name_ar ?? null,
    address: vendor.address ?? null,
    city: vendor.city ?? null,
    city_ar: vendor.city_ar ?? null,
    governorate: vendor.governorate ?? null,
    latitude: vendor.latitude ?? null,
    longitude: vendor.longitude ?? null,
    maps_link: null,
    phone: vendor.phone ?? null,
    status: "active",
    is_main: true,
    created_at: vendor.created_at,
    updated_at: vendor.updated_at,
  };
  // Filter out any DB branch already flagged is_main to avoid duplicates
  const branches: DbBranchType[] = [
    syntheticMain,
    ...dbBranches.filter((b) => !b.is_main),
  ];

  const msgs = locale === "ar" ? arMessages : enMessages;
  const sc = msgs.servicePage;

  // Compute real stats from live data
  const realReviewCount = reviews.length;
  const realRating =
    realReviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / realReviewCount
      : 0;

  const center = {
    id: vendor.id,
    name: pick(vendor, "business_name", locale) || vendor.business_name,
    address: vendor.address ?? null,
    city: pick(vendor, "city", locale) || vendor.city || null,
    governorate: vendor.governorate ?? null,
    district: vendor.district ?? null,
    phone: vendor.phone ?? null,
    email: vendor.email ?? null,
    rating: realRating,
    reviewCount: realReviewCount,
    completedBookings: completedBookingsCount,
    specializations: (vendor.specializations ?? []) as string[],
    supportedMakes: (vendor.supported_makes ?? []) as string[],
    image: vendor.cover_image_url,
    description:
      pick(vendor, "description", locale) || vendor.description || "",
    hours: formatWorkingHours(rawHours ?? [], locale),
    mapsLink: vendor.maps_link ?? null,
  };

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Hero */}
      <div
        className="h-72 bg-cover bg-center relative"
        style={
          center.image
            ? { backgroundImage: `url('${center.image}')` }
            : undefined
        }
      >
        {!center.image && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-6 left-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Link href={`/${lang}/services`}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              {sc.backToCenters}
            </Link>
          </Button>
        </div>
        <div className="absolute bottom-6 left-6 text-white">
          <h1 className="text-4xl font-black mb-1">{center.name}</h1>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            {center.reviewCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-primary fill-primary" />
                {center.rating.toFixed(1)} ({center.reviewCount} {sc.reviews})
              </span>
            )}
            {(center.governorate || center.city) && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {[center.governorate, center.district, center.city]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </>
            )}
            {center.completedBookings > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {center.completedBookings.toLocaleString(
                    locale === "ar" ? "ar-EG" : "en-EG",
                  )}{" "}
                  {sc.bookings}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>{sc.about}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {center.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {center.description}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{sc.address}</p>
                      <p className="text-muted-foreground">
                        {[
                          center.address,
                          center.district,
                          center.city,
                          center.governorate,
                        ]
                          .filter(Boolean)
                          .join(", ") ||
                          (locale === "ar" ? "القاهرة، مصر" : "Cairo, Egypt")}
                      </p>
                      {center.mapsLink && (
                        <a
                          href={center.mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {sc.viewOnMaps}
                        </a>
                      )}
                    </div>
                  </div>
                  {center.email && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Email</p>
                        <p className="text-muted-foreground">{center.email}</p>
                      </div>
                    </div>
                  )}
                  {center.hours && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">{sc.workingHours}</p>
                        <p className="text-muted-foreground whitespace-pre-line text-xs leading-relaxed mt-0.5">
                          {center.hours}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Branch locations — only shown when vendor has branches */}
                {branches.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {sc.branchLocations}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {branches.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-muted/40"
                        >
                          <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold leading-tight flex items-center gap-1.5 flex-wrap">
                              {locale === "ar" ? b.name_ar || b.name : b.name}
                              {b.is_main && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                                  {sc.mainBranch}
                                </span>
                              )}
                            </p>
                            {(b.address || b.city) && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {[
                                  b.address,
                                  locale === "ar"
                                    ? b.city_ar || b.city
                                    : b.city,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle>{sc.servicesOffered}</CardTitle>
              </CardHeader>
              <CardContent>
                {(vendor.specializations ?? []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{sc.noServices}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const specs = vendor.specializations as string[];
                      // Group selected service slugs by their parent category.
                      // Also support legacy category-key entries.
                      const grouped: {
                        cat: (typeof SERVICE_CATEGORIES)[0];
                        slugs: string[];
                      }[] = [];
                      for (const cat of SERVICE_CATEGORIES) {
                        if (specs.includes(cat.key)) {
                          // legacy: whole category selected → show all its services
                          grouped.push({ cat, slugs: cat.services });
                        } else {
                          const selected = cat.services.filter((s) =>
                            specs.includes(s),
                          );
                          if (selected.length)
                            grouped.push({ cat, slugs: selected });
                        }
                      }
                      return grouped.map(({ cat, slugs }) => {
                        const catName =
                          (msgs as any).home?.serviceCategories?.[cat.key] ??
                          cat.key;
                        return (
                          <div key={cat.key}>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                              {catName}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {slugs.map((svcSlug) => {
                                const svcName =
                                  (msgs as any).home?.services?.[svcSlug] ??
                                  svcSlug;
                                return (
                                  <Badge
                                    key={svcSlug}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {svcName}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supported Makes */}
            {center.supportedMakes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{sc.supportedMakes}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {center.supportedMakes.map((m) => (
                      <Badge
                        key={m}
                        variant="outline"
                        className="px-3 py-1 text-xs"
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking sidebar */}
          <div>
            <BookingSidebar
              vendorId={center.id}
              vendorName={center.name}
              services={services}
              branches={branches}
            />
          </div>
        </div>

        {/* Reviews — full width below booking so it appears after booking on mobile */}
        <div className="mt-8">
          <ReviewsSection vendorId={center.id} initialReviews={reviews} />
        </div>
      </div>
    </div>
  );
}
