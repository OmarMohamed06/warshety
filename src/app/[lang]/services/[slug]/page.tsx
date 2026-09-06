import type { Metadata } from "next";
import Link from "next/link";
import NextImage from "next/image";
import { notFound } from "next/navigation";
import { servicePageSeo, pick } from "@/utils/seo";
import { createClient } from "@/lib/supabase/server";
import BookingSidebar from "@/components/services/BookingSidebar";
import ReviewsSection from "@/components/services/ReviewsSection";
import { ServiceCenterAppCTA } from "@/components/app-download/ServiceCenterAppCTA";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";
import type { DbService } from "@/types/database";
import type { DbReview } from "@/services/reviewService";
import enMessages from "../../../../../messages/en.json";
import arMessages from "../../../../../messages/ar.json";

import { Icon } from "@/components/ui/icon";

type Locale = "en" | "ar";

/** The page's content panels, so they stay in step with each other. */
const PANEL = "rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6";

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

  // Rating / location / bookings, assembled once so the separators cannot get
  // out of step with which pieces actually rendered.
  const locationLine = [center.governorate, center.district, center.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-muted/40">
      {/* ── Banner ──
          Shorter than the old 288px, and it no longer carries the name: text
          burned over a photo was unreadable on light covers and vanished
          entirely when a center had no image at all. The identity block sits
          below it, in the flow — nothing overlaps. */}
      <div className="relative h-[180px] sm:h-[220px]">
        {center.image ? (
          <NextImage
            src={center.image}
            alt={center.name}
            fill
            sizes="100vw"
            className="object-cover object-center"
            quality={90}
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />

        {/* Solid enough to stay legible on a light photo. */}
        <Link
          href={`/${lang}/services`}
          className="absolute start-4 top-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-black/50 px-3 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/70 sm:start-6 sm:top-6"
        >
          <Icon name="arrow_back" size="sm" className="rtl:-scale-x-100" />
          {sc.backToCenters}
        </Link>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* ── Identity ── */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {center.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {center.reviewCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Icon name="star" size="sm" filled className="text-amber-500" />
                {center.rating.toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  ({center.reviewCount} {sc.reviews})
                </span>
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                {sc.newCenter}
              </span>
            )}

            {locationLine && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="location_on" size="sm" />
                  {locationLine}
                </span>
              </>
            )}

            {center.completedBookings > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="task_alt" size="sm" />
                  {center.completedBookings.toLocaleString(
                    locale === "ar" ? "ar-EG" : "en-EG",
                  )}{" "}
                  {sc.bookings}
                </span>
              </>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* ── Main content ── */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            <section className={PANEL}>
              <h2 className="text-base font-semibold">{sc.about}</h2>

              {center.description && (
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {center.description}
                </p>
              )}

              {/* Each field gets the glyph it means. CheckCircle2 used to label
                  the email address, which said nothing about email. */}
              <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Icon
                    name="location_on"
                    size="lg"
                    className="mt-0.5 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0">
                    <dt className="text-sm font-semibold">{sc.address}</dt>
                    <dd className="text-sm text-muted-foreground">
                      {[
                        center.address,
                        center.district,
                        center.city,
                        center.governorate,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        (locale === "ar" ? "القاهرة، مصر" : "Cairo, Egypt")}
                    </dd>
                    {center.mapsLink && (
                      <dd>
                        <a
                          href={center.mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Icon name="open_in_new" size="2xs" />
                          {sc.viewOnMaps}
                        </a>
                      </dd>
                    )}
                  </div>
                </div>

                {center.email && (
                  <div className="flex items-start gap-3">
                    <Icon
                      name="mail"
                      size="lg"
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <div className="min-w-0">
                      <dt className="text-sm font-semibold">{sc.email}</dt>
                      <dd className="truncate text-sm text-muted-foreground">
                        {center.email}
                      </dd>
                    </div>
                  </div>
                )}

                {center.hours && (
                  <div className="flex items-start gap-3">
                    <Icon
                      name="schedule"
                      size="lg"
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <div className="min-w-0">
                      <dt className="text-sm font-semibold">
                        {sc.workingHours}
                      </dt>
                      <dd className="mt-0.5 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                        {center.hours}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </section>

            {/* Branches — lifted out of the About card, which was carrying
                three unrelated jobs. */}
            {branches.length > 0 && (
              <section className={PANEL}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-base font-semibold">
                    {sc.branchLocations}
                  </h2>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {branches.length}
                  </span>
                </div>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {branches.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground ring-1 ring-border">
                        <Icon name="storefront" size="lg" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm leading-tight font-semibold">
                          {locale === "ar" ? b.name_ar || b.name : b.name}
                          {b.is_main && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              {sc.mainBranch}
                            </span>
                          )}
                        </p>
                        {(b.address || b.city) && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[
                              b.address,
                              locale === "ar" ? b.city_ar || b.city : b.city,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Services + makes. "Supported Makes" was a whole card wrapping a
                single row of chips; it belongs with what the center offers. */}
            <section className={PANEL}>
              <h2 className="text-base font-semibold">{sc.servicesOffered}</h2>

              {(vendor.specializations ?? []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Icon name="build" size="2xl" className="opacity-30" />
                  <p className="mt-2 text-sm">{sc.noServices}</p>
                </div>
              ) : (
                <div className="mt-4 space-y-5">
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
                          <p className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                            {catName}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {slugs.map((svcSlug) => {
                              const svcName =
                                (msgs as any).home?.services?.[svcSlug] ??
                                svcSlug;
                              return (
                                <span
                                  key={svcSlug}
                                  className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium"
                                >
                                  {svcName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {center.supportedMakes.length > 0 && (
                <div className="mt-6 border-t pt-5">
                  <p className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    {sc.supportedMakes}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {center.supportedMakes.map((m) => (
                      <span
                        key={m}
                        className="rounded-full border px-2.5 py-1 text-xs font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Booking sidebar — untouched. */}
          <div>
            <BookingSidebar
              vendorId={center.id}
              vendorName={center.name}
              services={services}
              branches={branches}
            />
            <ServiceCenterAppCTA locale={locale} />
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
