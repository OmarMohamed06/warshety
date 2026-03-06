import type { Metadata } from "next";
import Link from "next/link";
import { partPageSeo } from "@/utils/seo";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import AddToCartButton from "@/components/parts/AddToCartButton";

interface Props {
  params: Promise<{ category: string; slug: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("name, brand, vendor:vendors(business_name)")
    .eq("id", id)
    .single();
  if (!product) return partPageSeo("Part", "Unknown", "", 0);
  const vendorName =
    (product.vendor as unknown as { business_name: string } | null)
      ?.business_name ?? "";
  return partPageSeo(product.name, product.brand ?? "Unknown", vendorName, 0);
}

// ── Mock fallback (dev / demo mode) ─────────────────────────────────────────
const MOCK_PRODUCT = {
  id: "bosch-bp-bmw-320i-2015",
  vendor_id: "v1",
  name: "Bosch QuietCast Premium Disc Brake Pads — Front",
  description:
    "OEM-quality brake pads engineered for BMW 3 Series. Low dust formula, quiet operation, and optimized bite for city and highway driving. Includes hardware kit.",
  price: 850,
  original_price: 1100,
  category: "brakes",
  subcategory: "brake-pads",
  sku: "BC905",
  oem_number: "0986BB0024",
  brand: "Bosch",
  condition: "new" as const,
  stock: 12,
  image_url: null,
  images: [] as string[],
  active: true,
  compatible_vehicles: [
    "BMW 320i 2013–2016 (F30)",
    "BMW 316i 2012–2016 (F30)",
    "BMW 328i 2013–2014 (F30)",
    "BMW 320d 2013–2016 (F30)",
  ],
  created_at: "",
  updated_at: "",
  vendor: {
    id: "v1",
    business_name: "Elite Auto Parts",
    rating: 4.9,
    total_reviews: 312,
    city: "New Cairo",
  },
};

export default async function PartDetailPage({ params }: Props) {
  const { category, slug, id } = await params;
  const supabase = await createClient();

  const { data: productData } = await supabase
    .from("products")
    .select("*, vendor:vendors(id, business_name, rating, total_reviews, city)")
    .eq("id", id)
    .single();

  // Fall back to mock data when product doesn't exist in DB (dev / demo mode)
  const product = productData ?? MOCK_PRODUCT;

  const vendor = product.vendor as unknown as {
    id: string;
    business_name: string;
    rating: number;
    total_reviews: number;
    city: string | null;
  } | null;

  const part = {
    id: product.id,
    name: product.name,
    brand: product.brand ?? "",
    oemNumber: product.oem_number ?? undefined,
    partNumber: product.sku ?? undefined,
    price: product.price,
    originalPrice: product.original_price ?? undefined,
    condition: product.condition,
    warrantyMonths: undefined as number | undefined,
    stock: product.stock,
    deliveryDays: 3 as number | undefined,
    installationAvailable: false,
    images:
      product.images && product.images.length > 0
        ? product.images
        : product.image_url
          ? [product.image_url]
          : [],
    description: product.description ?? "",
    compatibleVehicles: product.compatible_vehicles ?? [],
    vendorName: vendor?.business_name ?? "",
    vendorRating: vendor?.rating ?? 0,
    vendorReviewCount: vendor?.total_reviews ?? 0,
    vendorCity: vendor?.city ?? "Cairo",
    vendorId: product.vendor_id,
    rating: 0,
    reviewCount: 0,
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-400 mb-8 flex items-center gap-2 flex-wrap">
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
            {category}
          </Link>
          <span className="material-symbols-outlined text-sm">
            chevron_right
          </span>
          <Link
            href={`/parts/${category}/${slug}`}
            className="hover:text-[#FF4B19]"
          >
            {slug.replace(/-/g, " ")}
          </Link>
          <span className="material-symbols-outlined text-sm">
            chevron_right
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1">
            {part.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image gallery */}
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl h-96 flex items-center justify-center border border-slate-100 dark:border-slate-700 mb-4">
              <span className="material-symbols-outlined text-8xl text-slate-200">
                construction
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-20 rounded-xl border-2 flex items-center justify-center cursor-pointer ${i === 0 ? "border-[#FF4B19]" : "border-slate-200 dark:border-slate-700"} bg-white dark:bg-slate-800`}
                >
                  <span className="material-symbols-outlined text-slate-300">
                    construction
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Part info */}
          <div>
            {/* H1 — SEO critical */}
            <h1 className="text-2xl font-black leading-snug mb-2">
              {part.name}
            </h1>
            <p className="text-slate-500 text-sm mb-4">
              {part.brand} · OEM: {part.oemNumber}
            </p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-[#FF4B19] text-lg"
                  style={{
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  star
                </span>
              ))}
              <span className="font-bold">{part.rating}</span>
              <span className="text-slate-400 text-sm">
                ({part.reviewCount} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-black text-[#FF4B19]">
                {formatPrice(part.price)}
              </span>
              {part.originalPrice && (
                <>
                  <span className="text-xl text-slate-400 line-through">
                    {formatPrice(part.originalPrice)}
                  </span>
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    -
                    {Math.round(
                      ((part.originalPrice - part.price) / part.originalPrice) *
                        100,
                    )}
                    % OFF
                  </span>
                </>
              )}
            </div>

            {/* Stock & delivery */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600">
                  check_circle
                </span>
                <div>
                  <p className="text-xs font-bold text-green-700">In Stock</p>
                  <p className="text-xs text-green-600">{part.stock} units</p>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-600">
                  local_shipping
                </span>
                <div>
                  <p className="text-xs font-bold text-blue-700">
                    Fast Delivery
                  </p>
                  <p className="text-xs text-blue-600">
                    {part.deliveryDays} business days
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 mb-8">
              <AddToCartButton
                id={part.id}
                name={part.name}
                vendorName={part.vendorName}
                vendorId={part.vendorId}
                sku={part.partNumber ?? part.oemNumber ?? part.id}
                price={part.price}
                image={part.images?.[0]}
                stock={part.stock}
                compatible={part.compatibleVehicles?.[0]}
                installationAvailable={part.installationAvailable}
              />
            </div>

            {/* Vendor info */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold">{part.vendorName}</p>
                  <p className="text-xs text-slate-400">{part.vendorCity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-[#FF4B19] text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <span className="font-bold text-sm">{part.vendorRating}</span>
                  <span className="text-xs text-slate-400">
                    ({part.vendorReviewCount})
                  </span>
                </div>
              </div>
              <button className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:border-[#FF4B19] hover:text-[#FF4B19] transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">chat</span>
                Chat with Seller
              </button>
            </div>
          </div>
        </div>

        {/* Compatible vehicles */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FF4B19]">
              directions_car
            </span>
            Compatible Vehicles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {part.compatibleVehicles.map((v) => (
              <div
                key={v}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl"
              >
                <span className="material-symbols-outlined text-green-500 text-sm">
                  check_circle
                </span>
                <span className="text-sm font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-black mb-4">Product Description</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {part.description}
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Condition", value: part.condition },
              part.warrantyMonths
                ? { label: "Warranty", value: `${part.warrantyMonths} months` }
                : null,
              part.oemNumber
                ? { label: "OEM Number", value: part.oemNumber }
                : null,
              part.partNumber
                ? { label: "Part Number", value: part.partNumber }
                : null,
            ]
              .filter(Boolean)
              .map((spec) => (
                <div
                  key={spec!.label}
                  className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4"
                >
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                    {spec!.label}
                  </p>
                  <p className="font-bold text-sm capitalize">{spec!.value}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
