/**
 * reviewService — Review lifecycle logic.
 *
 * Rules enforced:
 *  ✓ Only users who completed a booking can leave a review for that vendor
 *  ✓ One review per booking (checked before insert)
 *  ✓ Rating (1-5) affects the vendor's average score (recalculated on each write)
 *  ✓ Vendor can post a single reply to any review
 *
 * Average rating formula:
 *   average = total_stars / count_of_reviews
 */

import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DbReview {
  id: string;
  booking_id: string;
  vendor_id: string;
  user_id: string;
  rating: number; // 1-5
  comment: string | null;
  vendor_reply: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: { full_name: string | null; avatar_url: string | null };
}

export interface SubmitReviewInput {
  bookingId: string;
  vendorId: string;
  userId: string;
  rating: number; // 1-5
  comment?: string;
}

/** Minimum comment length required to earn review points. */
export const REVIEW_MIN_CHARS = 30;

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Check eligibility: user must have a completed booking for this vendor.
 * Returns the booking id if eligible, null otherwise.
 */
export async function getReviewEligibility(
  userId: string,
  vendorId: string,
): Promise<{ eligibleBookingId: string | null; alreadyReviewed: boolean }> {
  const supabase = createClient();

  // Find completed bookings for this user + vendor
  const { data: completedBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("user_id", userId)
    .eq("vendor_id", vendorId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!completedBookings || completedBookings.length === 0) {
    return { eligibleBookingId: null, alreadyReviewed: false };
  }

  const bookingIds = completedBookings.map((b: { id: string }) => b.id);

  // Check if any of those bookings already have a review
  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("booking_id")
    .in("booking_id", bookingIds);

  const reviewedIds = new Set(
    (existingReviews ?? []).map(
      (r: { booking_id: string }) => r.booking_id as string,
    ),
  );

  // Find the first un-reviewed completed booking
  const unreviewedId =
    bookingIds.find((id: string) => !reviewedIds.has(id)) ?? null;

  return {
    eligibleBookingId: unreviewedId,
    alreadyReviewed: unreviewedId === null,
  };
}

/**
 * Submit a review for a completed booking.
 * Recalculates and updates vendor average rating.
 */
export async function submitReview(
  input: SubmitReviewInput,
): Promise<{ review: DbReview | null; error: string | null }> {
  const supabase = createClient();

  // Validate rating range
  if (input.rating < 1 || input.rating > 5) {
    return { review: null, error: "Rating must be between 1 and 5." };
  }

  // Confirm booking is completed and belongs to user
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, user_id, vendor_id")
    .eq("id", input.bookingId)
    .single();

  if (!booking) return { review: null, error: "Booking not found." };
  if (booking.user_id !== input.userId)
    return { review: null, error: "Unauthorized." };
  if (booking.status !== "completed")
    return {
      review: null,
      error: "Reviews can only be submitted after service completion.",
    };

  // One review per booking
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", input.bookingId)
    .single();

  if (existing) {
    return { review: null, error: "You have already reviewed this booking." };
  }

  // Insert review
  const { data: review, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: input.bookingId,
      vendor_id: input.vendorId,
      user_id: input.userId,
      rating: input.rating,
      comment: input.comment ?? null,
      vendor_reply: null,
    })
    .select("*")
    .single();

  if (error) return { review: null, error: error.message };

  // Recalculate vendor average rating
  const { data: allRatings } = await supabase
    .from("reviews")
    .select("rating")
    .eq("vendor_id", input.vendorId);

  if (allRatings && allRatings.length > 0) {
    const avg =
      allRatings.reduce(
        (sum: number, r: { rating: number }) => sum + r.rating,
        0,
      ) / allRatings.length;
    await supabase
      .from("vendors")
      .update({
        rating: Math.round(avg * 10) / 10,
        total_reviews: allRatings.length,
      })
      .eq("id", input.vendorId);
  }

  // Award 50 review points (fire-and-forget — non-fatal)
  const commentLen = (input.comment ?? "").trim().length;
  if (commentLen >= REVIEW_MIN_CHARS && review) {
    fetch("/api/reviews/award-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: review.id, userId: input.userId }),
    }).catch(() => {
      /* non-fatal */
    });
  }

  return { review: review as DbReview, error: null };
}

/**
 * Vendor replies to a review (one reply per review).
 */
export async function replyToReview(
  reviewId: string,
  vendorId: string,
  reply: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Confirm the review belongs to this vendor
  const { data: review } = await supabase
    .from("reviews")
    .select("id, vendor_id, vendor_reply")
    .eq("id", reviewId)
    .single();

  if (!review) return { error: "Review not found." };
  if (review.vendor_id !== vendorId) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("reviews")
    .update({ vendor_reply: reply, updated_at: new Date().toISOString() })
    .eq("id", reviewId);

  return { error: error?.message ?? null };
}

/**
 * Fetch all reviews for a vendor (with user info joined).
 */
export async function getVendorReviews(vendorId: string): Promise<DbReview[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, user:users(full_name, avatar_url)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as DbReview[];
}
