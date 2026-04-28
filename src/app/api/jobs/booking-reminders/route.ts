/**
 * POST /api/jobs/booking-reminders
 *
 * Finds all bookings scheduled within the next 2 hours that haven't had
 * a reminder sent yet, then fires an SMS to each customer.
 *
 * Secure with CRON_SECRET:
 *   curl -X POST /api/jobs/booking-reminders \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 *
 * Add to vercel.json (or your cron service):
 *   { "path": "/api/jobs/booking-reminders", "schedule": "0 * * * *" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyCustomerBookingReminder } from "@/services/outboundNotificationService";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const now = new Date();
    // Target bookings happening in the next 1.5–2.5 hours
    const windowDateStart = new Date(now.getTime() + 90 * 60 * 1000);
    const windowDateEnd = new Date(now.getTime() + 150 * 60 * 1000);
    const windowDateStr = windowDateStart.toISOString().split("T")[0]; // YYYY-MM-DD

    // Fetch confirmed bookings on the target date
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `id, booking_date, booking_time, user_id, user:users!inner(phone, email, full_name), vendor:vendors!inner(business_name)`,
      )
      .eq("status", "confirmed")
      .eq("booking_date", windowDateStr);

    if (error) throw error;

    let sent = 0;
    for (const booking of bookings ?? []) {
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
      if (!phone && !email) continue;

      // Filter by time window
      const bookingDateTime = new Date(
        `${booking.booking_date}T${booking.booking_time}`,
      );
      if (bookingDateTime < windowDateStart || bookingDateTime > windowDateEnd)
        continue;

      await notifyCustomerBookingReminder({
        userId: booking.user_id,
        phone: phone ?? undefined,
        email: email ?? undefined,
        customerName: customerName ?? undefined,
        centerName,
        time: booking.booking_time,
        bookingId: booking.id,
      });
      sent++;
    }

    return NextResponse.json({ ok: true, remindersSent: sent });
  } catch (err) {
    console.error("[booking-reminders job]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
