export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import RewardUsePage from "@/components/garage/RewardUsePage";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export const metadata: Metadata = {
  title: "Reward Validation | Warshety",
};

export default async function RewardUseRoute({ searchParams }: Props) {
  const { code } = await searchParams;
  return <RewardUsePage initialCode={code} />;
}
