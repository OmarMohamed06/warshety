"use client";

/**
 * RewardCard — Displays a single reward in the catalogue marketplace.
 * Inspired by Talabat-style voucher cards.
 */

import { useState } from "react";
import Image from "next/image";
import { Gift, Zap, Wrench, ShieldCheck, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DbReward } from "@/services/rewardsService";

interface RewardCardProps {
  reward: DbReward;
  userPoints: number;
  locale?: "en" | "ar";
  onRedeem: (reward: DbReward) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  wash: Zap,
  detailing: ShieldCheck,
  protection: ShieldCheck,
  inspection: Search,
  parts: Package,
  other: Gift,
};

const CATEGORY_COLORS: Record<string, string> = {
  wash: "from-blue-500 to-cyan-400",
  detailing: "from-purple-600 to-fuchsia-500",
  protection: "from-emerald-600 to-teal-400",
  inspection: "from-amber-500 to-orange-400",
  parts: "from-orange-600 to-red-500",
  other: "from-gray-600 to-slate-500",
};

function ValueBadge({ reward }: { reward: DbReward }) {
  if (!reward.value) return null;
  const text =
    reward.value_type === "percent"
      ? `${reward.value}% OFF`
      : `EGP ${reward.value} OFF`;
  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white shadow">
      <Gift size={11} />
      {text}
    </div>
  );
}

export function RewardCard({
  reward,
  userPoints,
  locale = "en",
  onRedeem,
}: RewardCardProps) {
  const [loading, setLoading] = useState(false);
  const canAfford = userPoints >= reward.points_required;
  const Icon = CATEGORY_ICONS[reward.category] ?? Gift;
  const gradient = CATEGORY_COLORS[reward.category] ?? CATEGORY_COLORS.other;
  const title =
    locale === "ar" && reward.title_ar ? reward.title_ar : reward.title;
  const description =
    locale === "ar" && reward.description_ar
      ? reward.description_ar
      : reward.description;

  const handleRedeem = async () => {
    setLoading(true);
    await onRedeem(reward);
    setLoading(false);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md",
        !canAfford && "opacity-80",
      )}
    >
      {/* Image / Gradient Header */}
      <div className={cn("relative h-36 w-full bg-gradient-to-br", gradient)}>
        {reward.image_url ? (
          <Image
            src={reward.image_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon size={52} className="text-white/60" strokeWidth={1.2} />
          </div>
        )}
        <ValueBadge reward={reward} />
        {!canAfford && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              Need more points
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
          {title}
        </p>
        {description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="flex items-center gap-1 text-sm font-bold text-primary">
            <Wrench size={13} />
            {reward.points_required.toLocaleString()} pts
          </span>
          <Button
            size="sm"
            disabled={!canAfford || loading}
            onClick={handleRedeem}
            className="h-7 text-xs"
          >
            {loading ? "…" : "Redeem"}
          </Button>
        </div>
      </div>
    </div>
  );
}
