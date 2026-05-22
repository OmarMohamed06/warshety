import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyHmac } from "@/lib/paymob";
import {
  notifyCustomerOrderConfirmed,
  notifyVendorNewOrder,
} from "@/services/outboundNotificationService";

/**
 * Paymob transaction webhook.
 * Paymob POSTs here after every transaction (success OR failure).
 * HMAC is passed as a query param: ?hmac=<hex>
 *
 * On confirmed payment (`obj.success === true`):
 *  - Updates the pre-saved order status from "pending" → "paid"
 *  - Creates parts_seller_transactions rows for each parts-seller vendor
 *  - Sends order confirmation notifications
 *
 * Always returns HTTP 200 so Paymob does not retry unnecessarily.
 */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // 1. Extract HMAC from query string
  const receivedHmac = req.nextUrl.searchParams.get("hmac") ?? "";

  // 2. Parse body — keep as raw text first so we can forward to notifications later
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    // Malformed body — acknowledge but don't process
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 3. Paymob wraps transaction data inside `obj`
  const obj = (payload.obj ?? payload) as Record<string, unknown>;

  // 4. Verify HMAC — reject tampered requests silently (return 200 to prevent retries)
  if (!verifyHmac(obj, receivedHmac)) {
    console.warn("[Paymob webhook] HMAC mismatch — possible tampered request");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 5. Only process successful transactions
  const isSuccess = obj.success === true || obj.success === "true";
  if (!isSuccess) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 6. Retrieve the special_reference (our idempotency key) to match the order
  const specialReference =
    (obj.special_reference as string) ??
    ((obj.order as Record<string, unknown>)?.merchant_order_id as string);

  if (!specialReference) {
    console.error("[Paymob webhook] Missing special_reference in payload");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const db = getServiceClient();

  // 7. Update order status to "paid" (idempotent — safe to call multiple times)
  // special_reference is set to the order UUID (see intention/route.ts)
  const { data: order, error: updateError } = await db
    .from("orders")
    .update({ status: "paid" as const })
    .eq("id", specialReference)
    .eq("status", "pending") // only update if still pending (avoids re-processing)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error(
      "[Paymob webhook] Failed to update order status:",
      updateError,
    );
    // Still return 200 — we'll detect via monitoring rather than causing Paymob retries
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 8. Fire order confirmation notifications (awaited — serverless functions kill unawaited promises)
  if (order?.id) {
    try {
      const origin = req.nextUrl.origin;
      const orderId = order.id;

      // Fetch order user info, discount and items in parallel
      const [{ data: fullOrder }, { data: orderItems }] = await Promise.all([
        db
          .from("orders")
          .select(
            `id, total_amount, discount, delivery_name, user_id, user:users!inner(phone, email, full_name)`,
          )
          .eq("id", orderId)
          .single(),
        db
          .from("order_items")
          .select("name, quantity, unit_price, vendor_id")
          .eq("order_id", orderId),
      ]);

      // ── 8a. Create parts-seller billing transactions ─────────────────────
      // For each unique parts-seller vendor, record a commission transaction.
      const vendorIds = [
        ...new Set(
          (orderItems ?? [])
            .map((i: { vendor_id: string }) => i.vendor_id)
            .filter(Boolean),
        ),
      ] as string[];

      const orderDiscount = Number(
        (fullOrder as { discount?: number } | null)?.discount ?? 0,
      );

      for (const vendorId of vendorIds) {
        try {
          // Only create transactions for parts_seller vendors
          const { data: vendorRow } = await db
            .from("vendors")
            .select("id, vendor_type")
            .eq("id", vendorId)
            .eq("vendor_type", "parts_seller")
            .maybeSingle();

          if (!vendorRow) continue;

          // Sum up this vendor's items for the order
          const vendorItems = (orderItems ?? []).filter(
            (i: { vendor_id: string }) => i.vendor_id === vendorId,
          );
          const vendorOrderAmount = vendorItems.reduce(
            (s: number, i: { unit_price: number; quantity: number }) =>
              s + i.unit_price * i.quantity,
            0,
          );

          // Fetch this vendor's commission rate (falls back to 15 % if not set)
          const { data: billingSettings } = await db
            .from("vendor_billing_settings")
            .select("commission_rate")
            .eq("vendor_id", vendorId)
            .maybeSingle();

          const { data: platformDefault } = await db
            .from("system_settings")
            .select("value")
            .eq("key", "parts_seller_commission_pct")
            .maybeSingle();

          const commissionRate =
            (billingSettings as { commission_rate?: number } | null)
              ?.commission_rate ??
            parseFloat(
              (platformDefault as { value?: string } | null)?.value ?? "15",
            );

          // Apportion any order-level discount proportionally to this vendor
          const totalOrderAmount = (orderItems ?? []).reduce(
            (s: number, i: { unit_price: number; quantity: number }) =>
              s + i.unit_price * i.quantity,
            0,
          );
          const vendorDiscount =
            totalOrderAmount > 0
              ? parseFloat(
                  (
                    (orderDiscount * vendorOrderAmount) /
                    totalOrderAmount
                  ).toFixed(2),
                )
              : 0;

          const finalAmount = Math.max(0, vendorOrderAmount - vendorDiscount);
          const platformShare = parseFloat(
            ((finalAmount * commissionRate) / 100).toFixed(2),
          );
          const vendorShare = parseFloat(
            (finalAmount - platformShare).toFixed(2),
          );

          await db.from("parts_seller_transactions").upsert(
            {
              vendor_id: vendorId,
              order_id: orderId,
              order_amount: vendorOrderAmount,
              discount: vendorDiscount,
              final_order_amount: finalAmount,
              commission_rate: commissionRate,
              platform_share: platformShare,
              vendor_share: vendorShare,
              payment_status: "pending",
              refunded: false,
              refund_amount: 0,
            },
            { onConflict: "vendor_id,order_id" },
          );
        } catch (e) {
          console.error(
            `[Paymob webhook] billing transaction for vendor ${vendorId} failed:`,
            e,
          );
        }
      }

      const user =
        (
          fullOrder as {
            user?: { phone?: string; email?: string; full_name?: string };
          } | null
        )?.user ?? null;
      const customerPhone = user?.phone ?? "";
      const customerEmail = user?.email ?? "";
      const customerName =
        user?.full_name ??
        (fullOrder as { delivery_name?: string } | null)?.delivery_name ??
        "Customer";
      const orderNumber = orderId.slice(0, 8).toUpperCase();
      const items = (orderItems ?? []).map(
        (i: { name: string; quantity: number; unit_price: number }) => ({
          name: i.name,
          qty: i.quantity,
          price: i.unit_price,
        }),
      );

      // Notify customer
      if (customerPhone || customerEmail) {
        await notifyCustomerOrderConfirmed({
          userId: (fullOrder as { user_id?: string } | null)?.user_id,
          phone: customerPhone,
          email: customerEmail,
          orderNumber,
          items,
          totalAmount:
            (fullOrder as { total_amount?: number } | null)?.total_amount ?? 0,
          orderLink: `${origin}/en/orders/${orderId}`,
        }).catch((e) =>
          console.error(
            "[Paymob webhook] customer order notification failed:",
            e,
          ),
        );
      }

      // Notify vendor(s)
      for (const vendorId of vendorIds) {
        try {
          const { data: vendor } = await db
            .from("vendors")
            .select("user_id, business_name, email, phone")
            .eq("id", vendorId)
            .single();

          const vendorAcctEmail = vendor?.user_id
            ? (
                await db
                  .from("users")
                  .select("email")
                  .eq("id", vendor.user_id)
                  .single()
              ).data?.email
            : null;
          const vendorEmail = vendorAcctEmail ?? vendor?.email ?? null;

          if (!vendor || !vendorEmail) continue;

          const vendorItems = (orderItems ?? [])
            .filter((i: { vendor_id: string }) => i.vendor_id === vendorId)
            .map(
              (i: { name: string; quantity: number; unit_price: number }) => ({
                name: i.name,
                qty: i.quantity,
                price: i.unit_price,
              }),
            );
          const vendorTotal = vendorItems.reduce(
            (s: number, i: { price: number; qty: number }) =>
              s + i.price * i.qty,
            0,
          );

          await notifyVendorNewOrder({
            vendorUserId: vendor.user_id ?? undefined,
            vendorPhone: vendor.phone ?? "",
            vendorEmail,
            orderNumber,
            customerName,
            items: vendorItems,
            totalAmount: vendorTotal,
            dashboardLink: `${origin}/en/vendor/orders`,
          });
        } catch (e) {
          console.error(
            `[Paymob webhook] vendor ${vendorId} notification failed:`,
            e,
          );
        }
      }
    } catch (e) {
      console.error("[Paymob webhook] notifications failed:", e);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
