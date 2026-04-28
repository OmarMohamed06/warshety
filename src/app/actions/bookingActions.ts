"use server";

/**
 * bookingActions — Server actions for booking operations that require
 * service-role access (e.g. sending outbound SMS notifications via the
 * outboundNotificationService which uses the Supabase service-role key).
 */

import { createClient } from "@supabase/supabase-js";
import { notifyCustomerBookingCancelled } from "@/services/outboundNotificationService";

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
