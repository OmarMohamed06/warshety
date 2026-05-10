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

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
    >
      <div className="relative flex w-full max-w-sm flex-col rounded-t-3xl bg-card shadow-2xl sm:max-h-[80vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-bold text-foreground">Points History</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {!loading && transactions.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No transactions yet.
            </div>
          )}
          {transactions.map((txn) => {
            const isEarned = txn.points > 0;
            return (
              <div
                key={txn.id}
                className="flex items-center gap-3 border-b border-border/50 px-5 py-3 last:border-0"
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
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {TYPE_LABELS[txn.type]}
                  </p>
                  {txn.note && (
                    <p className="text-xs text-muted-foreground">{txn.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(txn.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold",
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
