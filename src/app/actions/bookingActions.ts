"use server";

/**
 * bookingActions — Server actions for booking operations that require
 * service-role access (e.g. sending outbound SMS notifications via the
 * outboundNotificationService which uses the Supabase service-role key).
 */

import { createClient } from "@supabase/supabase-js";
import {
  notifyCustomerBookingCancelled,
  notifyCustomerBookingConfirmed,
  notifyVendorNewBooking,
  resolveBookingRecipient,
} from "@/services/outboundNotificationService";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Send an outbound SMS to the customer when a vendor cancels their booking.
 * Call this from the vendor bookings page after a successful cancellation.
 */
export async function notifyVendorCancelledBookingAction(
  bookingId: string,
  reason?: string,
): Promise<void> {
  try {
    const supabase = getServiceClient();

    // Fetch the booking with customer phone + email + vendor name
    const { data: booking } = await supabase
      .from("bookings")
      .select(
        `user_id,
         user:users!inner(phone, email, full_name),
         vendor:vendors!inner(business_name)`,
      )
      .eq("id", bookingId)
      .single();

    if (!booking) return;

    const phone = (
      booking.user as {
        phone?: string;
        email?: string;
        full_name?: string;
      } | null
    )?.phone;
    const email = (
      booking.user as {
        phone?: string;
        email?: string;
        full_name?: string;
      } | null
    )?.email;
    const customerName = (
      booking.user as {
        phone?: string;
        email?: string;
        full_name?: string;
      } | null
    )?.full_name;
    const centerName =
      (booking.vendor as { business_name?: string } | null)?.business_name ??
      "the service center";

    if (!phone && !email) return;

    await notifyCustomerBookingCancelled({
      userId: booking.user_id,
      phone: phone ?? undefined,
      email: email ?? undefined,
      customerName: customerName ?? undefined,
      centerName,
      reason,
      bookingId,
    });
  } catch (err) {
    // Non-fatal — log but don't throw (vendor UI shouldn't break)
    console.error("[bookingActions] notifyVendorCancelledBookingAction:", err);
  }
}

/**
 * Send confirmation email + SMS to customer and vendor after a booking is created.
 * Called server-side so SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY are available.
 */
export async function notifyBookingConfirmedAction(
  bookingId: string,
): Promise<void> {
  try {
    const supabase = getServiceClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_date, booking_time, booking_type, service_key, user_id, vendor_id, branch_id",
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      console.error("[notifyBookingConfirmedAction] booking not found:", error);
      return;
    }

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
        resolveBookingRecipient(booking.branch_id, booking.vendor_id),
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

    const mapsLink = locationRow?.maps_link ?? undefined;
    const centerName = vendor?.business_name ?? "Service Center";
    const dateTime = `${booking.booking_date} at ${booking.booking_time ?? ""}`;
    const service = booking.service_key
      ? booking.service_key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
      : booking.booking_type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    const dashboardLink = `${appUrl}/en/vendor/bookings`;

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
        console.error("[notifyBookingConfirmedAction] customer email:", e),
      );
    }

    if (bookingRecipient.email) {
      await notifyVendorNewBooking({
        vendorUserId: bookingRecipient.userId ?? undefined,
        vendorPhone: bookingRecipient.phone ?? "",
        vendorEmail: bookingRecipient.email,
        customerName: userRow?.full_name ?? "A customer",
        service,
        dateTime,
        bookingId,
        dashboardLink,
      }).catch((e) =>
        console.error("[notifyBookingConfirmedAction] vendor email:", e),
      );
    }
  } catch (err) {
    console.error("[notifyBookingConfirmedAction] unexpected error:", err);
  }
}
