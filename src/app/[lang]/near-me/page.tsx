export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import NearMeClient from "@/components/near-me/NearMeClient";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/utils";
import { generateSeoMeta } from "@/utils/seo";
import {
  VENDOR_COLUMNS,
  mapVendorRows,
  type NearbyCenter,
  type RawVendorRow,
} from "@/services/nearbyService";

interface NearMePageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: NearMePageProps): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  return generateSeoMeta({
    title: isAr
      ? "مراكز صيانة السيارات القريبة مني | ورشتي"
      : "Car Service Centers Near Me | Warshety",
    description: isAr
      ? "اعثر على أقرب مراكز صيانة السيارات إليك على الخريطة، مرتبة حسب المسافة، مع الاتجاهات والحجز الفوري."
      : "Find the closest car service centers on the map, sorted by distance, with directions and instant booking.",
    path: `/${lang}/near-me`,
    locale: isAr ? "ar" : "en",
  });
}

/**
 * Near Me.
 *
 * The approved directory is read here so the page is useful — and indexable —
 * before any location is involved. Distance ranking is layered on in the
 * browser once the visitor asks for it; their coordinates are never sent to
 * this server.
 *
 * Mirrors the services listing: a short timeout so a slow database renders an
 * empty page rather than hanging the request.
 */
export default async function NearMePage() {
  let initialCenters: NearbyCenter[] = [];
  let initialError = false;

  try {
    const supabase = await createClient();
    // `as any`: the generated Database type predates maps_link/district on
    // vendors. Both columns exist — the services listing and bookingActions
    // already read them in production.
    const { data } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("vendors")
        .select(VENDOR_COLUMNS)
        .eq("status", "approved"),
      3500,
      { data: null } as { data: RawVendorRow[] | null },
    );
    if (data === null) initialError = true;
    initialCenters = mapVendorRows(data ?? []);
  } catch {
    initialError = true;
  }

  return (
    <NearMeClient initialCenters={initialCenters} initialError={initialError} />
  );
}
