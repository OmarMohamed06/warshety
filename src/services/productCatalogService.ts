/**
 * productCatalogService.ts
 *
 * Server-side data access for the auto parts catalog.
 */

import { createClient } from "@/lib/supabase/server";
import type { DbCatalogProduct, DbCatalogProductFull } from "@/types/database";

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a complete product by its URL slug.
 * Returns `null` when no matching product is found (triggers 404 in the page).
 *
 * Fires four parallel Supabase queries:
 *   1. catalog_products     (core identity)
 *   2. product_specifications (technical attributes)
 *   3. compatible_vehicles  (fitment data)
 *   4. oe_numbers           (OE cross-reference)
 */
export async function getProductBySlug(
  slug: string,
): Promise<DbCatalogProductFull | null> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("catalog_products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !product) return null;

  const [specsResult, vehiclesResult, oeResult] = await Promise.all([
    supabase
      .from("product_specifications")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order", { ascending: true }),

    supabase
      .from("compatible_vehicles")
      .select("*")
      .eq("product_id", product.id)
      .order("make", { ascending: true })
      .order("model", { ascending: true })
      .order("year_from", { ascending: true }),

    supabase
      .from("oe_numbers")
      .select("*")
      .eq("product_id", product.id)
      .order("manufacturer", { ascending: true })
      .order("oe_number", { ascending: true }),
  ]);

  return {
    ...product,
    specifications: specsResult.data ?? [],
    compatible_vehicles: vehiclesResult.data ?? [],
    oe_numbers: oeResult.data ?? [],
  } as unknown as DbCatalogProductFull;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC PARAMS (for generateStaticParams)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all product slugs for static site generation.
 * Paginated to stay within memory limits for large catalogs.
 *
 * Usage in page.tsx:
 *   export async function generateStaticParams() {
 *     return getProductSlugs().then(slugs => slugs.map(slug => ({ slug })));
 *   }
 */
export async function getProductSlugs(limit = 10_000): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("catalog_products")
    .select("slug")
    .limit(limit)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => row.slug);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH — by OE number
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find products that match a given OE number (partial match, case-insensitive).
 * Useful for "search by OE number" features on the catalog page.
 */
export async function searchByOeNumber(
  oeNumber: string,
): Promise<DbCatalogProduct[]> {
  const supabase = await createClient();

  const { data: oeRows } = await supabase
    .from("oe_numbers")
    .select("product_id")
    .ilike("oe_number", `%${oeNumber.replace(/\s+/g, "")}%`);

  if (!oeRows?.length) return [];

  const productIds = [...new Set(oeRows.map((r) => r.product_id))];

  const { data: products } = await supabase
    .from("catalog_products")
    .select("*")
    .in("id", productIds);

  return (products ?? []) as unknown as DbCatalogProduct[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH — by vehicle fitment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find products compatible with a specific vehicle.
 * `year` is optional — when provided the query filters within year_from/year_to.
 */
export async function searchByVehicle(
  make: string,
  model: string,
  year?: number,
): Promise<DbCatalogProduct[]> {
  const supabase = await createClient();

  let query = supabase
    .from("compatible_vehicles")
    .select("product_id")
    .ilike("make", make)
    .ilike("model", model);

  if (year !== undefined) {
    query = query.lte("year_from", year).gte("year_to", year);
  }

  const { data: fitmentRows } = await query;
  if (!fitmentRows?.length) return [];

  const productIds = [...new Set(fitmentRows.map((r) => r.product_id))];

  const { data: products } = await supabase
    .from("catalog_products")
    .select("*")
    .in("id", productIds);

  return (products ?? []) as unknown as DbCatalogProduct[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH — by category
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List products in a category with basic pagination.
 */
export async function getProductsByCategory(
  category: string,
  page = 1,
  pageSize = 24,
): Promise<{ products: DbCatalogProduct[]; total: number }> {
  const supabase = await createClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: products, count } = await supabase
    .from("catalog_products")
    .select("*", { count: "exact" })
    .ilike("category", category)
    .order("brand", { ascending: true })
    .range(from, to);

  return {
    products: (products ?? []) as unknown as DbCatalogProduct[],
    total: count ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — slug generator (use when inserting new products)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from brand and MPN.
 * e.g. ("SKF", "VKMC 03316") → "skf-vkmc-03316"
 */
export function generateProductSlug(brand: string, mpn: string): string {
  return `${brand}-${mpn}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
