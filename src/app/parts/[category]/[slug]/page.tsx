import type { Metadata } from "next";
import Link from "next/link";
import PartsListingClient from "@/components/parts/PartsListingClient";
import { generateSeoMeta } from "@/utils/seo";
import { createClient } from "@/lib/supabase/server";
import type { Part } from "@/types";
import type { DbProduct } from "@/types/database";

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

type ProductWithVendor = DbProduct & {
  vendor: { business_name: string; rating: number; city: string | null } | null;
};

function mapProductToPart(p: ProductWithVendor): Part {
  return {
    id: p.id,
    slug: p.id,
    name: p.name,
    brand: p.brand ?? "",
    price: p.price,
    originalPrice: p.original_price ?? undefined,
    condition: p.condition,
    oemNumber: p.oem_number ?? undefined,
    images:
      p.images && p.images.length > 0
        ? p.images
        : p.image_url
          ? [p.image_url]
          : [],
    compatibleVehicles: p.compatible_vehicles ?? [],
    vendorId: p.vendor_id,
    vendorName: p.vendor?.business_name ?? "",
    vendorRating: p.vendor?.rating ?? 0,
    stock: p.stock,
    installationAvailable: false,
    rating: 0,
    reviewCount: 0,
    location: p.vendor?.city ?? "Cairo",
    category: p.category,
    subcategory: p.subcategory ?? undefined,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const name = slug.replace(/-/g, " ");
  return generateSeoMeta({
    title: `${name} — Compatible Parts in Egypt`,
    description: `Buy ${name} from verified vendors in Egypt. OEM compatibility guaranteed. Fast delivery.`,
    path: `/parts/${category}/${slug}`,
  });
}

const MOCK_PARTS: Part[] = [
  {
    id: "bosch-bp-bmw-320i-2015",
    slug: "bosch-brake-pads-bmw-320i-2015",
    name: "Bosch QuietCast Premium Disc Brake Pads",
    brand: "Bosch",
    price: 850,
    originalPrice: 1100,
    condition: "new",
    oemNumber: "0986BB0024",
    images: [],
    compatibleVehicles: ["BMW 320i 2015", "BMW 320i 2016", "BMW 316i 2015"],
    vendorId: "v1",
    vendorName: "Elite Auto Parts",
    vendorRating: 4.9,
    stock: 12,
    deliveryDays: 2,
    warrantyMonths: 24,
    installationAvailable: true,
    rating: 4.8,
    reviewCount: 124,
    location: "Cairo",
    category: "brakes",
    subcategory: "brake-pads",
  },
  {
    id: "brembo-bp-bmw-320i",
    slug: "brembo-brake-pads-bmw-320i",
    name: "Brembo P23 Premium Front Brake Pads",
    brand: "Brembo",
    price: 1200,
    condition: "new",
    oemNumber: "P23052",
    images: [],
    compatibleVehicles: ["BMW 320i 2013-2016", "BMW 328i 2014"],
    vendorId: "v2",
    vendorName: "ProParts Cairo",
    vendorRating: 4.7,
    stock: 5,
    deliveryDays: 1,
    warrantyMonths: 36,
    installationAvailable: true,
    rating: 4.9,
    reviewCount: 87,
    location: "New Cairo",
    category: "brakes",
    subcategory: "brake-pads",
  },
  {
    id: "ate-bp-toyota-corolla",
    slug: "ate-brake-pads-toyota-corolla-2018",
    name: "ATE Ceramic Brake Pads — Front Set",
    brand: "ATE",
    price: 620,
    condition: "new",
    images: [],
    compatibleVehicles: [
      "Toyota Corolla 2018",
      "Toyota Corolla 2019",
      "Toyota Corolla 2020",
    ],
    vendorId: "v3",
    vendorName: "Al Nour Auto",
    vendorRating: 4.5,
    stock: 20,
    deliveryDays: 3,
    warrantyMonths: 12,
    installationAvailable: false,
    rating: 4.5,
    reviewCount: 56,
    location: "Alexandria",
    category: "brakes",
    subcategory: "brake-pads",
  },
  {
    id: "ferodo-bp-hyundai-elantra",
    slug: "ferodo-brake-pads-hyundai-elantra",
    name: "Ferodo Premier Front Brake Pads",
    brand: "Ferodo",
    price: 480,
    condition: "new",
    images: [],
    compatibleVehicles: ["Hyundai Elantra 2017-2022", "Kia Cerato 2018-2022"],
    vendorId: "v1",
    vendorName: "Elite Auto Parts",
    vendorRating: 4.9,
    stock: 8,
    deliveryDays: 2,
    warrantyMonths: 18,
    installationAvailable: true,
    rating: 4.6,
    reviewCount: 43,
    location: "Cairo",
    category: "brakes",
    subcategory: "brake-pads",
  },
  {
    id: "mintex-bp-toyota-camry",
    slug: "mintex-brake-pads-toyota-camry",
    name: "Mintex MDB1662 Rear Brake Pads",
    brand: "Mintex",
    price: 390,
    originalPrice: 450,
    condition: "new",
    images: [],
    compatibleVehicles: ["Toyota Camry 2018-2023", "Toyota Avalon 2019-2023"],
    vendorId: "v4",
    vendorName: "Parts Planet",
    vendorRating: 4.3,
    stock: 15,
    deliveryDays: 4,
    warrantyMonths: 12,
    installationAvailable: false,
    rating: 4.2,
    reviewCount: 29,
    location: "Giza",
    category: "brakes",
    subcategory: "brake-pads",
  },
  {
    id: "akebono-bp-honda-civic",
    slug: "akebono-brake-pads-honda-civic",
    name: "Akebono Euro Ultra-Premium Ceramic Brake Pads",
    brand: "Akebono",
    price: 750,
    condition: "new",
    oemNumber: "EUR1086",
    images: [],
    compatibleVehicles: ["Honda Civic 2016-2021", "Honda Accord 2018-2022"],
    vendorId: "v2",
    vendorName: "ProParts Cairo",
    vendorRating: 4.7,
    stock: 3,
    deliveryDays: 2,
    warrantyMonths: 24,
    installationAvailable: true,
    rating: 4.7,
    reviewCount: 61,
    location: "New Cairo",
    category: "brakes",
    subcategory: "brake-pads",
  },
];

export default async function ProductListPage({ params }: Props) {
  const { category, slug } = await params;
  const supabase = await createClient();

  // Build human-readable search terms from URL slugs
  const categoryTerm = category.replace(/-/g, " ");
  const subcategoryTerm = slug.replace(/-/g, " ");

  // Try subcategory-specific query first
  let { data: products } = await supabase
    .from("products")
    .select("*, vendor:vendors(business_name, rating, city)")
    .eq("active", true)
    .ilike("category", `%${categoryTerm}%`)
    .ilike("subcategory", `%${subcategoryTerm}%`)
    .order("created_at", { ascending: false })
    .limit(60);

  // Fallback: just category (subcategory may not match)
  if (!products || products.length === 0) {
    const { data: catProducts } = await supabase
      .from("products")
      .select("*, vendor:vendors(business_name, rating, city)")
      .eq("active", true)
      .ilike("category", `%${categoryTerm}%`)
      .order("created_at", { ascending: false })
      .limit(60);
    products = catProducts;
  }

  const dbParts: Part[] = (
    (products ?? []) as unknown as ProductWithVendor[]
  ).map(mapProductToPart);

  // Fall back to mock data when DB is empty (dev / demo mode)
  const parts = dbParts.length > 0 ? dbParts : MOCK_PARTS;

  const displayName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <nav className="text-xs text-slate-400 mb-4 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-[#FF4B19]">
              Home
            </Link>
            <span className="material-symbols-outlined text-sm">
              chevron_right
            </span>
            <Link href="/parts" className="hover:text-[#FF4B19]">
              Parts Shop
            </Link>
            <span className="material-symbols-outlined text-sm">
              chevron_right
            </span>
            <Link
              href={`/parts/${category}`}
              className="hover:text-[#FF4B19] capitalize"
            >
              {category.replace(/-/g, " ")}
            </Link>
            <span className="material-symbols-outlined text-sm">
              chevron_right
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {displayName}
            </span>
          </nav>
          <h1 className="text-3xl font-black mb-1">{displayName}</h1>
          <p className="text-slate-500 text-sm">
            {parts.length} parts available
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <PartsListingClient
          parts={parts}
          categorySlug={category}
          subcategorySlug={slug}
        />
      </div>
    </div>
  );
}
