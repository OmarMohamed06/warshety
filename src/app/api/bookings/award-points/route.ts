import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/bookings/award-points
 *
 * Called when a vendor / branch-manager marks a booking as completed and
 * selects which service types were performed. Awards the combined points to
 * the customer and records an audit row in points_transactions.
 *
 * Body: { bookingId: string, serviceTypeIds: string[] }
 * Response: { ok: true, pointsAwarded: number }
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

    const { bookingId, serviceTypeIds } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    // No services selected → no points, succeed silently
    if (!serviceTypeIds || serviceTypeIds.length === 0) {
      return NextResponse.json({ ok: true, pointsAwarded: 0 });
    }

    const supabase = getServiceClient();

    // Fetch the booking to get the customer user_id
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, user_id, status")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Prevent double-awarding: check if a points_transaction already exists for this booking
    const { data: existing } = await supabase
      .from("points_transactions")
      .select("id")
      .eq("reference_id", bookingId)
      .eq("type", "booking_reward")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        pointsAwarded: 0,
        alreadyAwarded: true,
      });
    }

    // Fetch points for the selected service types
    const { data: serviceTypes, error: svcErr } = await supabase
      .from("service_type_points")
      .select("id, points")
      .in("id", serviceTypeIds)
      .eq("is_active", true);

    if (svcErr) {
      return NextResponse.json({ error: svcErr.message }, { status: 500 });
    }

    const totalPoints = (serviceTypes ?? []).reduce(
      (sum, s) => sum + (s.points ?? 0),
      0,
    );

    if (totalPoints <= 0) {
      return NextResponse.json({ ok: true, pointsAwarded: 0 });
    }

    // Atomically increment the customer's points balance
    const { error: rpcErr } = await supabase.rpc("increment_user_points", {
      p_user_id: booking.user_id,
      p_points: totalPoints,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    // Insert audit row
    const { error: txnErr } = await supabase
      .from("points_transactions")
      .insert({
        user_id: booking.user_id,
        points: totalPoints,
        type: "booking_reward",
        reference_id: bookingId,
        note: `Points awarded for completed booking (${serviceTypeIds.length} service${serviceTypeIds.length !== 1 ? "s" : ""} performed)`,
      });

    if (txnErr) {
      return NextResponse.json({ error: txnErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pointsAwarded: totalPoints });
  } catch (err) {
    console.error("[award-points]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
