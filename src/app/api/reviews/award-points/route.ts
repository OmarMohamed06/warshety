import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/reviews/award-points
 *
 * Awards 50 loyalty points for submitting a verified review.
 *
 * Rules enforced here (in addition to the DB function):
 *  - Review must exist and belong to the requesting user
 *  - Review comment must meet the minimum character requirement
 *  - Points are awarded at most once per review (idempotent via DB flag)
 *
 * Body:   { reviewId: string; userId: string }
 * Returns { ok: true; pointsAwarded: number }
 */

const MIN_REVIEW_CHARS = 30;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      reviewId?: string;
      userId?: string;
    };

    const { reviewId, userId } = body;

    if (!reviewId || !userId) {
      return NextResponse.json(
        { error: "Missing reviewId or userId" },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    // Fetch review and validate min chars
    const { data: review, error: reviewErr } = await supabase
      .from("reviews")
      .select("id, user_id, comment, points_rewarded")
      .eq("id", reviewId)
      .single();

    if (reviewErr || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const commentLength = (review.comment ?? "").trim().length;
    if (commentLength < MIN_REVIEW_CHARS) {
      return NextResponse.json(
        {
          error: `Review must be at least ${MIN_REVIEW_CHARS} characters to earn points.`,
          pointsAwarded: 0,
        },
        { status: 422 },
      );
    }

    // Delegate to the DB function which handles idempotency and balance update
    const { data: result, error: rpcErr } = await supabase.rpc(
      "award_review_points",
      { p_review_id: reviewId, p_user_id: userId },
    );

    if (rpcErr) {
      console.error("[reviews/award-points] RPC error:", rpcErr);
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    // result: 50 = awarded, 0 = already rewarded, -1 = not found, -2 = unauthorized
    if (typeof result !== "number" || result < 0) {
      return NextResponse.json({ ok: true, pointsAwarded: 0 });
    }

    return NextResponse.json({ ok: true, pointsAwarded: result });
  } catch (err) {
    console.error("[reviews/award-points]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
