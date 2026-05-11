import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyHmac } from "@/lib/paymob";

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
  const { data: order, error: updateError } = await db
    .from("orders")
    .update({ status: "paid" as const })
    .eq("idempotency_key", specialReference)
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

  // 8. Fire order confirmation notifications (non-blocking)
  if (order?.id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
    fetch(`${appUrl}/api/orders/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(() => {
      /* non-fatal */
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
