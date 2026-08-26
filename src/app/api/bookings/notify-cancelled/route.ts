import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  notifyCustomerBookingCancelled,
  notifyVendorBookingCancelledByCustomer,
  resolveBookingRecipient,
} from "@/services/outboundNotificationService";
import { createInAppNotification } from "@/services/inAppNotificationService";

/**
 * POST /api/bookings/notify-cancelled
 *
 * Called after a customer cancels their own booking (mobile has no
 * server-action support, so this REST route mirrors what
 * notifyCustomerCancelledBookingAction does for the web app):
 *  - confirms the cancellation to the customer (in-app + SMS/email)
 *  - alerts the vendor / branch manager so they can free the slot
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
    const { bookingId, reason } = (await req.json()) as {
      bookingId?: string;
      reason?: string;
    };
    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: booking } = await supabase
      .from("bookings")
      .select(
        `id, user_id, booking_date, booking_time, booking_type, service_key, vendor_id, branch_id,
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";

    // 1. Confirm cancellation to the customer — in-app + SMS/email.
    await createInAppNotification({
      userId: booking.user_id,
      type: "booking_cancelled",
      title: "Booking Cancelled",
      body: reason
        ? `Your booking at ${centerName} was cancelled: ${reason}`
        : `Your booking at ${centerName} has been cancelled.`,
      link: `${appUrl}/en/bookings/${bookingId}`,
    });

    if (userRow?.phone || userRow?.email) {
      await notifyCustomerBookingCancelled({
        userId: booking.user_id,
        phone: userRow?.phone ?? undefined,
        email: userRow?.email ?? undefined,
        customerName: userRow?.full_name ?? undefined,
        centerName,
        reason,
        bookingId,
      }).catch((e) =>
        console.error("[notify-cancelled] customer notification error:", e),
      );
    }

    // 2. Alert the vendor / branch manager so they can free the slot.
    const recipient = await resolveBookingRecipient(
      booking.branch_id,
      booking.vendor_id,
    );
    if (recipient.email) {
      const service = booking.service_key
        ? (booking.service_key as string)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
        : (booking.booking_type as string)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
      const dateTime = `${booking.booking_date} at ${(booking.booking_time as string) ?? ""}`;

      await notifyVendorBookingCancelledByCustomer({
        vendorUserId: recipient.userId ?? undefined,
        vendorPhone: recipient.phone ?? undefined,
        vendorEmail: recipient.email,
        customerName: userRow?.full_name ?? undefined,
        service,
        dateTime,
        bookingId,
        dashboardLink: `${appUrl}/en/vendor/bookings`,
      }).catch((e) =>
        console.error("[notify-cancelled] vendor notification error:", e),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify-cancelled] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
