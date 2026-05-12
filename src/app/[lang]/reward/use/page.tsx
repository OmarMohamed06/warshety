export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import RewardUsePage from "@/components/garage/RewardUsePage";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title:
      lang === "ar"
        ? "استخدام المكافأة | ورشتي"
        : "Reward Validation | Warshety",
    robots: { index: false },
  };
}

export default async function RewardUseRoute({ searchParams }: Props) {
  const { code } = await searchParams;
  return <RewardUsePage initialCode={code} />;
}
