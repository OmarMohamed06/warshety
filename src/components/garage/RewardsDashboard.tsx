"use client";

/**
 * RewardsDashboard — Full rewards page.
 * Hero: animated gift box with car-themed floating items.
 * Body: points balance, vouchers count, rewards catalogue.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Ticket, ChevronRight, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { RewardCard } from "@/components/garage/RewardCard";
import { VoucherModal } from "@/components/garage/VoucherModal";
import { PointsHistoryModal } from "@/components/garage/PointsHistoryModal";
import { GiftBoxHero } from "@/components/garage/GiftBoxHero";
import {
  getRewards,
  getUserPoints,
  getUserVouchers,
  redeemReward,
} from "@/services/rewardsService";
import type { DbReward, DbUserReward } from "@/services/rewardsService";

interface RewardsDashboardProps {
  locale: "en" | "ar";
}

const CATEGORY_ORDER = [
  "all",
  "wash",
  "detailing",
  "protection",
  "inspection",
  "parts",
  "other",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  wash: "Car Wash",
  detailing: "Detailing",
  protection: "Protection",
  inspection: "Inspection",
  parts: "Parts",
  other: "Other",
};

export default function RewardsDashboard({ locale }: RewardsDashboardProps) {
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const { localePath } = useLanguage();
  const router = useRouter();

  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<DbReward[]>([]);
  const [vouchers, setVouchers] = useState<DbUserReward[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"catalogue" | "vouchers">(
    "catalogue",
  );

  const [activeVoucher, setActiveVoucher] = useState<DbUserReward | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isRTL = locale === "ar";

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [pts, { rewards: rws }, { vouchers: vcs }] = await Promise.all([
      getUserPoints(user.id),
      getRewards(),
      getUserVouchers(user.id),
    ]);
    setPoints(pts);
    setRewards(rws);
    setVouchers(vcs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(localePath("/auth/login?next=/rewards"));
    }
  }, [isLoading, isAuthenticated, router, localePath]);

  useEffect(() => {
    if (isAuthenticated && user) loadData();
  }, [isAuthenticated, user, loadData]);

  // ── Redeem handler ────────────────────────────────────────────────────────
  const handleRedeem = async (reward: DbReward) => {
    setRedeemError(null);
    const result = await redeemReward(user!.id, reward.id);
    if (result.success && result.userReward) {
      setActiveVoucher(result.userReward);
      await loadData();
    } else {
      setRedeemError(result.error ?? "Failed to redeem");
    }
  };

  // ── Filtered rewards ──────────────────────────────────────────────────────
  const filteredRewards =
    selectedCategory === "all"
      ? rewards
      : rewards.filter((r) => r.category === selectedCategory);

  const unusedVouchers = vouchers.filter((v) => !v.is_used);
  const usedVouchers = vouchers.filter((v) => v.is_used);

  if (isLoading || (!isAuthenticated && !isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden bg-[#FAF5EB] pb-6 pt-8">
        <div className="mx-auto max-w-lg px-5">
          {/* Text + gift box row — image in-flow so it never overlaps content below */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1 pt-4">
              <p className="text-sm text-muted-foreground">
                {locale === "ar" ? "أهلاً بك في" : "Welcome to your"}
              </p>
              <h1 className="text-3xl font-extrabold text-foreground">
                {locale === "ar"
                  ? `مكافآتك ${user?.full_name?.split(" ")[0] ?? ""}`
                  : `Rewards ${user?.full_name?.split(" ")[0] ?? ""}`}
              </h1>
            </div>
            <div className="w-32 shrink-0 sm:w-44">
              <GiftBoxHero />
            </div>
          </div>

          {/* Points & Vouchers stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* Points */}
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="12" r="10" opacity=".2" />
                  <text
                    x="12"
                    y="16"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="currentColor"
                  >
                    P
                  </text>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-foreground">
                  {loading ? "—" : points.toLocaleString()} pts
                </p>
                <p className="text-xs text-primary underline">
                  {locale === "ar" ? "عرض السجل" : "See history"}
                </p>
              </div>
            </button>

            {/* Vouchers */}
            <button
              onClick={() => setActiveTab("vouchers")}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                <Ticket size={20} />
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-foreground">
                  {loading ? "—" : unusedVouchers.length}{" "}
                  {locale === "ar" ? "قسائم" : "vouchers"}
                </p>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            </button>
          </div>

          {/* Error alert */}
          {redeemError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle size={14} />
              {redeemError}
            </div>
          )}
        </div>
        {/* end mx-auto max-w-lg */}
      </div>
      {/* end hero */}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background shadow-sm">
        <div className="mx-auto flex max-w-lg gap-0">
          {(["catalogue", "vouchers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "catalogue"
                ? locale === "ar"
                  ? "المكافآت"
                  : "Rewards"
                : locale === "ar"
                  ? "قسائمي"
                  : "My Vouchers"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Catalogue Tab ─────────────────────────────────────────────────── */}
      {activeTab === "catalogue" && (
        <div className="mx-auto max-w-lg px-5 py-5">
          {/* Category filter pills */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Section title */}
          {selectedCategory === "all" && (
            <h2 className="mb-3 text-base font-bold text-foreground">
              {locale === "ar" ? "عروض مختارة" : "Featured Rewards"}
            </h2>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : filteredRewards.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No rewards in this category yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  userPoints={points}
                  locale={locale}
                  onRedeem={handleRedeem}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Vouchers Tab ──────────────────────────────────────────────────── */}
      {activeTab === "vouchers" && (
        <div className="mx-auto max-w-lg space-y-4 px-5 py-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="py-16 text-center">
              <Ticket
                size={48}
                className="mx-auto mb-3 text-muted-foreground/40"
              />
              <p className="font-semibold text-foreground">No vouchers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Redeem rewards from the catalogue to get vouchers.
              </p>
              <Button
                className="mt-4"
                onClick={() => setActiveTab("catalogue")}
              >
                Browse Rewards
              </Button>
            </div>
          ) : (
            <>
              {unusedVouchers.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-bold text-foreground">
                    Active
                  </h3>
                  <div className="space-y-3">
                    {unusedVouchers.map((v) => (
                      <VoucherRow
                        key={v.id}
                        voucher={v}
                        onClick={() => setActiveVoucher(v)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {usedVouchers.length > 0 && (
                <div className="opacity-60">
                  <h3 className="mb-3 text-sm font-bold text-foreground">
                    Used
                  </h3>
                  <div className="space-y-3">
                    {usedVouchers.map((v) => (
                      <VoucherRow
                        key={v.id}
                        voucher={v}
                        onClick={() => setActiveVoucher(v)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <VoucherModal
        userReward={activeVoucher}
        onClose={() => setActiveVoucher(null)}
      />
      {showHistory && user && (
        <PointsHistoryModal
          userId={user.id}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

// ── Voucher Row ───────────────────────────────────────────────────────────────

function VoucherRow({
  voucher,
  onClick,
}: {
  voucher: DbUserReward;
  onClick: () => void;
}) {
  const reward = voucher.reward;
  const isService = !!voucher.qr_data;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
        <Ticket size={18} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">
          {reward?.title ?? "Reward"}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {voucher.code}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            voucher.is_used
              ? "bg-muted text-muted-foreground"
              : "bg-green-100 text-green-700"
          }`}
        >
          {voucher.is_used ? "Used" : isService ? "QR" : "Code"}
        </span>
        <ChevronRight size={14} className="text-muted-foreground" />
      </div>
    </button>
  );
}
