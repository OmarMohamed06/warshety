/**
 * inAppNotificationService — server-side writes to the `notifications` table
 * (the in-app notification feed / bell badge).
 *
 * Counterpart to `notificationService.ts` (browser-client inserts used by the
 * web app) and `outboundNotificationService.ts` (SMS/email via Resend). BFF
 * API routes run outside a logged-in browser session, so they need their own
 * service-role insert path — this is that path, used by every /api/bookings/*
 * notify route so web, Flutter, and any future client all get the same
 * in-app notification for a given event without duplicating the insert.
 */

import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/services/pushNotificationService";

export type InAppNotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_status_changed"
  | "booking_completed"
  | "ready_for_pickup"
  | "points_earned"
  | "promotion"
  | "message_received"
  | "review_reply"
  | "vendor_approved"
  | "vendor_rejected";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Insert a row into `notifications` for a user. Failures are logged, never
 * thrown — a broken notification row must never fail the booking/action that
 * triggered it.
 */
export async function createInAppNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: InAppNotificationType;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      link: link ?? null,
      is_read: false,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[inAppNotificationService] insert failed:", err);
  }

  // Runs independently of the insert above — a user should still get paged
  // even if, say, the in-app row failed to write for some other reason.
  const referenceId = link?.split("/").filter(Boolean).pop();
  await sendPushNotification({ userId, title, body, type, referenceId });
}
