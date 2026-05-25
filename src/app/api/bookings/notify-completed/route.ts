import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyCustomerBookingCompleted } from "@/services/outboundNotificationService";

/**
 * POST /api/bookings/notify-completed
 *
 * Called from the vendor bookings page when status is set to 'completed'.
 * Fetches the points awarded by the DB trigger and sends a combined
 * "booking completed + points earned" notification to the customer.
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
    const { bookingId } = (await req.json()) as { bookingId?: string };
    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch booking with customer + vendor details
    const { data: booking } = await supabase
      .from("bookings")
      .select(
        `id, user_id,
         user:users!inner(phone, email, full_name),
         vendor:vendors!inner(business_name)`,
      )
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const userRow = booking.user as {
      phone?: string;
      email?: string;
      full_name?: string;
    } | null;
    const centerName =
      (booking.vendor as { business_name?: string } | null)?.business_name ??
      "the service center";

    if (!userRow?.phone && !userRow?.email) {
      return NextResponse.json({ ok: true, skipped: "no contact info" });
    }

    // Read the points awarded by the DB trigger for this booking
    // Small delay to let the DB trigger commit before we query
    await new Promise((r) => setTimeout(r, 800));
    const { data: txn } = await supabase
      .from("points_transactions")
      .select("points")
      .eq("reference_id", bookingId)
      .eq("type", "booking_reward")
      .maybeSingle();

    const pointsEarned = (txn as { points?: number } | null)?.points ?? 0;

    await notifyCustomerBookingCompleted({
      userId: booking.user_id,
      phone: userRow?.phone ?? undefined,
      email: userRow?.email ?? undefined,
      customerName: userRow?.full_name ?? undefined,
      centerName,
      bookingId,
      pointsEarned: pointsEarned > 0 ? pointsEarned : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[bookings/notify-completed] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
