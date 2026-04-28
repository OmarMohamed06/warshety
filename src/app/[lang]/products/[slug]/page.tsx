import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getProductBySlug,
  getProductSlugs,
} from "@/services/productCatalogService";
import { ProductHeader } from "@/components/parts/catalog/ProductHeader";
import { ProductSpecifications } from "@/components/parts/catalog/ProductSpecifications";
import { CompatibleVehiclesTable } from "@/components/parts/catalog/CompatibleVehiclesTable";
import { OENumbersList } from "@/components/parts/catalog/OENumbersList";
import { ProductJsonLd } from "@/components/parts/catalog/ProductJsonLd";
import { productPageSeo, buildBreadcrumbJsonLd, BASE_URL } from "@/utils/seo";

// ─────────────────────────────────────────────────────────────────────────────
// STATIC PARAMS — pre-render known products at build time
// ─────────────────────────────────────────────────────────────────────────────

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await getProductSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO — generateMetadata (Bilingual, Arabic-first)
// ─────────────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, lang } = await params;
  const locale = (lang === "ar" ? "ar" : "en") as "ar" | "en";
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title:
        locale === "ar"
          ? "المنتج غير موجود | ورشتي"
          : "Product Not Found | Warshety",
    };
  }

  // Derive the primary compatible vehicle for title enrichment
  const firstVehicle = product.compatible_vehicles?.[0];
  const brand = firstVehicle?.make ?? undefined;
  const model = firstVehicle?.model ?? undefined;
  const yearFrom = firstVehicle?.year_from ?? undefined;
  const yearTo = firstVehicle?.year_to ?? undefined;

  return productPageSeo({
    partName: product.name,
    partNameAr: product.name_ar ?? product.name,
    brand: product.brand,
    model,
    yearFrom: yearFrom ?? undefined,
    yearTo: yearTo ?? undefined,
    sku: product.manufacturer_part_number,
    slugEn: product.slug_en ?? product.slug,
    slugAr: product.slug_ar ?? undefined,
    imageUrl: product.image_url,
    locale,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE — Server Component
// ─────────────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: PageProps) {
  const { slug, lang } = await params;
  const locale = (lang === "ar" ? "ar" : "en") as "ar" | "en";
  const isAr = locale === "ar";
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const displayName = isAr && product.name_ar ? product.name_ar : product.name;
  const productUrl = `${BASE_URL}/${locale}/parts/${product.slug_en ?? product.slug}`;

  // Breadcrumb JSON-LD for rich results
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    {
      name: isAr ? "الرئيسية" : "Home",
      url: `${BASE_URL}/${locale}`,
    },
    {
      name: isAr ? "قطع الغيار" : "Parts",
      url: `${BASE_URL}/${locale}/parts`,
    },
    {
      name: displayName,
      url: productUrl,
    },
  ]);

  return (
    <>
      {/* JSON-LD: Product structured data for rich results */}
      <ProductJsonLd product={product} />

      {/* JSON-LD: BreadcrumbList for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main
        className="min-h-screen bg-slate-50 py-8"
        dir={isAr ? "rtl" : "ltr"}
        lang={locale}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* ── Semantic Breadcrumb (H1–H3 hierarchy support) ──────────── */}
          <nav
            aria-label={isAr ? "مسار التنقل" : "Breadcrumb"}
            className="flex items-center gap-1.5 text-sm text-slate-400 mb-6"
          >
            <a
              href={`/${locale}`}
              className="hover:text-slate-600 transition-colors"
            >
              {isAr ? "الرئيسية" : "Home"}
            </a>
            <span aria-hidden="true">›</span>
            <a
              href={`/${locale}/parts`}
              className="hover:text-slate-600 transition-colors"
            >
              {isAr ? "قطع الغيار" : "Parts"}
            </a>
            <span aria-hidden="true">›</span>
            <span className="text-slate-600 truncate max-w-[240px]">
              {product.manufacturer_part_number}
            </span>
          </nav>

          {/* ── H1: Product title ─────────────────────────────────────── */}
          <h1 className="sr-only">
            {displayName} — {product.brand}
          </h1>

          {/* ── Main grid ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Section 1 — Product Overview (H2 inside component) */}
            <ProductHeader product={product} isAr={isAr} />

            {/* Section 2 — Technical Specifications (H2) */}
            <ProductSpecifications
              specifications={product.specifications}
              productLabel={`${displayName} ${product.brand} ${product.manufacturer_part_number}`}
              isAr={isAr}
            />

            {/* Section 3 — Compatible Vehicles (H2: Compatibility) */}
            <CompatibleVehiclesTable
              vehicles={product.compatible_vehicles}
              productLabel={product.category}
            />

            {/* Section 4 — OE Numbers (H2: Product Details) */}
            <OENumbersList
              oeNumbers={product.oe_numbers}
              productLabel={`${product.brand} ${product.manufacturer_part_number}`}
              isAr={isAr}
            />
          </div>

          {/* ── Footer note ─────────────────────────────────────────────── */}
          <p className="mt-8 text-center text-xs text-slate-400">
            {isAr
              ? "بيانات التوافق للإشارة فقط. يُرجى التحقق مع متخصص قبل الشراء."
              : "Fitment data is for reference only. Always verify with a professional before purchasing."}
          </p>
        </div>
      </main>
    </>
  );
}
