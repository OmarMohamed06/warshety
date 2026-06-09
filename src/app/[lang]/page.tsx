export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import TrustBadges from "@/components/home/TrustBadges";
import HowItWorks from "@/components/home/HowItWorks";
import BrowseServices from "@/components/home/BrowseServices";
import FeaturedServiceCenters from "@/components/home/FeaturedServiceCenters";
import { generateSeoMeta } from "@/utils/seo";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/utils";

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

  const centersQuery = supabase
    .from("vendors")
    .select(
      "id, business_name, business_name_ar, city, rating, total_reviews, cover_image_url, supported_makes, completed_bookings",
    )
    .in("status", ["approved", "pending"])
    .eq("vendor_type", "service_center")
    .order("completed_bookings", { ascending: false })
    .limit(8);

  // Wrap in a timeout: if the DB is slow/cold, render the page shell instantly
  // with `data: null`. FeaturedServiceCenters then falls back to a client-side
  // fetch (it only skips client fetch when `initialData` is a defined array),
  // so the homepage never hangs waiting on this query.
  const centersResult = await withTimeout(centersQuery, 2500, {
    data: null,
  } as Awaited<typeof centersQuery>);

  return (
    <div className="w-full overflow-x-hidden">
      <HeroSection />
      <TrustBadges />
      <BrowseServices />
      <FeaturedServiceCenters initialData={centersResult.data ?? undefined} />
      <HowItWorks />
    </div>
  );
}
