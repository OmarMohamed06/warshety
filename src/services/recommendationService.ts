/**
 * recommendationService — Homepage and contextual recommendations.
 *
 * Logic:
 *  popular garages  = highest completed_bookings count
 *  popular parts    = highest sales / order count
 *  recommended garages = high rating (≥4.5) + optional city match
 *
 * Covers checklist items:
 *  ✓ popular garages = highest booking count
 *  ✓ popular parts = highest sales
 *  ✓ recommended garages = high rating + nearby
 */

import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecommendedVendor {
  id: string;
  business_name: string;
  city: string | null;
  rating: number;
  total_reviews: number;
  completed_bookings: number;
  cover_image_url: string | null;
  vendor_type: "service_center" | "parts_seller";
}

export interface RecommendedPart {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  image_url: string | null;
  category: string;
  sales_count?: number;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Get top garages by booking count (most popular).
 */
export async function getPopularGarages(
  limit = 6,
  vendorType: "service_center" | "parts_seller" = "service_center",
): Promise<RecommendedVendor[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vendors")
    .select(
      "id, business_name, city, rating, total_reviews, completed_bookings, cover_image_url, vendor_type",
    )
    .eq("status", "approved")
    .eq("vendor_type", vendorType)
    .order("completed_bookings", { ascending: false })
    .limit(limit);
  return (data ?? []) as RecommendedVendor[];
}

/**
 * Get recommended garages — high rating + optional city filter.
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
 * Get popular parts — ordered by total order_items count.
 * Falls back to newest products when sales data is unavailable.
 */
export async function getPopularParts(limit = 8): Promise<RecommendedPart[]> {
  const supabase = createClient();

  // Aggregate: count how many times each product appears in order_items
  const { data: topItems } = await supabase
    .from("order_items")
    .select("product_id, count:product_id.count()")
    .not("product_id", "is", null)
    .order("count", { ascending: false })
    .limit(limit);

  if (topItems && topItems.length > 0) {
    const productIds = topItems
      .map((i) => i.product_id as string)
      .filter(Boolean);

    const { data: products } = await supabase
      .from("products")
      .select("id, name, brand, price, image_url, category")
      .in("id", productIds)
      .eq("active", true);

    // Re-order products to match topItems order
    const productMap = new Map(
      (products ?? []).map((p) => [p.id as string, p]),
    );

    const mapped = productIds.map((id, i) => {
      const p = productMap.get(id);
      if (!p) return null;
      const part: RecommendedPart = {
        id: p.id as string,
        name: p.name as string,
        brand: (p.brand as string | null) ?? null,
        price: p.price as number,
        image_url: (p.image_url as string | null) ?? null,
        category: p.category as string,
        sales_count: (topItems[i] as { count: number })?.count ?? 0,
      };
      return part;
    });
    return mapped.filter((p): p is RecommendedPart => p !== null);
  }

  // Fallback: newest active products
  const { data: newest } = await supabase
    .from("products")
    .select("id, name, brand, price, image_url, category")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (newest ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    brand: (p.brand as string) ?? null,
    price: p.price as number,
    image_url: (p.image_url as string) ?? null,
    category: p.category as string,
  }));
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
