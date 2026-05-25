/**
 * recommendationService — Homepage and contextual recommendations.
 *
 * Logic:
 *  popular garages  = highest completed_bookings count
 *  recommended garages = high rating (>=4.5) + optional city match
 */

import { createClient } from "@/lib/supabase/client";

// -- Types --------------------------------------------------------------------

export interface RecommendedVendor {
  id: string;
  business_name: string;
  city: string | null;
  rating: number;
  total_reviews: number;
  completed_bookings: number;
  cover_image_url: string | null;
  vendor_type: "service_center";
}

// -- Service functions --------------------------------------------------------

/**
 * Get top service centers by booking count (most popular).
 */
export async function getPopularGarages(
  limit = 6,
): Promise<RecommendedVendor[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vendors")
    .select(
      "id, business_name, city, rating, total_reviews, completed_bookings, cover_image_url, vendor_type",
    )
    .eq("status", "approved")
    .eq("vendor_type", "service_center")
    .order("completed_bookings", { ascending: false })
    .limit(limit);
  return (data ?? []) as RecommendedVendor[];
}

/**
 * Get recommended service centers — high rating + optional city filter.
 */
export async function getRecommendedGarages(
  opts: { city?: string; limit?: number } = {},
): Promise<RecommendedVendor[]> {
  const supabase = createClient();
  let query = supabase
    .from("vendors")
    .select(
      "id, business_name, city, rating, total_reviews, completed_bookings, cover_image_url, vendor_type",
    )
    .eq("status", "approved")
    .eq("vendor_type", "service_center")
    .gte("rating", 4.5)
    .order("rating", { ascending: false });

  if (opts.city) {
    query = query.ilike("city", `%${opts.city}%`);
  }

  const { data } = await query.limit(opts.limit ?? 6);
  return (data ?? []) as RecommendedVendor[];
}

/**
 * Get featured service centers for the homepage hero.
 */
export async function getFeaturedServiceCenters(
  limit = 3,
): Promise<RecommendedVendor[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vendors")
    .select(
      "id, business_name, city, rating, total_reviews, completed_bookings, cover_image_url, vendor_type",
    )
    .eq("status", "approved")
    .eq("vendor_type", "service_center")
    .gte("rating", 4.7)
    .order("total_reviews", { ascending: false })
    .limit(limit);
  return (data ?? []) as RecommendedVendor[];
}
