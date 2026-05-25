export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ServiceCentersClient from "@/components/services/ServiceCentersClient";
import type { ServiceCenterDisplay } from "@/components/services/ServiceCentersClient";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";
import { generateSeoMeta } from "@/utils/seo";
import enMessages from "@/../messages/en.json";
import arMessages from "@/../messages/ar.json";

interface ServicePageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  return generateSeoMeta({
    title: isAr
      ? "مراكز صيانة سيارات بالقرب منك في مصر | ورشتي"
      : "Car Service Centers Near Me in Egypt | Warshety",
    description: isAr
      ? "تصفح أفضل مراكز صيانة السيارات بالقرب منك. احجز صيانة دورية أو كشف أعطال بسهولة في جميع أنحاء مصر."
      : "Browse top-rated car service centers near you. Book maintenance, inspection, and repairs بسهولة across Egypt.",
    path: `/${lang}/services`,
    locale: isAr ? "ar" : "en",
  });
}

export default async function AllServiceCentersPage({
  params,
}: ServicePageProps) {
  const { lang } = await params;
  const isAr = lang === "ar";
  const msgs = isAr ? arMessages : enMessages;
  let centers: ServiceCenterDisplay[] = [];

  try {
    const supabase = await createClient();

    // Two separate queries avoids the embedded-join that was causing a 500
    // due to an RLS recursion on order_items → orders → order_items.
    const [
      { data: vendors },
      { data: completedBookingsRaw },
      { data: allBranches },
    ] = await Promise.all([
      (supabase as any)
        .from("vendors")
        .select(
          "id, slug, business_name, city, governorate, district, latitude, longitude, featured, featured_priority, rating, total_reviews, cover_image_url, status, specializations, supported_makes",
        )
        .eq("vendor_type", "service_center")
        .in("status", ["approved", "pending"])
        .order("featured", { ascending: false })
        .order("featured_priority", { ascending: false })
        .order("rating", { ascending: false }),
      supabase.from("bookings").select("vendor_id").eq("status", "completed"),
      // Fetch active branch locations so governorate filter can match branches
      (supabase as any)
        .from("vendor_branches")
        .select("vendor_id, city, governorate")
        .eq("status", "active"),
    ]);

    // Count completed bookings per vendor from real booking data
    const bookingCountByVendor = new Map<string, number>();
    for (const b of completedBookingsRaw ?? []) {
      bookingCountByVendor.set(
        b.vendor_id,
        (bookingCountByVendor.get(b.vendor_id) ?? 0) + 1,
      );
    }

    // Group branch locations by vendor_id for location-aware filtering
    const branchesByVendor = new Map<
      string,
      Array<{ city: string | null; governorate: string | null }>
    >();
    for (const br of (allBranches ?? []) as Array<{
      vendor_id: string;
      city: string | null;
      governorate: string | null;
    }>) {
      const list = branchesByVendor.get(br.vendor_id) ?? [];
      list.push({ city: br.city, governorate: br.governorate });
      branchesByVendor.set(br.vendor_id, list);
    }

    centers = (vendors ?? []).map((v: any) => ({
      id: v.id,
      slug: v.slug ?? null,
      name: v.business_name,
      badge: v.status === "pending" ? "Pending Approval" : null,
      governorate: v.governorate ?? "Cairo",
      district: v.district ?? v.city ?? undefined,
      latitude: v.latitude ?? null,
      longitude: v.longitude ?? null,
      featured: v.featured ?? false,
      featuredPriority: v.featured_priority ?? 0,
      rating: v.rating ?? 0,
      reviewCount: v.total_reviews ?? 0,
      completedBookings: bookingCountByVendor.get(v.id) ?? 0,
      specializations: (v.supported_makes as string[] | null)?.length
        ? (v.supported_makes as string[])
        : ["All Makes"],
      services: ((v.specializations ?? []) as string[]).flatMap((entry) => {
        // Support both category keys (legacy) and individual service slugs
        const cat = SERVICE_CATEGORIES.find((c) => c.key === entry);
        if (cat) {
          return cat.services.map(
            (svcSlug) => (msgs as any).home?.services?.[svcSlug] ?? svcSlug,
          );
        }
        // It's a service slug directly
        return [(msgs as any).home?.services?.[entry] ?? entry];
      }),
      availableToday: v.status === "approved",
      image: v.cover_image_url,
      branchLocations: branchesByVendor.get(v.id) ?? [],
    }));
  } catch {
    // DB timeout or network error — render empty state, don't crash the page
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <ServiceCentersClient initialCenters={centers} />
    </Suspense>
  );
}
