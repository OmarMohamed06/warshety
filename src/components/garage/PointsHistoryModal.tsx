"use client";

/**
 * PointsHistoryModal — Full audit trail of points transactions.
 * Matches the "See history" button in the Talabat-style UI.
 */

import { useEffect, useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPointsHistory } from "@/services/rewardsService";
import type { DbPointsTransaction } from "@/services/rewardsService";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/error-state";

interface PointsHistoryModalProps {
  userId: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<DbPointsTransaction["type"], string> = {
  booking_reward: "Booking Reward",
  redeem_service: "Redeemed — Service",
  redeem_parts: "Redeemed — Parts",
  admin_adjustment: "Admin Adjustment",
};

export function PointsHistoryModal({
  userId,
  onClose,
}: PointsHistoryModalProps) {
  const [transactions, setTransactions] = useState<DbPointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPointsHistory(userId).then(({ transactions: txns }) => {
      setTransactions(txns);
      setLoading(false);
    });
  }, [userId]);

  // Escape to dismiss, and freeze the page behind the sheet — without this the
  // background scrolls under the overlay, which reads as broken.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Points history"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:p-6"
    >
      <div className="relative flex max-h-[calc(100dvh-3rem)] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl shadow-slate-950/25 ring-1 ring-slate-900/5 duration-200 animate-in fade-in-0 slide-in-from-bottom-8 sm:max-h-[calc(100dvh-4rem)] sm:rounded-2xl sm:slide-in-from-bottom-0 sm:zoom-in-95 dark:ring-white/10">
        {/* Header — 20/24px rhythm shared with Dialog */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-lg leading-snug font-semibold tracking-tight text-foreground">
            Points History
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-me-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading && <SkeletonList rows={4} className="p-4" />}
          {!loading && transactions.length === 0 && (
            <EmptyState
              icon="history"
              title="No points yet"
              description="Your points from bookings and redemptions will show up here."
            />
          )}
          {transactions.map((txn) => {
            const isEarned = txn.points > 0;
            return (
              <div
                key={txn.id}
                className="flex items-center gap-3.5 border-b border-border/50 px-5 py-3.5 last:border-0 sm:px-6"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isEarned
                      ? "bg-green-100 text-green-600"
                      : "bg-orange-100 text-orange-600",
                  )}
                >
                  {isEarned ? (
                    <TrendingUp size={16} />
                  ) : (
                    <TrendingDown size={16} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {TYPE_LABELS[txn.type]}
                  </p>
                  {txn.note && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {txn.note}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground/80 tabular-nums">
                    {new Date(txn.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-bold tabular-nums",
                    isEarned ? "text-green-600" : "text-orange-600",
                  )}
                >
                  {isEarned ? "+" : ""}
                  {txn.points} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
