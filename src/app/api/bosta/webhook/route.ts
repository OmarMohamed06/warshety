/**
 * POST /api/bosta/webhook
 *
 * Receives delivery status updates from Bosta.
 * Bosta retries delivery until it receives a 2xx response.
 *
 * Logic per state code:
 *   PICKED_UP / IN_TRANSIT / OUT_FOR_DELIVERY
 *     → order status = 'shipped', record shipped_at if first time
 *   DELIVERED
 *     → order status = 'completed', delivered_at = now()
 *     → trigger parts-seller payout (createPartsSellerTransaction per vendor)
 *     → notify buyer + each vendor
 *   DELIVERY_FAILED / RETURNED
 *     → order status = 'failed_delivery', increment delivery_attempts
 *     → notify buyer
 *   CANCELLED
 *     → order status = 'cancelled'
 *     → notify buyer
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import {
  verifyWebhookSignature,
  type BostaWebhookPayload,
} from "@/services/bostaService";
import { createPartsSellerTransaction } from "@/services/billingService";

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
  // 1. Read raw body for HMAC verification
  const rawBody = await req.text();

  // 2. Verify signature
  const signature = req.headers.get("x-bosta-signature");
  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    console.warn("[Bosta webhook] Invalid signature — rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
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
  const stateCode = payload.state?.code;

  if (!orderId || !stateCode) {
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

  // 5. Handle state transitions
  switch (stateCode) {
    // ── In-flight states → mark shipped ──────────────────────────────────────
    case "PICKED_UP":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY": {
      await supabase
        .from("orders")
        .update({
          status: "shipped",
          bosta_state_code: stateCode,
          // Only set shipped_at the first time we see a transit event
          ...(order.status !== "shipped" && order.status !== "completed"
            ? { shipped_at: now }
            : {}),
          // Sync tracking info if not already stored
          ...(payload.trackingNumber && !order.tracking_number
            ? { tracking_number: payload.trackingNumber }
            : {}),
          ...(payload._id && !order.bosta_shipment_id
            ? { bosta_shipment_id: payload._id }
            : {}),
        })
        .eq("id", orderId);

      // Notify buyer the first time
      if (order.status !== "shipped" && order.status !== "completed") {
        const trackingUrl = payload.trackingNumber
          ? `https://tracking.bosta.co/shipments/track/${payload.trackingNumber}`
          : undefined;
        await sendNotification(
          order.user_id,
          "order_shipped_bosta",
          "Your Order is on the Way 🚚",
          `Order #${orderId.slice(0, 8).toUpperCase()} has been shipped. Track: ${payload.trackingNumber ?? "—"}`,
          trackingUrl ?? `/orders/${orderId}`,
        );
      }
      break;
    }

    // ── Delivered → complete order + trigger payout ───────────────────────────
    case "DELIVERED": {
      await supabase
        .from("orders")
        .update({
          status: "completed",
          bosta_state_code: stateCode,
          delivered_at: now,
        })
        .eq("id", orderId);

      // Trigger payout per vendor appearing in order_items
      const items = (order.order_items ?? []) as {
        id: string;
        vendor_id: string | null;
        unit_price: number;
        quantity: number;
      }[];

      // Group items by vendor_id
      const vendorMap = new Map<string, { total: number; userId?: string }>();
      for (const item of items) {
        if (!item.vendor_id) continue;
        const existing = vendorMap.get(item.vendor_id) ?? { total: 0 };
        existing.total += item.unit_price * item.quantity;
        vendorMap.set(item.vendor_id, existing);
      }

      // Fetch vendor user_ids for notifications
      const vendorIds = [...vendorMap.keys()];
      if (vendorIds.length > 0) {
        const { data: vendors } = await supabase
          .from("vendors")
          .select("id, user_id, business_name")
          .in("id", vendorIds);

        for (const vendor of vendors ?? []) {
          const vendorTotal = vendorMap.get(vendor.id)?.total ?? 0;
          if (vendorTotal === 0) continue;

          // Pro-rata discount: discount proportional to this vendor's items
          const discountShare =
            order.total_amount > 0
              ? (vendorTotal / order.total_amount) * (order.discount ?? 0)
              : 0;

          // Create / upsert billing transaction
          await createPartsSellerTransaction(
            vendor.id,
            orderId,
            vendorTotal,
            parseFloat(discountShare.toFixed(2)),
          );

          // Notify vendor: payout triggered
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

      // Notify buyer
      await sendNotification(
        order.user_id,
        "order_delivered",
        "Order Delivered ✅",
        `Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered. Enjoy!`,
        `/orders/${orderId}`,
      );
      break;
    }

    // ── Failed delivery / returned ────────────────────────────────────────────
    case "DELIVERY_FAILED":
    case "RETURNED": {
      const newAttempts = (order.delivery_attempts ?? 0) + 1;
      await supabase
        .from("orders")
        .update({
          status: "failed_delivery",
          bosta_state_code: stateCode,
          delivery_attempts: newAttempts,
        })
        .eq("id", orderId);

      const reason = payload.reason ?? "Courier could not reach you";
      await sendNotification(
        order.user_id,
        "order_status_changed",
        stateCode === "RETURNED" ? "Order Returned" : "Delivery Attempt Failed",
        `${reason}. Attempt #${newAttempts}. We will retry or contact you shortly.`,
        `/orders/${orderId}`,
      );
      break;
    }

    // ── Cancelled ─────────────────────────────────────────────────────────────
    case "CANCELLED": {
      await supabase
        .from("orders")
        .update({ status: "cancelled", bosta_state_code: stateCode })
        .eq("id", orderId);

      await sendNotification(
        order.user_id,
        "order_status_changed",
        "Shipment Cancelled",
        `The shipment for order #${orderId.slice(0, 8).toUpperCase()} has been cancelled. Please contact support.`,
        `/orders/${orderId}`,
      );
      break;
    }

    default:
      // Unknown state — just update the state code for audit trail
      await supabase
        .from("orders")
        .update({ bosta_state_code: stateCode })
        .eq("id", orderId);
  }

  // Always return 200 so Bosta stops retrying
  return NextResponse.json({ ok: true });
}
