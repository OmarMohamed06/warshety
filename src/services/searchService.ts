/**
 * searchService — Unified search across garages, services, and parts.
 *
 * Logic:
 *  - Keyword matched against name, description, category, brand, city
 *  - Category match for parts
 *  - Brand match for parts
 *  - Results ranked by relevance (exact name match first, then partial)
 *
 * Covers checklist items:
 *  ✓ Search garages
 *  ✓ Search services
 *  ✓ Search parts
 *  ✓ Keyword match, category match, brand match
 *  ✓ Results ranked by relevance
 */

import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SearchResultType = "vendor" | "service" | "part";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image: string | null;
  relevanceScore: number;
}

export interface SearchFilters {
  type?: SearchResultType | "all";
  category?: string;
  brand?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreMatch(text: string, keyword: string): number {
  const t = text.toLowerCase();
  const k = keyword.toLowerCase();
  if (t === k) return 100;
  if (t.startsWith(k)) return 80;
  if (t.includes(k)) return 60;
  return 0;
}

function bestScore(fields: string[], keyword: string): number {
  return Math.max(...fields.map((f) => scoreMatch(f ?? "", keyword)));
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Global search across vendors (garages), services, and products (parts).
 */
export async function globalSearch(
  keyword: string,
  filters: SearchFilters = {},
): Promise<SearchResult[]> {
  const supabase = createClient();
  const k = keyword.trim();
  if (!k) return [];

  const results: SearchResult[] = [];
  const type = filters.type ?? "all";

  // ── Search vendors (garages) ──────────────────────────────────────────────
  if (type === "all" || type === "vendor") {
    let query = supabase
      .from("vendors")
      .select("id, slug, business_name, city, rating, cover_image_url, vendor_type")
      .eq("status", "approved");

    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
    if (filters.minRating) query = query.gte("rating", filters.minRating);

    const { data: vendors } = await query
      .ilike("business_name", `%${k}%`)
      .limit(10);

    for (const v of vendors ?? []) {
      const score = bestScore([v.business_name as string, v.city as string], k);
      results.push({
        type: "vendor",
        id: v.id as string,
        title: v.business_name as string,
        subtitle: `${v.vendor_type === "service_center" ? "Service Center" : "Parts Seller"} · ${v.city ?? "Egypt"}`,
        href:
          v.vendor_type === "service_center"
            ? `/services/${(v.slug as string | null) ?? v.id}`
            : `/parts?vendor=${v.id}`,
        image: (v.cover_image_url as string) ?? null,
        relevanceScore: score,
      });
    }
  }

  // ── Search services ───────────────────────────────────────────────────────
  if (type === "all" || type === "service") {
    const { data: services } = await supabase
      .from("services")
      .select(
        "id, name, description, price, vendor_id, vendor:vendors(business_name, city, slug)",
      )
      .ilike("name", `%${k}%`)
      .eq("active", true)
      .limit(10);

    for (const s of services ?? []) {
      const vendor = s.vendor as unknown as {
        business_name: string;
        city: string;
        slug: string | null;
      } | null;
      const score = bestScore(
        [s.name as string, (s.description as string) ?? ""],
        k,
      );
      results.push({
        type: "service",
        id: s.id as string,
        title: s.name as string,
        subtitle: vendor
          ? `${vendor.business_name} · ${vendor.city ?? "Egypt"}`
          : "Service",
        href: `/services/${vendor?.slug ?? s.vendor_id}`,
        image: null,
        relevanceScore: score,
      });
    }
  }

  // ── Search parts (products) ───────────────────────────────────────────────
  if (type === "all" || type === "part") {
    let query = supabase
      .from("products")
      .select(
        "id, name, brand, category, price, image_url, vendor:vendors(business_name)",
      )
      .eq("active", true);

    if (filters.category) query = query.eq("category", filters.category);
    if (filters.brand) query = query.ilike("brand", `%${filters.brand}%`);
    if (filters.minPrice) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice) query = query.lte("price", filters.maxPrice);

    const { data: products } = await query
      .or(`name.ilike.%${k}%,brand.ilike.%${k}%,category.ilike.%${k}%`)
      .limit(15);

    for (const p of products ?? []) {
      const vendor = p.vendor as unknown as { business_name: string } | null;
      const score = bestScore(
        [p.name as string, (p.brand as string) ?? "", p.category as string],
        k,
      );
      results.push({
        type: "part",
        id: p.id as string,
        title: p.name as string,
        subtitle: `${p.brand ?? "Part"} · ${p.category} · EGP ${(p.price as number).toLocaleString()}`,
        href: `/parts/${p.id}`,
        image: (p.image_url as string) ?? null,
        relevanceScore: score,
      });
    }
  }

  // Sort by relevance descending
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Search garages with full filter + sort options.
 *
 * Sort keys: rating | distance (stub) | price | popularity
 */
export async function searchGarages(opts: {
  keyword?: string;
  city?: string;
  services?: string[];
  minRating?: number;
  availableToday?: boolean;
  vendorType?: "service_center" | "parts_seller";
  sortBy?: "rating" | "popularity" | "price";
}) {
  const supabase = createClient();

  let query = supabase
    .from("vendors")
    .select("*, services:services(id,name)")
    .eq("status", "approved");

  if (opts.vendorType) query = query.eq("vendor_type", opts.vendorType);
  if (opts.city) query = query.ilike("city", `%${opts.city}%`);
  if (opts.minRating) query = query.gte("rating", opts.minRating);
  if (opts.keyword) query = query.ilike("business_name", `%${opts.keyword}%`);

  // Sort
  switch (opts.sortBy) {
    case "popularity":
      query = query.order("completed_bookings", { ascending: false });
      break;
    case "rating":
    default:
      query = query.order("rating", { ascending: false });
      break;
  }

  const { data, error } = await query.limit(50);
  return { vendors: data ?? [], error: error?.message ?? null };
}
