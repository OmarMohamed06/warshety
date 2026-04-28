import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import VehicleConfigurator from "@/components/home/VehicleConfigurator";
import FeaturedParts from "@/components/home/FeaturedParts";
import CategoriesGrid from "@/components/home/CategoriesGrid";
import BrowseServices from "@/components/home/BrowseServices";
import FeaturedServiceCenters from "@/components/home/FeaturedServiceCenters";
import { generateSeoMeta } from "@/utils/seo";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  return generateSeoMeta({
    title: isAr
      ? "خدمات السيارات وقطع الغيار في مصر | ورشتي"
      : "Car Services & Spare Parts in Egypt | Warshety",
    description: isAr
      ? "اعثر على أفضل مراكز صيانة السيارات وقطع الغيار بالقرب منك في مصر. احجز صيانة أو اشترِ قطع بسهولة مع ورشتي."
      : "Find trusted car service centers and spare parts near you in Egypt. Book maintenance, inspection, and buy parts بسهولة with Warshety.",
    path: `/${lang}`,
    locale: isAr ? "ar" : "en",
  });
}

export default async function HomePage() {
  const supabase = await createClient();

  const [partsResult, centersResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, brand, category, subcategory, price, original_price, image_url, vendor_id",
      )
      .eq("active", true)
      .gt("stock", 0)
      .limit(50),
    supabase
      .from("vendors")
      .select(
        "id, business_name, city, rating, total_reviews, cover_image_url, supported_makes, completed_bookings",
      )
      .in("status", ["approved", "pending"])
      .eq("vendor_type", "service_center")
      .order("completed_bookings", { ascending: false })
      .limit(8),
  ]);

  // Sort parts by total sold via order_items
  const orderItemsResult = await supabase
    .from("order_items")
    .select("product_id, quantity");
  const soldMap: Record<string, number> = {};
  for (const item of (orderItemsResult.data ?? []) as {
    product_id: string;
    quantity: number;
  }[]) {
    if (item.product_id)
      soldMap[item.product_id] =
        (soldMap[item.product_id] ?? 0) + (item.quantity ?? 1);
  }
  const sortedParts = (
    (partsResult.data ??
      []) as import("@/components/home/FeaturedParts").RawProduct[]
  )
    .map((p) => ({ ...p, sold_count: soldMap[p.id] ?? 0 }))
    .sort((a, b) => b.sold_count - a.sold_count)
    .slice(0, 8);

  return (
    <div className="w-full overflow-x-hidden">
      <HeroSection />
      <FeaturedParts initialData={sortedParts} />
      <CategoriesGrid />
      <BrowseServices />
      <FeaturedServiceCenters initialData={centersResult.data ?? undefined} />
    </div>
  );
}
