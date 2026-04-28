import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  notifyCustomerBookingConfirmed,
  notifyVendorNewBooking,
  resolveBookingRecipient,
} from "@/services/outboundNotificationService";

/**
 * POST /api/bookings/notify
 * Called after a booking is created client-side.
 * Fetches full booking + user + vendor details and fires emails/SMS.
 */
export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId)
      return NextResponse.json(
        { error: "bookingId required" },
        { status: 400 },
      );

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_date, booking_time, booking_type, service_key, user_id, vendor_id, branch_id",
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      console.error("[notify-booking] fetch error:", error);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Fetch vendor business info + customer info + resolve booking recipient +
    // location (branch if available, otherwise vendor) in parallel
    const [{ data: vendor }, { data: userRow }, bookingRecipient, locationRow] =
      await Promise.all([
        supabase
          .from("vendors")
          .select("business_name")
          .eq("id", booking.vendor_id)
          .single(),
        supabase
          .from("users")
          .select("full_name, email, phone")
          .eq("id", booking.user_id)
          .single(),
        // Booking notifications go to the branch manager (if assigned),
        // otherwise fall back to the vendor owner.
        resolveBookingRecipient(booking.branch_id, booking.vendor_id),
        // Fetch maps_link from branch first, fall back to vendor
        booking.branch_id
          ? supabase
              .from("vendor_branches")
              .select("maps_link")
              .eq("id", booking.branch_id)
              .single()
              .then((r) => r.data)
          : supabase
              .from("vendors")
              .select("maps_link")
              .eq("id", booking.vendor_id)
              .single()
              .then((r) => r.data),
      ]);

    // Use maps_link directly from DB
    const mapsLink = locationRow?.maps_link ?? undefined;

    const vendorEmail = bookingRecipient.email;
    const vendorPhone = bookingRecipient.phone;
    const vendorUserId = bookingRecipient.userId ?? undefined;

    const centerName = vendor?.business_name ?? "Service Center";
    const dateTime = `${booking.booking_date} at ${booking.booking_time}`;
    const service = booking.service_key
      ? booking.service_key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
      : booking.booking_type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    const bookingLink = `${appUrl}/en/bookings/${bookingId}`;
    const dashboardLink = `${appUrl}/en/vendor/bookings`;

    // Customer: SMS + Email
    if (userRow?.phone || userRow?.email) {
      await notifyCustomerBookingConfirmed({
        userId: booking.user_id,
        phone: userRow?.phone ?? undefined,
        email: userRow?.email ?? undefined,
        customerName: userRow?.full_name ?? undefined,
        centerName,
        dateTime,
        bookingId,
        mapsLink,
      }).catch((e) =>
        console.error("[notify-booking] customer notification error:", e),
      );
    }

    // Vendor: SMS + Email
    // Recipient = branch manager (if assigned to this branch) or vendor owner
    if (vendorEmail) {
      await notifyVendorNewBooking({
        vendorUserId,
        vendorPhone: vendorPhone ?? "",
        vendorEmail,
        customerName: userRow?.full_name ?? "A customer",
        service,
        dateTime,
        bookingId,
        dashboardLink,
      }).catch((e) => console.error("[notify-booking] vendor email error:", e));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify-booking] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
