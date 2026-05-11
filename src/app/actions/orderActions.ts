"use server";

import { createClient } from "@supabase/supabase-js";
import {
  notifyCustomerOrderConfirmed,
  notifyVendorNewOrder,
} from "@/services/outboundNotificationService";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Send order confirmation notifications after a COD order is placed.
 * Called as a server action from the checkout page so it runs server-side
 * (avoids relying on a fire-and-forget browser fetch that can be cancelled).
 */
export async function notifyOrderConfirmedAction(
  orderId: string,
): Promise<void> {
  try {
    const db = getServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";

    const [{ data: order }, { data: orderItems }] = await Promise.all([
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

    if (!order) {
      console.error("[notifyOrderConfirmedAction] order not found:", orderId);
      return;
    }

    const user =
      (
        order as unknown as {
          user?: { phone?: string; email?: string; full_name?: string };
        }
      ).user ?? null;
    const customerPhone = user?.phone ?? "";
    const customerEmail = user?.email ?? "";
    const customerName =
      user?.full_name ??
      (order as unknown as { delivery_name?: string }).delivery_name ??
      "Customer";
    const orderNumber = orderId.slice(0, 8).toUpperCase();
    const items = (orderItems ?? []).map((i) => ({
      name: i.name,
      qty: i.quantity,
      price: i.unit_price,
    }));
    const totalAmount =
      (order as unknown as { total_amount?: number }).total_amount ?? 0;

    // Notify customer
    if (customerPhone || customerEmail) {
      await notifyCustomerOrderConfirmed({
        userId: (order as unknown as { user_id?: string }).user_id,
        phone: customerPhone,
        email: customerEmail,
        orderNumber,
        items,
        totalAmount,
        orderLink: `${appUrl}/en/orders/${orderId}`,
      }).catch((e) =>
        console.error(
          "[notifyOrderConfirmedAction] customer notification failed:",
          e,
        ),
      );
    }

    // Notify vendor(s) — group by vendor_id
    const vendorIds = [
      ...new Set((orderItems ?? []).map((i) => i.vendor_id).filter(Boolean)),
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
        const vendorTotal = vendorItems.reduce(
          (s, i) => s + i.price * i.qty,
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
          dashboardLink: `${appUrl}/en/vendor/orders`,
        });
      } catch (e) {
        console.error(
          `[notifyOrderConfirmedAction] vendor ${vendorId} notification failed:`,
          e,
        );
      }
    }
  } catch (err) {
    console.error("[notifyOrderConfirmedAction] unexpected error:", err);
  }
}
