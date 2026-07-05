import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/bookings/award-points
 *
 * Called when a vendor marks a booking as completed and selects which service
 * types were performed. Awards:
 *   1. Service points  — sum of selected service_type_points rows
 *   2. First-booking bonus (+300) — once per customer's lifetime
 *   3. Referral reward — referrer +500, friend +250, on friend's first booking
 *
 * Body:   { bookingId: string; serviceTypeIds?: string[] }
 * Returns { ok: true; servicePoints: number; firstBookingBonus: number; referral: object }
 */

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
      bookingId?: string;
      serviceTypeIds?: string[];
    };

    const { bookingId, serviceTypeIds = [] } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch booking to get user_id
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, user_id, status")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // ── 1. Service-type points ────────────────────────────────────────────────
    let servicePoints = 0;

    // Guard: prevent double-awarding booking_reward for the same booking
    const { data: existingTxn } = await supabase
      .from("points_transactions")
      .select("id")
      .eq("reference_id", bookingId)
      .eq("type", "booking_reward")
      .maybeSingle();

    if (!existingTxn && serviceTypeIds.length > 0) {
      const { data: serviceRows } = await supabase
        .from("service_type_points")
        .select("id, points")
        .in("id", serviceTypeIds)
        .eq("is_active", true);

      servicePoints = (serviceRows ?? []).reduce(
        (sum: number, s: { points?: number }) => sum + (s.points ?? 0),
        0,
      );

      if (servicePoints > 0) {
        const { error: rpcErr } = await supabase.rpc("increment_user_points", {
          p_user_id: booking.user_id,
          p_points: servicePoints,
        });
        if (rpcErr) {
          console.error("[award-points] increment_user_points:", rpcErr);
        } else {
          await supabase.from("points_transactions").insert({
            user_id: booking.user_id,
            points: servicePoints,
            type: "booking_reward",
            reference_id: bookingId,
            note: `Service points for completed booking (${serviceTypeIds.length} service${serviceTypeIds.length !== 1 ? "s" : ""})`,
          });
        }
      }
    }

    // ── 2. First-booking bonus (+300) ─────────────────────────────────────────
    let firstBookingBonus = 0;
    const { data: bonusResult, error: bonusErr } = await supabase.rpc(
      "award_first_booking_bonus",
      { p_user_id: booking.user_id, p_booking_id: bookingId },
    );
    if (!bonusErr && typeof bonusResult === "number") {
      firstBookingBonus = bonusResult;
    } else if (bonusErr) {
      console.error("[award-points] award_first_booking_bonus:", bonusErr);
    }

    // ── 3. Referral reward (referrer +500, friend +250) ───────────────────────
    let referralResult: Record<string, unknown> = { awarded: false };
    const { data: refData, error: refErr } = await supabase.rpc(
      "process_referral_reward",
      { p_referee_id: booking.user_id, p_booking_id: bookingId },
    );
    if (!refErr && refData) {
      referralResult = refData as Record<string, unknown>;
    } else if (refErr) {
      console.error("[award-points] process_referral_reward:", refErr);
    }

    return NextResponse.json({
      ok: true,
      servicePoints,
      firstBookingBonus,
      referral: referralResult,
    });
  } catch (err) {
    console.error("[award-points]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
