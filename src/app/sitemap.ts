/**
 * Dynamic Sitemap — SEO-critical for Arabic/English marketplace
 *
 * Generates sitemap.xml at /sitemap.xml covering:
 *   • Static pages (home, services, blog, about, legal)
 *   • Blog article pages (both /ar/ and /en/)
 *   • Service center detail pages (both languages)
 *   • All product category pages (both languages)
 *   • All product pages (both /ar/ and /en/)
 *
 * Arabic pages carry higher priority because the primary market is Egypt.
 */

import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { BASE_URL } from "@/utils/seo";
import { getAllArticles } from "@/lib/blog";

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
    { path: "/", priorityAr: 1.0, priorityEn: 0.9, freq: "daily" as const },
    {
      path: "/services",
      priorityAr: 0.9,
      priorityEn: 0.8,
      freq: "daily" as const,
    },
    {
      path: "/blog",
      priorityAr: 0.8,
      priorityEn: 0.7,
      freq: "weekly" as const,
    },
    {
      path: "/about",
      priorityAr: 0.6,
      priorityEn: 0.5,
      freq: "monthly" as const,
    },
    {
      path: "/legal/terms",
      priorityAr: 0.3,
      priorityEn: 0.3,
      freq: "yearly" as const,
    },
    {
      path: "/legal/privacy",
      priorityAr: 0.3,
      priorityEn: 0.3,
      freq: "yearly" as const,
    },
  ];

  for (const route of staticRoutes) {
    entries.push({
      url: `${BASE_URL}/ar${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.freq,
      priority: route.priorityAr,
    });
    entries.push({
      url: `${BASE_URL}/en${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.freq,
      priority: route.priorityEn,
    });
  }

  // ── Blog article pages (static JSON content) ──────────────────────────────
  const articles = getAllArticles();
  for (const article of articles) {
    entries.push({
      url: `${BASE_URL}/ar/blog/${article.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.75,
    });
    entries.push({
      url: `${BASE_URL}/en/blog/${article.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.65,
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

  // ── Service center detail pages from Supabase ──────────────────────────────
  try {
    const supabase = await createClient();

    const { data: vendors } = await supabase
      .from("vendors")
      .select("slug, updated_at")
      .eq("status", "approved")
      .eq("vendor_type", "service_center")
      .not("slug", "is", null);

    if (vendors) {
      for (const vendor of vendors) {
        if (!vendor.slug) continue;
        entries.push({
          url: `${BASE_URL}/ar/services/${vendor.slug}`,
          lastModified: vendor.updated_at
            ? new Date(vendor.updated_at)
            : new Date(),
          changeFrequency: "weekly",
          priority: 0.85,
        });
        entries.push({
          url: `${BASE_URL}/en/services/${vendor.slug}`,
          lastModified: vendor.updated_at
            ? new Date(vendor.updated_at)
            : new Date(),
          changeFrequency: "weekly",
          priority: 0.75,
        });
      }
    }
  } catch {
    // If DB is unavailable during build, continue
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
          url: `${BASE_URL}/en/products/${enSlug}`,
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
