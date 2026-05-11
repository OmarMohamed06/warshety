import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createIntention } from "@/lib/paymob";
import type { CartItem } from "@/context/CartContext";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://warshety.com";
const CARD_INTEGRATION_ID = Number(process.env.PAYMOB_INTEGRATION_ID_CARD);
const WALLET_INTEGRATION_ID = Number(process.env.PAYMOB_INTEGRATION_ID_WALLET);

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // 1. Require authenticated user
  const serverSupabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await serverSupabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    paymentType: "card" | "wallet";
    items: CartItem[];
    delivery: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      city: string;
      governorate: string;
      address: string;
      apartment?: string;
    };
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    promoCode: string | null;
    notes: string | null;
    specialReference: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    paymentType,
    items,
    delivery,
    subtotal,
    shippingFee,
    discount,
    total,
    promoCode,
    notes,
    specialReference,
  } = body;

  if (
    !paymentType ||
    !items?.length ||
    !delivery ||
    !total ||
    !specialReference
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const db = getServiceClient();

  // 3. Pre-save order as "pending" so we have an orderId before payment completes.
  //    The webhook will update it to "paid" on confirmed payment.
  //    idempotency_key prevents duplicate rows on retry.
  const { data: existingOrder } = await db
    .from("orders")
    .select("id")
    .eq("idempotency_key", specialReference)
    .maybeSingle();

  let orderId: string;

  if (existingOrder) {
    orderId = existingOrder.id;
  } else {
    const deliveryAddress = `${delivery.address}${
      delivery.apartment ? ", " + delivery.apartment : ""
    }`;

    const { data: newOrder, error: insertError } = await db
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending" as const,
        total_amount: total,
        shipping_fee: shippingFee,
        discount,
        promo_code: promoCode ?? null,
        delivery_name: `${delivery.firstName} ${delivery.lastName}`.trim(),
        delivery_phone: delivery.phone,
        delivery_address: deliveryAddress,
        delivery_city: `${delivery.city}, ${delivery.governorate}`,
        payment_method: paymentType,
        notes: notes ?? null,
        idempotency_key: specialReference,
      })
      .select("id")
      .single();

    if (insertError || !newOrder) {
      console.error("[Paymob] order pre-save failed:", insertError);
      return NextResponse.json(
        { error: "Failed to initialise order" },
        { status: 500 },
      );
    }

    // Insert order items
    const orderItems = items.map((item) => ({
      order_id: newOrder.id,
      product_id: null,
      vendor_id: null,
      name: item.name,
      sku: item.sku ?? null,
      quantity: item.qty,
      unit_price: item.price,
    }));

    await db.from("order_items").insert(orderItems);

    orderId = newOrder.id;
  }

  // 4. Determine which integration IDs to use
  const integrationIds =
    paymentType === "card" ? [CARD_INTEGRATION_ID] : [WALLET_INTEGRATION_ID];

  // 5. Create Paymob payment intention
  try {
    const { clientSecret } = await createIntention({
      amountCents: Math.round(total * 100),
      currency: "EGP",
      integrationIds,
      billingData: {
        first_name: delivery.firstName,
        last_name: delivery.lastName,
        email: delivery.email,
        phone_number: delivery.phone,
        street:
          delivery.address +
          (delivery.apartment ? `, ${delivery.apartment}` : ""),
        city: delivery.city,
        country: "EG",
        state: delivery.governorate,
      },
      items: items.map((item) => ({
        name: item.name,
        amount: Math.round(item.price * 100),
        quantity: item.qty,
      })),
      // Use orderId (UUID) as the Paymob special_reference so retries
      // for the same order don't conflict on Paymob's side.
      specialReference: orderId,
      notificationUrl: `${APP_URL}/api/payments/webhook`,
      redirectionUrl: `${APP_URL}/en/checkout/payment-result`,
    });

    return NextResponse.json({ clientSecret, orderId });
  } catch (err) {
    console.error("[Paymob] intention error:", err);
    return NextResponse.json(
      { error: "Failed to create payment intention" },
      { status: 502 },
    );
  }
}
