/**
 * Arabic product URL route: /ar/قطع-غيار/[slug]
 *
 * This serves product pages under Arabic-first URLs:
 *   /ar/قطع-غيار/فحمات-فرامل-تويوتا-كورولا
 *
 * It looks up the product by slug_ar first, then falls back to
 * the default slug for backward compatibility.
 */

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { productPageSeo, buildBreadcrumbJsonLd, BASE_URL } from "@/utils/seo";
import { ProductHeader } from "@/components/parts/catalog/ProductHeader";
import { ProductSpecifications } from "@/components/parts/catalog/ProductSpecifications";
import { CompatibleVehiclesTable } from "@/components/parts/catalog/CompatibleVehiclesTable";
import { OENumbersList } from "@/components/parts/catalog/OENumbersList";
import { ProductJsonLd } from "@/components/parts/catalog/ProductJsonLd";
import { getProductBySlug } from "@/services/productCatalogService";
import type { DbCatalogProductFull } from "@/types/database";

interface PageProps {
  params: Promise<{ "ar-slug": string }>;
}

async function getProductBySlugAr(
  slugAr: string,
): Promise<DbCatalogProductFull | null> {
  const supabase = await createClient();

  // First try slug_ar match
  const { data: product, error } = await supabase
    .from("catalog_products")
    .select("*")
    .eq("slug_ar", slugAr)
    .single();

  if (error || !product) {
    // Fallback: try the default slug
    return getProductBySlug(slugAr);
  }

  // Load relations
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
      .order("make", { ascending: true }),
    supabase
      .from("oe_numbers")
      .select("*")
      .eq("product_id", product.id)
      .order("manufacturer", { ascending: true }),
  ]);

  return {
    ...(product as unknown as import("@/types/database").DbCatalogProduct),
    specifications: specsResult.data ?? [],
    compatible_vehicles: vehiclesResult.data ?? [],
    oe_numbers: oeResult.data ?? [],
  };
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolved = await params;
  const slugAr = resolved["ar-slug"];
  const product = await getProductBySlugAr(decodeURIComponent(slugAr));

  if (!product) return { title: "المنتج غير موجود | ورشتي" };

  const firstVehicle = product.compatible_vehicles?.[0];

  return productPageSeo({
    partName: product.name,
    partNameAr: product.name_ar ?? product.name,
    brand: product.brand,
    model: firstVehicle?.model,
    yearFrom: firstVehicle?.year_from ?? undefined,
    yearTo: firstVehicle?.year_to ?? undefined,
    sku: product.manufacturer_part_number,
    slugEn: product.slug_en ?? product.slug,
    slugAr: product.slug_ar ?? undefined,
    imageUrl: product.image_url,
    locale: "ar",
  });
}

export default async function ArabicProductPage({ params }: PageProps) {
  const resolved = await params;
  const slugAr = decodeURIComponent(resolved["ar-slug"]);
  const product = await getProductBySlugAr(slugAr);

  if (!product) notFound();

  // If this product has no Arabic slug, redirect to canonical English URL
  if (!product.slug_ar && product.slug) {
    redirect(`/ar/parts/${product.slug}`);
  }

  const displayName = product.name_ar ?? product.name;
  const productUrl = `${BASE_URL}/ar/قطع-غيار/${product.slug_ar ?? product.slug}`;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "الرئيسية", url: `${BASE_URL}/ar` },
    { name: "قطع الغيار", url: `${BASE_URL}/ar/parts` },
    { name: displayName, url: productUrl },
  ]);

  return (
    <>
      <ProductJsonLd product={product} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="min-h-screen bg-slate-50 py-8" dir="rtl" lang="ar">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="مسار التنقل"
            className="flex items-center gap-1.5 text-sm text-slate-400 mb-6"
          >
            <a href="/ar" className="hover:text-slate-600 transition-colors">
              الرئيسية
            </a>
            <span aria-hidden="true">›</span>
            <a
              href="/ar/parts"
              className="hover:text-slate-600 transition-colors"
            >
              قطع الغيار
            </a>
            <span aria-hidden="true">›</span>
            <span className="text-slate-600 truncate max-w-[240px]">
              {displayName}
            </span>
          </nav>

          <h1 className="sr-only">
            {displayName} — {product.brand}
          </h1>

          <div className="flex flex-col gap-6">
            <ProductHeader product={product} />
            <ProductSpecifications
              specifications={product.specifications}
              productLabel={`${displayName} ${product.brand} ${product.manufacturer_part_number}`}
            />
            <CompatibleVehiclesTable
              vehicles={product.compatible_vehicles}
              productLabel={product.category}
            />
            <OENumbersList
              oeNumbers={product.oe_numbers}
              productLabel={`${product.brand} ${product.manufacturer_part_number}`}
            />
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            بيانات التوافق للإشارة فقط. يُرجى التحقق مع متخصص قبل الشراء.
          </p>
        </div>
      </main>
    </>
  );
}
