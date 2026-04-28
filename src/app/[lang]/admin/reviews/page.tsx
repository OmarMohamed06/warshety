"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  created_at: string;
  flagged?: boolean;
  users: { full_name: string | null; email: string } | null;
  vendors: { business_name: string } | null;
}

const PAGE_SIZE = 20;

export default function ReviewsPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("reviews")
      .select(
        "id, rating, comment, vendor_reply, created_at, users(full_name, email), vendors(business_name)",
        { count: "exact" },
      );

    if (ratingFilter !== "all") q = q.eq("rating", Number(ratingFilter));
    q = q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await q;
    setReviews((data ?? []) as unknown as Review[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [supabase, ratingFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteReview(id: string) {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    setMsg(error ? `Error: ${error.message}` : "Review deleted.");
    setTimeout(() => setMsg(null), 3000);
    load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">{t("admin.reviewsTitle")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total.toLocaleString()} {t("admin.totalReviews")}
          </p>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 rounded-xl text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Rating filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-500">
          {t("admin.filterByRating")}
        </span>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
          <button
            onClick={() => {
              setRatingFilter("all");
              setPage(0);
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
              ratingFilter === "all"
                ? "bg-[#FF4B19] text-white"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            {t("admin.allFilter")}
          </button>
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              onClick={() => {
                setRatingFilter(String(r));
                setPage(0);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1",
                ratingFilter === String(r)
                  ? "bg-[#FF4B19] text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
            >
              {r}
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 12 }}
              >
                star
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reviews grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span
            className="material-symbols-outlined animate-spin text-slate-400"
            style={{ fontSize: 36 }}
          >
            progress_activity
          </span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span
            className="material-symbols-outlined block mx-auto mb-2"
            style={{ fontSize: 40 }}
          >
            star_border
          </span>
          <p className="text-sm">{t("admin.noReviews")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "material-symbols-outlined",
                            i < r.rating
                              ? "text-amber-400"
                              : "text-slate-200 dark:text-slate-700",
                          )}
                          style={{ fontSize: 16 }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-sm font-black">
                      {r.users?.full_name ?? "Customer"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {r.users?.email ?? ""}
                    </span>
                    <span className="text-xs text-slate-400">→</span>
                    <span className="text-sm font-bold text-[#FF4B19]">
                      {r.vendors?.business_name ?? "—"}
                    </span>
                  </div>

                  {r.comment && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                      {r.comment}
                    </p>
                  )}

                  {r.vendor_reply && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mt-2">
                      <p className="text-xs font-bold text-slate-500 mb-1">
                        {t("admin.vendorReply")}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {r.vendor_reply}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(r.created_at).toLocaleDateString("en-EG", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg",
                      r.rating >= 4
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : r.rating === 3
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    )}
                  >
                    {r.rating}
                  </div>
                  <button
                    onClick={() => deleteReview(r.id)}
                    className="p-2 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 transition-colors"
                    title="Delete review"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      delete
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              ← {t("admin.prev")}
            </button>
            <span className="text-xs text-slate-500">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              {t("admin.next")} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
