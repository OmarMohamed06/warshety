export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import TrustBadges from "@/components/home/TrustBadges";
import HowItWorks from "@/components/home/HowItWorks";
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
      ? "خدمات السيارات في مصر | ورشتي"
      : "Car Services in Egypt | Warshety",
    description: isAr
      ? "اعثر على أفضل مراكز صيانة السيارات بالقرب منك في مصر. احجز صيانة بسهولة مع ورشتي."
      : "Find trusted car service centers near you in Egypt. Book maintenance and inspection with Warshety.",
    path: `/${lang}`,
    locale: isAr ? "ar" : "en",
  });
}

export default async function HomePage() {
  const supabase = await createClient();

  const centersResult = await supabase
    .from("vendors")
    .select(
      "id, business_name, city, rating, total_reviews, cover_image_url, supported_makes, completed_bookings",
    )
    .in("status", ["approved", "pending"])
    .eq("vendor_type", "service_center")
    .order("completed_bookings", { ascending: false })
    .limit(8);

  return (
    <div className="w-full overflow-x-hidden">
      <HeroSection />
      <TrustBadges />
      <HowItWorks />
      <BrowseServices />
      <FeaturedServiceCenters initialData={centersResult.data ?? undefined} />
    </div>
  );
}
