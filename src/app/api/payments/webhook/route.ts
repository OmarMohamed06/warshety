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

      // Fetch order user info and items in parallel
      const [{ data: fullOrder }, { data: orderItems }] = await Promise.all([
        db
          .from("orders")
          .select(
            `id, total_amount, delivery_name, user_id, user:users!inner(phone, email, full_name)`,
          )
          .eq("id", orderId)
          .single(),
        db
          .from("order_items")
          .select("name, quantity, unit_price, vendor_id")
          .eq("order_id", orderId),
      ]);

      const user = (fullOrder as { user?: { phone?: string; email?: string; full_name?: string } } | null)?.user ?? null;
      const customerPhone = user?.phone ?? "";
      const customerEmail = user?.email ?? "";
      const customerName =
        user?.full_name ??
        (fullOrder as { delivery_name?: string } | null)?.delivery_name ??
        "Customer";
      const orderNumber = orderId.slice(0, 8).toUpperCase();
      const items = (orderItems ?? []).map((i) => ({
        name: i.name,
        qty: i.quantity,
        price: i.unit_price,
      }));

      // Notify customer
      if (customerPhone || customerEmail) {
        await notifyCustomerOrderConfirmed({
          userId: (fullOrder as { user_id?: string } | null)?.user_id,
          phone: customerPhone,
          email: customerEmail,
          orderNumber,
          items,
          totalAmount: (fullOrder as { total_amount?: number } | null)?.total_amount ?? 0,
          orderLink: `${origin}/en/orders/${orderId}`,
        }).catch((e) =>
          console.error("[Paymob webhook] customer order notification failed:", e),
        );
      }

      // Notify vendor(s)
      const vendorIds = [
        ...new Set(
          (orderItems ?? []).map((i) => i.vendor_id).filter(Boolean),
        ),
      ];
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
            .filter((i) => i.vendor_id === vendorId)
            .map((i) => ({ name: i.name, qty: i.quantity, price: i.unit_price }));
          const vendorTotal = vendorItems.reduce((s, i) => s + i.price * i.qty, 0);

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
