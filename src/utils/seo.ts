/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEO ENGINE — Bilingual Arabic/English with Arabic-first optimization
 * Target market: Egypt automotive marketplace
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Metadata } from "next";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_URL = "https://garage.eg";
export const SITE_NAME_AR = "ورشتي";
export const SITE_NAME_EN = "Warshety";
export const SITE_TAGLINE_AR = "قطع غيار سيارات في مصر";
export const SITE_TAGLINE_EN = "Car Parts in Egypt";

export type Locale = "en" | "ar";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ARABIC TEXT NORMALIZATION (Critical for search & slugs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize Arabic text for SEO and search:
 * - Remove diacritics (tashkeel: fatha, kasra, damma, etc.)
 * - Normalize Alef variants → ا
 * - Normalize Teh Marbuta → ه
 * - Normalize Alef Maqsoura → ي
 * - Remove tatweel (kashida)
 * - Normalize Hamza variants
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove diacritics & superscript alef
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // آ أ إ ٱ → ا
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0640/g, "") // remove tatweel ـ
    .replace(/\u0624/g, "\u0648") // ؤ → و
    .replace(/\u0626/g, "\u064A") // ئ → ي
    .trim();
}

/**
 * Generate an Arabic SEO slug:
 * - Normalize Arabic text
 * - Replace spaces and separators with hyphens
 * - Keep Arabic Unicode characters (UTF-8 URL safe)
 */
