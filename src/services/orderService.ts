/**
 * Supabase order service — saves a checkout order to the DB.
 * Called from the checkout page on successful payment step.
 */

import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/context/CartContext";

export interface CheckoutData {
  userId: string | null;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  promoCode: string | null;
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  paymentMethod: string;
  notes: string | null;
}

export async function saveOrder(
  data: CheckoutData,
  items: CartItem[],
): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = createClient();

  // 1. Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: data.userId ?? "",
      status: "pending" as const,
      total_amount: data.total,
      shipping_fee: data.shippingFee,
      discount: data.discount,
      promo_code: data.promoCode,
      delivery_name: data.deliveryName,
      delivery_phone: data.deliveryPhone,
      delivery_address: data.deliveryAddress,
      delivery_city: data.deliveryCity,
      payment_method: data.paymentMethod,
      notes: data.notes,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return {
      orderId: null,
      error: orderError?.message ?? "Failed to create order.",
    };
  }

  // 2. Insert order items
  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: null,
    vendor_id: item.vendorId ?? null,
    name: item.name,
    sku: item.sku ?? null,
    quantity: item.qty,
    unit_price: item.price,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    return { orderId: order.id, error: itemsError.message };
  }

  return { orderId: order.id, error: null };
}
