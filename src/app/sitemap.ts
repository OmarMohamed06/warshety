/**
 * Dynamic Sitemap — SEO-critical for Arabic/English marketplace
 *
 * Generates sitemap.xml at /sitemap.xml covering:
 *   • All product pages (both /ar/ and /en/)
 *   • All category pages (both languages)
 *   • Static pages (home, parts index, services)
 *
 * Arabic pages carry higher priority (0.9) vs English (0.8) because
 * the primary market is Egypt.
 */

import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { BASE_URL } from "@/utils/seo";

// ─────────────────────────────────────────────────────────────────────────────
// STATIC CATEGORIES (mirrors the SUBCATEGORY_DATA in the category page)
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "brake-system",
  "filters",
  "suspension",
  "steering",
  "wipers-washers",
  "engine-parts",
  "fuel-system",
  "exhaust-system",
  "electric-system",
  "engine-cooling",
  "heating-ventilation",
  "transmission-clutch",
  "car-body-interior",
  "lighting",
  "oils-fluids",
  "accessories-equipment",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticRoutes = [
    { path: "/", priorityAr: 1.0, priorityEn: 0.9 },
    { path: "/parts", priorityAr: 0.9, priorityEn: 0.8 },
    { path: "/services", priorityAr: 0.8, priorityEn: 0.7 },
    { path: "/garage", priorityAr: 0.7, priorityEn: 0.6 },
  ];

  for (const route of staticRoutes) {
    entries.push({
      url: `${BASE_URL}/ar${route.path}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: route.priorityAr,
    });
    entries.push({
      url: `${BASE_URL}/en${route.path}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: route.priorityEn,
    });
  }

  // ── Category pages ────────────────────────────────────────────────────────
  for (const cat of CATEGORIES) {
    entries.push({
      url: `${BASE_URL}/ar/parts/${cat}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    });
    entries.push({
      url: `${BASE_URL}/en/parts/${cat}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  // ── Product pages from Supabase ───────────────────────────────────────────
  try {
    const supabase = await createClient();

    // Paginate to handle large catalogs without memory issues
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      type ProductRow = {
        slug: string;
        slug_ar: string | null;
        slug_en: string | null;
        updated_at: string;
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await supabase
        .from("catalog_products")
        .select("slug, slug_ar, slug_en, updated_at")
        .range(from, from + PAGE_SIZE - 1)
        .order("updated_at", { ascending: false })) as unknown as {
        data: ProductRow[] | null;
        error: unknown;
      };

      if (error || !data || data.length === 0) break;

      for (const product of data) {
        const enSlug = product.slug_en ?? product.slug;
        const arSlug = product.slug_ar ?? product.slug;

        // English product URL uses slug_en (or fallback slug)
        entries.push({
          url: `${BASE_URL}/en/parts/${enSlug}`,
          lastModified: new Date(product.updated_at),
          changeFrequency: "monthly",
          priority: 0.8,
        });

        // Arabic product URL uses slug_ar (or fallback slug)
        entries.push({
          url: `${BASE_URL}/ar/قطع-غيار/${arSlug}`,
          lastModified: new Date(product.updated_at),
          changeFrequency: "monthly",
          priority: 0.9, // Arabic pages have higher priority
        });
      }

      hasMore = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }
  } catch {
    // If DB is unavailable during build, return what we have
  }

  return entries;
}