export function generateSlugAr(text: string): string {
  return normalizeArabic(text)
    .replace(/[\s\-_،,،؛;:؟?!.]+/g, "-")
    .replace(/[^\u0600-\u06FF\u0750-\u077F\-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate an English SEO slug:
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 */
export function generateSlugEn(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate both slugs from bilingual product data.
 */
export function generateBilingualSlugs(
  nameAr: string,
  nameEn: string,
  brand?: string,
): { slug_ar: string; slug_en: string } {
  const brandArSuffix = brand ? `-${generateSlugAr(brand)}` : "";
  const brandEnSuffix = brand ? `-${generateSlugEn(brand)}` : "";
  return {
    slug_ar: generateSlugAr(`${nameAr}${brandArSuffix}`),
    slug_en: generateSlugEn(`${nameEn}${brandEnSuffix}`),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. KEYWORD EXPANSION (Egyptian Arabic automotive synonyms)
// ─────────────────────────────────────────────────────────────────────────────

export const ARABIC_KEYWORD_SYNONYMS: Record<string, string[]> = {
  "brake pads": ["فحمات فرامل", "تيل فرامل", "فحمات", "تيل", "بطانة الفرامل"],
  "brake discs": ["أقراص الفرامل", "ديسكات فرامل", "ديسك فرامل", "قرص الفرامل"],
  "shock absorbers": ["مساعدات", "مسعد", "دراع مساعد", "أمورتيسور"],
  "timing belt": ["سير التوقيت", "تايمنج بلت", "حزام التوقيت"],
  "oil filter": ["فلتر زيت", "فلتر الزيت"],
  "air filter": ["فلتر هواء", "فلتر الهواء"],
  alternator: ["دينامو", "دينامو السيارة"],
  starter: ["مارش", "مارش السيارة", "بادئ التشغيل"],
  "spark plug": ["بوجيه", "بوجيهات", "شمعة الإشعال"],
  radiator: ["رادياتير", "رادياتير السيارة", "مبرد المحرك"],
  clutch: ["كلتش", "كلاتش", "تروس الكلتش"],
  suspension: ["تعليق", "نظام التعليق", "ماصات"],
  "water pump": ["طلمبة ماء", "مضخة الماء", "طلمبة المياه"],
  battery: ["بطارية", "بطارية السيارة", "أكو"],
  turbo: ["تيربو", "تربو", "ضاغط الهواء"],
};

export function getArabicKeywords(
  partName: string,
  additionalKeywords: string[] = [],
): string[] {
  const lower = partName.toLowerCase();
  for (const [key, synonyms] of Object.entries(ARABIC_KEYWORD_SYNONYMS)) {
    if (lower.includes(key)) return [...synonyms, ...additionalKeywords];
  }
  return additionalKeywords;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TITLE STRATEGY
// ─────────────────────────────────────────────────────────────────────────────

export function buildProductTitleAr(params: {
  partName: string;
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
}): string {
  const { partName, brand, model, yearFrom, yearTo } = params;
  let title = partName;
  if (brand && model) title += ` ${brand} ${model}`;
  else if (brand) title += ` ${brand}`;
  if (yearFrom && yearTo && yearFrom !== yearTo)
    title += ` (${yearFrom}-${yearTo})`;
  else if (yearFrom) title += ` (${yearFrom})`;
  return `${title} | ${SITE_NAME_AR}`;
}

export function buildProductTitleEn(params: {
  partName: string;
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
}): string {
  const { partName, brand, model, yearFrom, yearTo } = params;
  let title = partName;
  if (brand && model) title += ` for ${brand} ${model}`;
  else if (brand) title += ` for ${brand}`;
  if (yearFrom && yearTo && yearFrom !== yearTo)
    title += ` (${yearFrom}-${yearTo})`;
  else if (yearFrom) title += ` (${yearFrom})`;
  return `${title} | ${SITE_NAME_EN}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DESCRIPTION STRATEGY (Egyptian Arabic phrasing)
// ─────────────────────────────────────────────────────────────────────────────

export function buildProductDescriptionAr(params: {
  partName: string;
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  city?: string;
}): string {
  const { partName, brand, model, yearFrom, yearTo, city = "مصر" } = params;
  const carInfo =
    brand && model
      ? `سيارة ${brand} ${model}`
      : brand
        ? `سيارة ${brand}`
        : "السيارة";
  const yearRange =
    yearFrom && yearTo && yearFrom !== yearTo
      ? ` من ${yearFrom} إلى ${yearTo}`
      : yearFrom
        ? ` ${yearFrom}`
        : "";
  return `شراء ${partName} لـ ${carInfo}${yearRange} في ${city}. جودة عالية وسعر مناسب. توصيل سريع وبائعون موثوقون.`;
}

export function buildProductDescriptionEn(params: {
  partName: string;
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
}): string {
  const { partName, brand, model, yearFrom, yearTo } = params;
  const carInfo =
    brand && model ? `${brand} ${model}` : brand ? brand : "your car";
  const yearRange =
    yearFrom && yearTo && yearFrom !== yearTo
      ? ` (${yearFrom}-${yearTo})`
      : yearFrom
        ? ` (${yearFrom})`
        : "";
  return `Buy ${partName} for ${carInfo}${yearRange} in Egypt. High quality parts, best price, fast delivery. Verified vendors.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CATEGORY CONTENT LAYER
// ─────────────────────────────────────────────────────────────────────────────

export function buildCategoryContentAr(
  categoryNameAr: string,
  sampleBrands?: string[],
): string {
  const brands =
    sampleBrands && sampleBrands.length > 0
      ? ` مثل ${sampleBrands.slice(0, 3).join(" و ")}`
      : "";
  return `تصفح أفضل ${categoryNameAr}${brands} بأسعار مناسبة في مصر. نوفر قطع غيار أصلية ومعادلة عالية الجودة متوافقة مع جميع السيارات الشائعة في السوق المصري. بائعون موثوقون وتوصيل سريع لجميع المحافظات.`;
}

export function buildCategoryContentEn(
  categoryNameEn: string,
  sampleBrands?: string[],
): string {
  const brands =
    sampleBrands && sampleBrands.length > 0
      ? ` from brands like ${sampleBrands.slice(0, 3).join(", ")}`
      : "";
  return `Browse the best ${categoryNameEn}${brands} at competitive prices in Egypt. We offer OEM and aftermarket parts compatible with all popular vehicles. Verified vendors, fast delivery nationwide.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. STRUCTURED DATA (JSON-LD)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductJsonLdData {
  name: string;
  description?: string | null;
  image?: string | null;
  brand: string;
  sku?: string | null;
  price?: number | string | null;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  url: string;
}

export function buildProductJsonLd(data: ProductJsonLdData): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.name,
    brand: { "@type": "Brand", name: data.brand },
    url: data.url,
  };
  if (data.description) schema.description = data.description;
  if (data.image) schema.image = data.image;
  if (data.sku) schema.sku = data.sku;
  if (data.price != null) {
    schema.offers = {
      "@type": "Offer",
      price: data.price,
      priceCurrency: data.currency ?? "EGP",
      availability: `https://schema.org/${data.availability ?? "InStock"}`,
    };
  }
  return schema;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildWebsiteJsonLd(locale: Locale = "ar"): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: locale === "ar" ? SITE_NAME_AR : SITE_NAME_EN,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/${locale}/parts?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ARABIC FUZZY SEARCH NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeSearchQuery(query: string, locale: Locale): string {
  if (locale === "ar") return normalizeArabic(query).toLowerCase().trim();
  return query.toLowerCase().trim();
}

export function buildSearchPattern(query: string, locale: Locale): string {
  const normalized = normalizeSearchQuery(query, locale);
  return `%${normalized}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. LOCATION SEO SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

export const EGYPT_CITIES_AR = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الشرقية",
  "الغربية",
  "المنصورة",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "الإسماعيلية",
  "السويس",
  "بورسعيد",
  "دمياط",
  "كفر الشيخ",
  "المنوفية",
  "البحيرة",
  "القليوبية",
];

export const EGYPT_CITIES_EN = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Sharqia",
  "Gharbia",
  "Mansoura",
  "Asyut",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
  "Faiyum",
  "Beni Suef",
  "Minya",
  "Ismailia",
  "Suez",
  "Port Said",
  "Damietta",
  "Kafr El Sheikh",
  "Monufia",
  "Beheira",
  "Qalyubia",
];

export function appendLocationSignal(
  description: string,
  locale: Locale,
): string {
  if (locale === "ar") {
    return `${description} متاح في القاهرة والجيزة والإسكندرية وجميع محافظات مصر.`;
  }
  return `${description} Available in Cairo, Giza, Alexandria, and all Egyptian governorates.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. CORE generateSeoMeta
// ─────────────────────────────────────────────────────────────────────────────

interface SeoProps {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
  image?: string;
  noIndex?: boolean;
  /** Override alternate path for the other language if different from `path` */
  altPath?: string;
}

/**
 * Core metadata generator. Arabic-first defaults.
 * Handles canonical, hreflang alternates, Open Graph, Twitter Card.
 */
export function generateSeoMeta({
  title,
  description,
  path,
  locale = "ar",
  image,
  noIndex,
  altPath,
}: SeoProps): Metadata {
  const cleanPath = path.replace(/^\/(en|ar)/, "") || "/";
  const altClean = altPath
    ? altPath.replace(/^\/(en|ar)/, "") || "/"
    : cleanPath;

  const canonicalUrl = `${BASE_URL}/${locale}${cleanPath}`;
  const arUrl = `${BASE_URL}/ar${altClean}`;
  const enUrl = `${BASE_URL}/en${altClean}`;
  const ogImage = image ?? `${BASE_URL}/og-default.jpg`;
  const siteName = locale === "ar" ? SITE_NAME_AR : SITE_NAME_EN;
  const fullTitle = title.includes("|") ? title : `${title} | ${siteName}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: arUrl,
        en: enUrl,
        "x-default": arUrl, // Arabic is the primary language
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName,
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
      type: "website",
      locale: locale === "ar" ? "ar_EG" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          "max-snippet": -1,
          "max-image-preview": "large",
        },
    other: {
      "content-language": locale === "ar" ? "ar-EG" : "en-EG",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. PRODUCT PAGE SEO — Full bilingual metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductSeoParams {
  partName: string;
  partNameAr?: string;
  brand: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  sku?: string | null;
  slugEn: string;
  slugAr?: string;
  imageUrl?: string | null;
  locale?: Locale;
}

/**
 * Generate full bilingual SEO metadata for a product page.
 * Arabic-first: Arabic title/description used when locale=ar.
 */
export function productPageSeo(params: ProductSeoParams): Metadata {
  const {
    partName,
    partNameAr,
    brand,
    model,
    yearFrom,
    yearTo,
    slugEn,
    slugAr,
    imageUrl,
    locale = "ar",
  } = params;

  const isAr = locale === "ar";
  const nameAr = partNameAr ?? partName;

  const title = isAr
    ? buildProductTitleAr({ partName: nameAr, brand, model, yearFrom, yearTo })
    : buildProductTitleEn({ partName, brand, model, yearFrom, yearTo });

  const description = isAr
    ? buildProductDescriptionAr({
        partName: nameAr,
        brand,
        model,
        yearFrom,
        yearTo,
        city: "مصر",
      })
    : buildProductDescriptionEn({ partName, brand, model, yearFrom, yearTo });

  const enPath = `/parts/${slugEn}`;
  const arPath = slugAr ? `/قطع-غيار/${slugAr}` : enPath;
  const canonicalPath = isAr ? arPath : enPath;
  const canonicalUrl = `${BASE_URL}/${locale}${canonicalPath}`;
  const arUrl = `${BASE_URL}/ar${arPath}`;
  const enUrl = `${BASE_URL}/en${enPath}`;
  const ogImage = imageUrl ?? `${BASE_URL}/og-default.jpg`;
  const siteName = isAr ? SITE_NAME_AR : SITE_NAME_EN;

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: canonicalUrl,
      languages: { ar: arUrl, en: enUrl, "x-default": arUrl },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: "website",
      locale: isAr ? "ar_EG" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. CATEGORY PAGE SEO
// ─────────────────────────────────────────────────────────────────────────────

export interface CategorySeoParams {
  categoryNameEn: string;
  categoryNameAr: string;
  slugEn: string;
  locale?: Locale;
  sampleBrands?: string[];
  productCount?: number;
}

export function categoryPageSeo(params: CategorySeoParams): Metadata {
  const {
    categoryNameEn,
    categoryNameAr,
    slugEn,
    locale = "ar",
    sampleBrands,
    productCount,
  } = params;
  const isAr = locale === "ar";
  const countInfo = productCount ? ` (${productCount}+)` : "";

  const title = isAr
    ? `${categoryNameAr}${countInfo} سيارات في مصر | ${SITE_NAME_AR}`
    : `${categoryNameEn}${countInfo} for Cars in Egypt | ${SITE_NAME_EN}`;

  const description = isAr
    ? buildCategoryContentAr(categoryNameAr, sampleBrands)
    : buildCategoryContentEn(categoryNameEn, sampleBrands);

  return generateSeoMeta({
    title,
    description,
    path: `/parts/${slugEn}`,
    locale,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. PARTS INDEX PAGE SEO
// ─────────────────────────────────────────────────────────────────────────────

export function partsIndexPageSeo(locale: Locale = "ar"): Metadata {
  const isAr = locale === "ar";
  return generateSeoMeta({
    title: isAr
      ? `قطع غيار سيارات في مصر | شراء ومقارنة الأسعار | ${SITE_NAME_AR}`
      : `Car Spare Parts in Egypt | Buy & Compare Prices | ${SITE_NAME_EN}`,
    description: isAr
      ? "تصفح قطع غيار السيارات لجميع الماركات في مصر. قارن الأسعار واعثر على القطعة المناسبة بسهولة."
      : "Shop car spare parts for all brands in Egypt. Compare prices, find compatible parts, and contact sellers بسهولة.",
    path: "/parts",
    locale,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. SERVICE PAGE SEO
// ─────────────────────────────────────────────────────────────────────────────

export function servicePageSeo(
  serviceName: string,
  city: string,
  locale: Locale = "ar",
): Metadata {
  const isAr = locale === "ar";
  const title = isAr
    ? `${serviceName} في ${city} | ${SITE_NAME_AR}`
    : `${serviceName} in ${city} | ${SITE_NAME_EN}`;
  const description = isAr
    ? `احجز مراكز خدمة ${serviceName} الموثوقة في ${city}، مصر. ورش معتمدة، أسعار شفافة، حجز فوري.`
    : `Book trusted ${serviceName} service centers in ${city}, Egypt. Verified workshops, transparent pricing, instant booking.`;
  return generateSeoMeta({
    title,
    description,
    path: `/services/${generateSlugEn(`${serviceName}-${city}`)}`,
    locale,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 14A. SERVICE CENTERS INDEX PAGE SEO
// ─────────────────────────────────────────────────────────────────────────────

export function serviceCentersIndexSeo(locale: Locale = "ar"): Metadata {
  const isAr = locale === "ar";
  return generateSeoMeta({
    title: isAr
      ? `مراكز صيانة سيارات بالقرب منك في مصر | ${SITE_NAME_AR}`
      : `Car Service Centers Near Me in Egypt | ${SITE_NAME_EN}`,
    description: isAr
      ? "تصفح أفضل مراكز صيانة السيارات بالقرب منك. احجز صيانة دورية أو كشف أعطال بسهولة في جميع أنحاء مصر."
      : "Browse top-rated car service centers near you. Book maintenance, inspection, and repairs بسهولة across Egypt.",
    path: "/services",
    locale,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 14B. LOCATION SEO — City-level targeting
// ─────────────────────────────────────────────────────────────────────────────

export function locationServiceSeo(
  cityAr: string,
  cityEn: string,
  locale: Locale = "ar",
): Metadata {
  const isAr = locale === "ar";
  return generateSeoMeta({
    title: isAr
      ? `صيانة سيارات في ${cityAr} | ${SITE_NAME_AR}`
      : `Car Services in ${cityEn} | ${SITE_NAME_EN}`,
    description: isAr
      ? `اعثر على أفضل مراكز صيانة السيارات في ${cityAr}. احجز صيانة دورية، كشف أعطال، وخدمات متخصصة بسهولة مع ورشتي.`
      : `Find the best car service centers in ${cityEn}, Egypt. Book maintenance, diagnostics, and specialist repairs بسهولة with Warshety.`,
    path: `/services?city=${generateSlugEn(cityEn)}`,
    locale,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. UTILITY: pick localized DB field
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick the localised value of a DB row field.
 * Falls back to the English field if the Arabic translation is missing.
 */
export function pick<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string {
  if (locale === "ar") {
    const arField = `${field}_ar`;
    const arValue = row[arField];
    if (typeof arValue === "string" && arValue.trim()) return arValue;
  }
  const enValue = row[field];
  return typeof enValue === "string" ? enValue : "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. LEGACY ALIAS — keeps old call sites working
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use productPageSeo() instead */
export function partPageSeo(
  partName: string,
  brand: string,
  model: string,
  year: number,
  locale: Locale = "ar",
): Metadata {
  return productPageSeo({
    partName,
    brand,
    model,
    yearFrom: year,
    slugEn: generateSlugEn(`${partName}-${brand}-${model}-${year}`),
    locale,
  });
}
