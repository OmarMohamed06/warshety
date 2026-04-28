"use client";

import { useEffect, useState, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  getVendorReviews,
  replyToReview,
  type DbReview,
} from "@/services/reviewService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  MessageSquare,
  CheckCircle2,
  ThumbsUp,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Star display ──────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

// ── Rating distribution bar ───────────────────────────────────────────────────
function RatingBar({
  star,
  count,
  total,
}: {
  star: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2 text-right text-muted-foreground">{star}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

// ── Single review card ────────────────────────────────────────────────────────
function ReviewCard({
  review,
  vendorId,
  onReplySubmitted,
  t,
}: {
  review: DbReview;
  vendorId: string;
  onReplySubmitted: (id: string, reply: string) => void;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState(review.vendor_reply ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasReply = !!review.vendor_reply;

  async function handleSubmit() {
    if (!replyText.trim()) return;
    setSaving(true);
    setError("");
    const { error: err } = await replyToReview(
      review.id,
      vendorId,
      replyText.trim(),
    );
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      onReplySubmitted(review.id, replyText.trim());
      setEditing(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            {review.user?.avatar_url && (
              <AvatarImage src={review.user.avatar_url} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {(review.user?.full_name ?? "?")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-bold text-sm">
                {review.user?.full_name ?? t("vendor.reviewsAnonymous")}
              </p>
              <div className="flex items-center gap-2">
                <Stars rating={review.rating} />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {review.comment && (
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {review.comment}
              </p>
            )}
          </div>
        </div>

        {/* Reply section */}
        <div className="mt-4 ml-13">
          {hasReply && !editing ? (
            <div className="bg-muted/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("vendor.reviewsYourReply")}
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  {t("vendor.reviewsEdit")}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {review.vendor_reply}
              </p>
            </div>
          ) : editing || !hasReply ? (
            <div>
              {!expanded && !editing ? (
                <button
                  onClick={() => setExpanded(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t("vendor.reviewsReply")}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("vendor.reviewsReplyPlaceholder")}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={saving || !replyText.trim()}
                      className="gap-1.5"
                    >
                      {saving && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      {t("vendor.reviewsSubmitReply")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setExpanded(false);
                        setEditing(false);
                        setReplyText(review.vendor_reply ?? "");
                      }}
                    >
                      {t("vendor.reviewsCancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function VendorReviewsPage() {
  const { vendor } = useAuth();
  const { t } = useLanguage();

  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<number | null>(null); // star filter

  const load = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const data = await getVendorReviews(vendor.id);
    setReviews(data);
    setLoading(false);
  }, [vendor]);

  useEffect(() => {
    load();
  }, [load]);

  function handleReplySubmitted(id: string, reply: string) {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, vendor_reply: reply } : r)),
    );
  }

  // Stats
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const repliedCount = reviews.filter((r) => r.vendor_reply).length;

  const filtered = filter
    ? reviews.filter((r) => r.rating === filter)
    : reviews;

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {t("vendor.reviewsTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("vendor.reviewsSubtitle")}
          </p>
        </div>

        {/* Summary row */}
        {!loading && total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Average */}
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-3">
                  <Star className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-3xl font-black">{avg.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">
                    {total} {t("vendor.reviewsTotal")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Distribution */}
            <Card className="sm:col-span-1">
              <CardContent className="p-5 space-y-1.5">
                {dist.map(({ star, count }) => (
                  <RatingBar
                    key={star}
                    star={star}
                    count={count}
                    total={total}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Replied */}
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-green-100 dark:bg-green-900/30 p-3">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-black">{repliedCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("vendor.reviewsReplied")} / {total - repliedCount}{" "}
                    {t("vendor.reviewsPending")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter pills */}
        {!loading && total > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                filter === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary hover:text-primary"
              }`}
            >
              {t("vendor.reviewsAll")} ({total})
            </button>
            {[5, 4, 3, 2, 1].map((s) => {
              const c = dist.find((d) => d.star === s)?.count ?? 0;
              if (c === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(filter === s ? null : s)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    filter === s
                      ? "bg-amber-400 text-white border-amber-400"
                      : "border-border hover:border-amber-400 hover:text-amber-600"
                  }`}
                >
                  {s} <Star className="h-3 w-3 fill-current" /> ({c})
                </button>
              );
            })}
          </div>
        )}

        <Separator />

        {/* Reviews list */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-base">
              {total === 0
                ? t("vendor.reviewsEmpty")
                : t("vendor.reviewsNoMatch")}
            </p>
            <p className="text-sm mt-1">{t("vendor.reviewsEmptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                vendorId={vendor?.id ?? ""}
                onReplySubmitted={handleReplySubmitted}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
