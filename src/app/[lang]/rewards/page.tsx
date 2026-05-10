export const dynamic = "force-dynamic";

import { Suspense } from "react";
import type { Metadata } from "next";
import RewardsDashboard from "@/components/garage/RewardsDashboard";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  return {
    title: isAr ? "مكافآتي | ورشتي" : "My Rewards | Warshety",
    description: isAr
      ? "اجمع نقاطك وافتح مكافآت حصرية لغسيل السيارة والتفصيل وقطع الغيار والمزيد"
      : "Earn points and unlock exclusive rewards for car wash, detailing, parts and more.",
  };
}

export default async function RewardsPage({ params }: Props) {
  const { lang } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <RewardsDashboard locale={lang as "en" | "ar"} />
    </Suspense>
  );
}
