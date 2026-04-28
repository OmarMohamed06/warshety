import type { DbCatalogProduct } from "@/types/database";

interface Props {
  product: DbCatalogProduct;
}

/**
 * ProductJsonLd
 *
 * Injects a `<script type="application/ld+json">` block with
 * Schema.org Product structured data for rich results in Google.
 *
 * Renders as a Server Component — no client bundle cost.
 */
export function ProductJsonLd({ product }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ?? undefined,
    sku: product.manufacturer_part_number,
    mpn: product.manufacturer_part_number,
    gtin13: product.ean ?? undefined,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    manufacturer: {
      "@type": "Organization",
      name: product.manufacturer,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EGP",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Warshety",
        url: "https://garage.eg",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
