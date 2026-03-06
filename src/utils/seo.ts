import type { Metadata } from "next";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}

const BASE_URL = "https://garage.eg";

export function generateSeoMeta({
  title,
  description,
  path,
  image,
  noIndex,
}: SeoProps): Metadata {
  const fullTitle = `${title} | Garage Egypt`;
  const url = `${BASE_URL}${path}`;
  const ogImage = image ?? `${BASE_URL}/og-default.jpg`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: "Garage Egypt",
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
      locale: "ar_EG",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/** Programmatic SEO — auto-generate title/desc for part pages */
export function partPageSeo(
  partName: string,
  brand: string,
  model: string,
  year: number,
): Metadata {
  return generateSeoMeta({
    title: `${partName} for ${brand} ${model} ${year}`,
    description: `Buy compatible ${partName} for ${brand} ${model} ${year} in Egypt. Verified vendors, OEM parts, fast delivery. قطع غيار ${brand} ${model}.`,
    path: `/parts/${encodeURIComponent(partName.toLowerCase().replace(/\s+/g, "-"))}-${brand.toLowerCase()}-${model.toLowerCase()}-${year}`,
  });
}

/** Programmatic SEO — auto-generate title/desc for service pages */
export function servicePageSeo(serviceName: string, city: string): Metadata {
  return generateSeoMeta({
    title: `${serviceName} in ${city}`,
    description: `Book trusted ${serviceName} service centers in ${city}, Egypt. Verified workshops, transparent pricing, instant booking. خدمات السيارات في ${city}.`,
    path: `/services/${serviceName.toLowerCase().replace(/\s+/g, "-")}-${city.toLowerCase()}`,
  });
}
