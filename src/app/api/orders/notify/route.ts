import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  notifyCustomerOrderConfirmed,
  notifyVendorNewOrder,
} from "@/services/outboundNotificationService";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = (await req.json()) as { orderId: string };
    if (!orderId)
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    const supabase = getServiceClient();
    const origin = req.nextUrl.origin;

    // Fetch order with user info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `id, total_amount, delivery_name, user_id,
         user:users!inner(phone, email, full_name)`,
      )
      .eq("id", orderId)
      .single();

    if (!order) {
      console.error(
        "[orders/notify] order not found or join failed:",
        orderError?.message,
      );
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch order items
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("name, quantity, unit_price, vendor_id")
      .eq("order_id", orderId);

    const items = (orderItems ?? []).map((i) => ({
      name: i.name,
      qty: i.quantity,
      price: i.unit_price,
    }));

    const orderNumber = orderId.slice(0, 8).toUpperCase();
    const user = order.user as {
      phone?: string;
      email?: string;
      full_name?: string;
    } | null;
    const customerPhone = user?.phone ?? "";
    const customerEmail = user?.email ?? "";
    const customerName = user?.full_name ?? order.delivery_name ?? "Customer";

    // 1. Notify customer
    if (customerPhone || customerEmail) {
      try {
        await notifyCustomerOrderConfirmed({
          userId: order.user_id,
          phone: customerPhone,
          email: customerEmail,
          orderNumber,
          items,
          totalAmount: order.total_amount,
          orderLink: `${origin}/en/orders/${orderId}`,
        });
      } catch (e) {
        console.error("[orders/notify] customer notification failed:", e);
      }
    }

    // 2. Notify vendor(s) — group items by vendor_id
    const vendorIds = [
      ...new Set((orderItems ?? []).map((i) => i.vendor_id).filter(Boolean)),
    ];

    for (const vendorId of vendorIds) {
      try {
        const { data: vendor } = await supabase
          .from("vendors")
          .select("user_id, business_name, email, phone")
          .eq("id", vendorId)
          .single();

        // Use vendor's account (login) email first, fall back to business email
        const vendorAcctEmail = vendor?.user_id
          ? (
              await supabase
                .from("users")
                .select("email")
                .eq("id", vendor.user_id)
                .single()
            ).data?.email
          : null;
        const vendorEmail = vendorAcctEmail ?? vendor?.email ?? null;

        if (!vendor || (!vendorEmail && !vendor?.phone)) continue;

        const vendorItems = (orderItems ?? [])
          .filter((i) => i.vendor_id === vendorId)
          .map((i) => ({ name: i.name, qty: i.quantity, price: i.unit_price }));

        const vendorTotal = vendorItems.reduce(
          (s, i) => s + i.price * i.qty,
          0,
        );

        await notifyVendorNewOrder({
          vendorUserId: vendor.user_id ?? undefined,
          vendorPhone: vendor.phone ?? "",
          vendorEmail: vendorEmail ?? "",
          orderNumber,
          customerName,
          items: vendorItems,
          totalAmount: vendorTotal,
          dashboardLink: `${origin}/en/vendor/orders`,
        });
      } catch (e) {
        console.error(
          `[orders/notify] vendor ${vendorId} notification failed:`,
          e,
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[orders/notify] unexpected error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
