import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import VehicleConfigurator from "@/components/home/VehicleConfigurator";
import FeaturedParts from "@/components/home/FeaturedParts";
import CategoriesGrid from "@/components/home/CategoriesGrid";
import FeaturedServiceCenters from "@/components/home/FeaturedServiceCenters";
import OffersSection from "@/components/home/OffersSection";

export const metadata: Metadata = {
  title: "Garage Egypt — Premium Car Parts & Expert Services",
  description:
    "Egypt's #1 automotive marketplace. Buy compatible spare parts, book trusted service centers. قطع غيار سيارات ومراكز خدمة موثوقة في مصر.",
};

export default function HomePage() {
  return (
    <div className="w-full overflow-x-hidden">
      <HeroSection />
      <VehicleConfigurator />
      <FeaturedParts />
      <CategoriesGrid />
      <FeaturedServiceCenters />
      <OffersSection />
    </div>
  );
}
