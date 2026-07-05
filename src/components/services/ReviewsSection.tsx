"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  getReviewEligibility,
  submitReview,
  REVIEW_MIN_CHARS,
  type DbReview,
} from "@/services/reviewService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  MessageSquare,
  CheckCircle2,
  Loader2,
  PenLine,
  ChevronDown,
  Gift,
} from "lucide-react";

// ── Star display ──────────────────────────────────────────────────────────────
function Stars({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
        />
      ))}
    </div>
  );
}

// ── Interactive star picker ───────────────────────────────────────────────────
function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              i <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/25"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Rating bar row ────────────────────────────────────────────────────────────
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
      <span className="w-2 text-muted-foreground shrink-0">{star}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-5 text-right text-xs text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

// ── Single review card ────────────────────────────────────────────────────────
function ReviewCard({
  review,
  t,
}: {
  review: DbReview;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasReply = !!review.vendor_reply;
  const date = new Date(review.created_at).toLocaleDateString();

  return (
    <div className="py-5 first:pt-0">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          {review.user?.avatar_url && (
            <AvatarImage src={review.user.avatar_url} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {(review.user?.full_name ?? "?")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <p className="font-bold text-sm">
              {review.user?.full_name ?? t("servicePage.reviewAnonymous")}
            </p>
            <div className="flex items-center gap-2">
              <Stars rating={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>
          </div>
          {review.comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {review.comment}
            </p>
          )}

          {/* Vendor reply */}
          {hasReply && (
            <div className="mt-3 bg-muted/60 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("servicePage.reviewVendorReply")}
              </div>
              <p className="text-sm text-muted-foreground">
                {review.vendor_reply}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Write review form ─────────────────────────────────────────────────────────
function WriteReviewForm({
  vendorId,
  onSubmitted,
  t,
}: {
  vendorId: string;
  onSubmitted: (review: DbReview) => void;
  t: (k: string) => string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [eligible, setEligible] = useState<string | null>(null); // bookingId
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  async function handleOpen() {
    if (!user) return;
    setChecking(true);
    const { eligibleBookingId, alreadyReviewed: already } =
      await getReviewEligibility(user.id, vendorId);
    setChecking(false);
    setAlreadyReviewed(already);
    setEligible(eligibleBookingId);
    setOpen(true);
  }

  async function handleSubmit() {
    if (!user || !eligible || rating === 0) return;
    setSaving(true);
    setError("");
    const { review, error: err } = await submitReview({
      bookingId: eligible,
      vendorId,
      userId: user.id,
      rating,
      comment: comment.trim() || undefined,
    });
    setSaving(false);
    if (err || !review) {
      setError(err ?? "Failed to submit review.");
    } else {
      // Try to get the points awarded (non-blocking; already fired in reviewService)
      const commentLen = comment.trim().length;
      if (commentLen >= REVIEW_MIN_CHARS) {
        setPointsEarned(50);
      }
      setDone(true);
      onSubmitted({
        ...review,
        user: { full_name: user.email ?? null, avatar_url: null },
      });
    }
  }

  const commentLen = comment.trim().length;
  const willEarnPoints = commentLen >= REVIEW_MIN_CHARS;

  if (!user) return null;

  return (
    <div className="pt-2">
      {!open ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleOpen}
          disabled={checking}
        >
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PenLine className="h-4 w-4" />
          )}
          {t("servicePage.reviewWrite")}
        </Button>
      ) : alreadyReviewed ? (
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {t("servicePage.reviewAlreadyLeft")}
        </div>
      ) : eligible === null ? (
        <p className="text-sm text-muted-foreground">
          {t("servicePage.reviewNotEligible")}
        </p>
      ) : done ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {t("servicePage.reviewSubmitted")}
          </div>
          {pointsEarned > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
              <Gift className="h-4 w-4" />+{pointsEarned} points earned!
            </div>
          )}
        </div>
      ) : (
        <div className="bg-muted/40 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold">
            {t("servicePage.reviewYourRating")}
          </p>
          <StarPicker value={rating} onChange={setRating} />
          <div className="space-y-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("servicePage.reviewCommentPlaceholder")}
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between px-0.5">
              <p
                className={`text-xs ${willEarnPoints ? "text-green-600 font-medium" : "text-muted-foreground"}`}
              >
                {willEarnPoints ? (
                  <span className="flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    Write {REVIEW_MIN_CHARS}+ chars to earn 50 pts
                  </span>
                ) : (
                  `${commentLen}/${REVIEW_MIN_CHARS} chars for +50 points`
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {commentLen} chars
              </p>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saving || rating === 0}
              className="gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("servicePage.reviewSubmit")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {t("servicePage.reviewCancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main exported section ─────────────────────────────────────────────────────
interface Props {
  vendorId: string;
  initialReviews: DbReview[];
}

export default function ReviewsSection({ vendorId, initialReviews }: Props) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<DbReview[]>(initialReviews);

  // stats
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  function handleNewReview(review: DbReview) {
    setReviews((prev) => [review, ...prev]);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            {t("servicePage.reviewsTitle")}
            {total > 0 ? (
              <Badge variant="secondary" className="font-bold">
                {avg.toFixed(1)}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
              >
                {t("services.newCenter")}
              </Badge>
            )}
          </CardTitle>
          {isAuthenticated && (
            <WriteReviewForm
              vendorId={vendorId}
              onSubmitted={handleNewReview}
              t={t}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-0">
        {/* Rating summary */}
        {total > 0 && (
          <>
            <div className="flex items-start gap-6 mb-5 p-4 bg-muted/40 rounded-xl">
              <div className="text-center">
                <p className="text-4xl font-black">{avg.toFixed(1)}</p>
                <Stars rating={Math.round(avg)} />
                <p className="text-xs text-muted-foreground mt-1">
                  {total} {t("servicePage.reviewsCount")}
                </p>
              </div>
              <div className="flex-1 space-y-1.5 pt-1">
                {dist.map(({ star, count }) => (
                  <RatingBar
                    key={star}
                    star={star}
                    count={count}
                    total={total}
                  />
                ))}
              </div>
            </div>
            <Separator className="mb-1" />
          </>
        )}

        {/* Review list */}
        {total === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="font-semibold text-sm">
              {t("servicePage.reviewsEmpty")}
            </p>
            <p className="text-xs mt-1">{t("servicePage.reviewsEmptyHint")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} t={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
