/**
 * POST /api/vendor/orders/ship
 *
 * Called by the vendor when the package is packed and ready for Bosta pickup.
 *
 * Body: {
 *   orderId: string
 *   packageWeight?: number     (kg, default 1)
 *   packageDescription?: string
 *   pickupDate?: string        (ISO date string, leave undefined for ASAP)
 * }
 *
 * Flow:
 *  1. Auth — must be an authenticated vendor
 *  2. Validate order belongs to this vendor (order_items.vendor_id)
 *  3. Ensure order status is 'paid' (not yet shipped)
 *  4. Build pickup address from vendor profile
 *  5. Build drop-off address from order delivery fields
 *  6. Call createShipment() → Bosta API
 *  7. Persist bosta_shipment_id, tracking_number, status = 'processing'
 *  8. Notify buyer
 *  9. Return tracking info
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createShipment } from "@/services/bostaService";
import type { BostaAddress } from "@/services/bostaService";

// ── Service-role client for privileged writes ─────────────────────────────────
function adminSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // 1. Auth — get calling user
  const cookieSupabase = await createCookieClient();
  const {
    data: { user },
  } = await cookieSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    orderId: string;
    packageWeight?: number;
    packageDescription?: string;
    pickupDate?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, packageWeight, packageDescription, pickupDate } = body;
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const supabase = adminSupabase();

  // 3. Fetch the vendor record for this user
  const { data: vendor, error: vendorErr } = await supabase
    .from("vendors")
    .select(
      "id, user_id, business_name, phone, address, city, vendor_type, status, bosta_pickup_address_id",
    )
    .eq("user_id", user.id)
    .eq("vendor_type", "parts_seller")
    .eq("status", "approved")
    .single();

  if (vendorErr || !vendor) {
    return NextResponse.json(
      { error: "Vendor profile not found or not approved" },
      { status: 403 },
    );
  }

  // Ensure the vendor has registered a Bosta pickup address
  if (!vendor.bosta_pickup_address_id) {
    return NextResponse.json(
      {
        error:
          'Pickup address not registered with Bosta. Go to Vendor Settings → Pickup Address and click "Register with Bosta".',
      },
      { status: 409 },
    );
  }

  // 4. Fetch order — verify it contains this vendor's items + is in 'paid' status
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      `id, user_id, status, total_amount, discount,
       delivery_name, delivery_phone, delivery_address, delivery_city,
       order_items!inner(id, vendor_id, unit_price, quantity, name)`,
    )
    .eq("id", orderId)
    .eq("order_items.vendor_id", vendor.id)
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: "Order not found or does not contain your items" },
      { status: 404 },
    );
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      {
        error: `Order cannot be shipped in status '${order.status}'. Must be 'paid'.`,
      },
      { status: 409 },
    );
  }

  // 5. Build Bosta dropoff address (customer)
  const dropoffAddress: BostaAddress = {
    firstLine: order.delivery_address ?? "Delivery address not set",
    city: order.delivery_city ?? "Cairo",
  };

  // 6. Calculate total items for this vendor
  const items = (order.order_items ?? []) as {
    id: string;
    vendor_id: string;
    unit_price: number;
    quantity: number;
    name: string;
  }[];
  const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const descriptionFallback = items
    .slice(0, 3)
    .map((i) => i.name)
    .join(", ");

  // 7. Call Bosta API — pass the vendor's registered Bosta pickup location ID
  const result = await createShipment({
    orderId,
    dropoff: {
      address: dropoffAddress,
      contact: {
        name: order.delivery_name,
        phone: order.delivery_phone,
      },
    },
    pkg: {
      itemsCount,
      cod: 0, // pre-paid orders — no COD
      description: packageDescription ?? descriptionFallback,
    },
    businessLocationId: vendor.bosta_pickup_address_id,
    ...(pickupDate ? { pickupDate } : {}),
  });

  if (result.error) {
    console.error("[ship order] Bosta createShipment failed:", result.error);
    return NextResponse.json(
      { error: `Bosta error: ${result.error}` },
      { status: 502 },
    );
  }

  // 8. Update order in DB
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "processing",
      bosta_shipment_id: result.shipmentId,
      tracking_number: result.trackingNumber,
      bosta_state_code: "10",
    })
    .eq("id", orderId);

  if (updateErr) {
    console.error("[ship order] DB update failed:", updateErr.message);
    // Shipment was already created in Bosta — still return success so vendor knows
  }

  // 9. Notify buyer
  await supabase.from("notifications").insert({
    user_id: order.user_id,
    type: "order_processing",
    title: "Your Order is Being Prepared 📦",
    body: `Order #${orderId.slice(0, 8).toUpperCase()} is being packed. Tracking: ${result.trackingNumber}`,
    link: result.trackingUrl,
    is_read: false,
  });

  return NextResponse.json({
    ok: true,
    trackingNumber: result.trackingNumber,
    trackingUrl: result.trackingUrl,
    bostaShipmentId: result.shipmentId,
  });
}
