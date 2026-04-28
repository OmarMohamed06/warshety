import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyCustomerCarReady } from "@/services/outboundNotificationService";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = (await req.json()) as { bookingId: string };
    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const supabase = getServiceClient();

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
    const phone = userRow?.phone;
    const email = userRow?.email;
    const customerName = userRow?.full_name;
    const centerName =
      (booking.vendor as { business_name?: string } | null)?.business_name ??
      "the service center";

    if (phone || email) {
      await notifyCustomerCarReady({
        userId: booking.user_id,
        phone: phone ?? undefined,
        email: email ?? undefined,
        customerName: customerName ?? undefined,
        centerName,
        bookingId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[bookings/notify-ready] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
