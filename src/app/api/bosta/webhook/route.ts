/**
 * POST /api/bosta/webhook
 *
 * Receives delivery status updates from Bosta.
 * Bosta retries delivery until it receives a 2xx response.
 *
 * Bosta sends numeric state codes in the `state` field:
 *   20/21/24/30/41 → in-transit / shipped
 *   45             → Delivered ✅ → complete order + trigger payout
 *   46             → Returned to business
 *   47             → Exception (NDR) → failed_delivery
 *   48             → Terminated
 *   49             → Cancelled
 *   100/101        → Lost / Damaged → failed_delivery
 *
 * Webhook authentication: set a custom Authorization header in the Bosta
 * dashboard (Settings → API Integration → Webhook) and mirror its value
 * in the BOSTA_WEBHOOK_SECRET env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import {
  verifyWebhookSignature,
  type BostaWebhookPayload,
} from "@/services/bostaService";

// ── Service-role Supabase client (no RLS, safe for server-only use) ───────────
function adminSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Inline notification helper (avoids importing client-only module) ──────────
async function sendNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  const supabase = adminSupabase();
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
    is_read: false,
  });
}

export async function POST(req: NextRequest) {
  // 1. Read raw body
  const rawBody = await req.text();

  // 2. Verify webhook authentication
  // Bosta sends a custom Authorization header configured in the dashboard.
  const authHeader = req.headers.get("authorization");
  if (!verifyWebhookSignature(authHeader)) {
    console.warn("[Bosta webhook] Invalid authorization — rejected");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse payload
  let payload: BostaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as BostaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = adminSupabase();
  const orderId: string = payload.businessReference;
  const stateCode = payload.state; // numeric code from Bosta

  if (!orderId || stateCode == null) {
    // Not a payload we can action — still 200 to stop Bosta retrying
    return NextResponse.json({ ok: true });
  }

  // 4. Fetch order (and its items with vendor info)
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select(
      `id, user_id, status, total_amount, discount, delivery_attempts,
       bosta_shipment_id, tracking_number,
       order_items(id, vendor_id, unit_price, quantity)`,
    )
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) {
    console.error(
      "[Bosta webhook] Order not found:",
      orderId,
      fetchErr?.message,
    );
    // Still 200 — no point in Bosta retrying for a missing order
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  const trackingNumber = payload.trackingNumber
    ? String(payload.trackingNumber)
    : null;

  // 5. Handle state transitions
  // In-transit states: 20 (route assigned), 21 (picked up), 24 (at warehouse), 30 (inter-hub), 41 (out for delivery)
  const IN_TRANSIT_STATES = new Set([20, 21, 24, 30, 41]);
  // Terminal failure states
  const FAILED_STATES = new Set([46, 47, 48, 100, 101]);

  if (IN_TRANSIT_STATES.has(stateCode)) {
    // ── In-flight → mark shipped ────────────────────────────────────────────
    await supabase
      .from("orders")
      .update({
        status: "shipped",
        bosta_state_code: String(stateCode),
        ...(order.status !== "shipped" && order.status !== "completed"
          ? { shipped_at: now }
          : {}),
        ...(trackingNumber && !order.tracking_number
          ? { tracking_number: trackingNumber }
          : {}),
        ...(payload._id && !order.bosta_shipment_id
          ? { bosta_shipment_id: payload._id }
          : {}),
      })
      .eq("id", orderId);

    // Notify buyer only on first transit event
    if (order.status !== "shipped" && order.status !== "completed") {
      const trackingUrl = trackingNumber
        ? `https://tracking.bosta.co/shipments/track/${trackingNumber}`
        : undefined;
      await sendNotification(
        order.user_id,
        "order_shipped_bosta",
        "Your Order is on the Way 🚚",
        `Order #${orderId.slice(0, 8).toUpperCase()} has been shipped. Track: ${trackingNumber ?? "—"}`,
        trackingUrl ?? `/orders/${orderId}`,
      );
    }
  } else if (stateCode === 45) {
    // ── Delivered → complete order + trigger payout ─────────────────────────
    await supabase
      .from("orders")
      .update({
        status: "completed",
        bosta_state_code: String(stateCode),
        delivered_at: now,
        ...(trackingNumber && !order.tracking_number
          ? { tracking_number: trackingNumber }
          : {}),
      })
      .eq("id", orderId);

    // Trigger payout per vendor appearing in order_items
    const items = (order.order_items ?? []) as {
      id: string;
      vendor_id: string | null;
      unit_price: number;
      quantity: number;
    }[];

    const vendorMap = new Map<string, number>();
    for (const item of items) {
      if (!item.vendor_id) continue;
      vendorMap.set(
        item.vendor_id,
        (vendorMap.get(item.vendor_id) ?? 0) + item.unit_price * item.quantity,
      );
    }

    const vendorIds = [...vendorMap.keys()];
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase
        .from("vendors")
        .select("id, user_id, business_name")
        .in("id", vendorIds);

      for (const vendor of vendors ?? []) {
        const vendorTotal = vendorMap.get(vendor.id) ?? 0;
        if (vendorTotal === 0) continue;

        const discountShare =
          order.total_amount > 0
            ? (vendorTotal / order.total_amount) * (order.discount ?? 0)
            : 0;

        // Fetch commission rate for this vendor (uses admin client — no RLS issue)
        const { data: billingSettings } = await supabase
          .from("vendor_billing_settings")
          .select("commission_rate")
          .eq("vendor_id", vendor.id)
          .maybeSingle();

        const rate = billingSettings?.commission_rate ?? 15; // default 15%
        const finalAmount = Math.max(0, vendorTotal - discountShare);
        const platformShare = parseFloat(
          ((finalAmount * rate) / 100).toFixed(2),
        );
        const vendorShare = parseFloat(
          (finalAmount - platformShare).toFixed(2),
        );

        await supabase.from("parts_seller_transactions").upsert(
          {
            vendor_id: vendor.id,
            order_id: orderId,
            order_amount: vendorTotal,
            discount: parseFloat(discountShare.toFixed(2)),
            final_order_amount: finalAmount,
            commission_rate: rate,
            platform_share: platformShare,
            vendor_share: vendorShare,
            payment_status: "pending",
            refunded: false,
            refund_amount: 0,
          },
          { onConflict: "vendor_id,order_id" },
        );

        if (vendor.user_id) {
          await sendNotification(
            vendor.user_id,
            "order_delivered",
            "Order Delivered — Payout Queued 💰",
            `Order #${orderId.slice(0, 8).toUpperCase()} was delivered. Your payout has been queued for settlement.`,
            `/vendor/billing`,
          );
        }
      }
    }

    await sendNotification(
      order.user_id,
      "order_delivered",
      "Order Delivered ✅",
      `Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered. Enjoy!`,
      `/orders/${orderId}`,
    );
  } else if (FAILED_STATES.has(stateCode)) {
    // ── Exception / returned / terminated / lost / damaged ──────────────────
    const newAttempts = (order.delivery_attempts ?? 0) + 1;
    await supabase
      .from("orders")
      .update({
        status: "failed_delivery",
        bosta_state_code: String(stateCode),
        delivery_attempts: newAttempts,
      })
      .eq("id", orderId);

    const reason =
      payload.exceptionReason ??
      (stateCode === 100
        ? "Shipment was lost"
        : stateCode === 101
          ? "Shipment was damaged"
          : stateCode === 48
            ? "Shipment was terminated after repeated failed attempts"
            : "Courier could not complete delivery");

    await sendNotification(
      order.user_id,
      "order_status_changed",
      stateCode === 46 ? "Order Returned to Sender" : "Delivery Attempt Failed",
      `${reason}. Attempt #${newAttempts}. We will retry or contact you shortly.`,
      `/orders/${orderId}`,
    );
  } else if (stateCode === 49) {
    // ── Cancelled ────────────────────────────────────────────────────────────
    await supabase
      .from("orders")
      .update({ status: "cancelled", bosta_state_code: String(stateCode) })
      .eq("id", orderId);

    await sendNotification(
      order.user_id,
      "order_status_changed",
      "Shipment Cancelled",
      `The shipment for order #${orderId.slice(0, 8).toUpperCase()} has been cancelled. Please contact support.`,
      `/orders/${orderId}`,
    );
  } else {
    // Unknown / informational state — persist for audit trail only
    await supabase
      .from("orders")
      .update({ bosta_state_code: String(stateCode) })
      .eq("id", orderId);
  }

  // Always 200 so Bosta stops retrying
  return NextResponse.json({ ok: true });
}
