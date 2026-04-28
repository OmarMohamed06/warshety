/**
 * notificationService — Notification storage and retrieval.
 *
 * Notifications are triggered by system events:
 *  - booking_confirmed, booking_cancelled
 *  - order_shipped, order_status_changed
 *  - message_received
 *  - review_reply
 *
 * Stored in the `notifications` table.
 * Unread count drives the navbar badge.
 */

import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_status_changed"
  | "order_shipped"
  | "order_status_changed"
  | "order_processing"
  | "order_shipped_bosta"
  | "order_delivered"
  | "message_received"
  | "review_reply"
  | "vendor_approved"
  | "vendor_rejected"
  | "payout_request";

export interface DbNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Create a notification for a user.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  const supabase = createClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
    is_read: false,
  });
}

/**
 * Fetch all notifications for a user, newest first.
 */
export async function getUserNotifications(
  userId: string,
): Promise<DbNotification[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as DbNotification[];
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

/**
 * Mark a single notification as read.
 */
export async function markRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllRead(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}

// ── Event helpers — call these from bookingService / orderService ─────────────

export async function notifyBookingConfirmed(
  userId: string,
  bookingId: string,
  centerName: string,
): Promise<void> {
  await createNotification(
    userId,
    "booking_confirmed",
    "Booking Confirmed ✓",
    `Your booking at ${centerName} has been confirmed.`,
    `/bookings/${bookingId}`,
  );
}

export async function notifyBookingCancelled(
  userId: string,
  bookingId: string,
  centerName: string,
): Promise<void> {
  await createNotification(
    userId,
    "booking_cancelled",
    "Booking Cancelled",
    `Your booking at ${centerName} has been cancelled.`,
    `/bookings/${bookingId}`,
  );
}

export async function notifyOrderShipped(
  userId: string,
  orderId: string,
): Promise<void> {
  await createNotification(
    userId,
    "order_shipped",
    "Order Shipped 🚚",
    `Your order #${orderId.slice(0, 8).toUpperCase()} has been shipped.`,
    `/orders/${orderId}`,
  );
}

export async function notifyVendorApproved(userId: string): Promise<void> {
  await createNotification(
    userId,
    "vendor_approved",
    "Application Approved 🎉",
    "Congratulations! Your vendor application has been approved.",
    "/vendor/dashboard",
  );
}

export async function notifyVendorRejected(
  userId: string,
  reason?: string,
): Promise<void> {
  await createNotification(
    userId,
    "vendor_rejected",
    "Application Not Approved",
    reason ?? "Your vendor application was not approved at this time.",
    "/vendor/apply",
  );
}

// ── Bosta / shipping event helpers ────────────────────────────────────────────

/**
 * Notify buyer that the vendor has confirmed readiness and Bosta pickup is scheduled.
 */
export async function notifyOrderProcessing(
  buyerUserId: string,
  orderId: string,
  trackingNumber: string,
  trackingUrl: string,
): Promise<void> {
  await createNotification(
    buyerUserId,
    "order_processing",
    "Your Order is Being Prepared 📦",
    `Order #${orderId.slice(0, 8).toUpperCase()} is being packed. Tracking: ${trackingNumber}`,
    trackingUrl,
  );
}

/**
 * Notify buyer that the package has been picked up and is in transit.
 * Optionally notify the vendor as well.
 */
export async function notifyOrderShippedBosta(
  buyerUserId: string,
  orderId: string,
  trackingNumber: string,
  trackingUrl: string,
  vendorUserId?: string,
): Promise<void> {
  await createNotification(
    buyerUserId,
    "order_shipped_bosta",
    "Your Order is on the Way 🚚",
    `Order #${orderId.slice(0, 8).toUpperCase()} has been shipped. Track: ${trackingNumber}`,
    trackingUrl,
  );

  if (vendorUserId) {
    await createNotification(
      vendorUserId,
      "order_shipped_bosta",
      "Order Shipped 🚚",
      `Order #${orderId.slice(0, 8).toUpperCase()} has been picked up by Bosta.`,
      `/vendor/orders`,
    );
  }
}

/**
 * Notify buyer that the order was delivered.
 * Optionally notify the vendor that their payout has been queued.
 */
export async function notifyOrderDelivered(
  buyerUserId: string,
  orderId: string,
  vendorUserId?: string,
): Promise<void> {
  await createNotification(
    buyerUserId,
    "order_delivered",
    "Order Delivered ✅",
    `Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered. Enjoy!`,
    `/orders/${orderId}`,
  );

  if (vendorUserId) {
    await createNotification(
      vendorUserId,
      "order_delivered",
      "Order Delivered — Payout Queued 💰",
      `Order #${orderId.slice(0, 8).toUpperCase()} was delivered. Your payout has been queued for settlement.`,
      `/vendor/billing`,
    );
  }
}
