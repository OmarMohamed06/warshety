/**
 * Supabase order service — saves a checkout order to the DB.
 * Called from the checkout page on successful payment step.
 */

import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/context/CartContext";

// ─────────────────────────────────────────────────────────────────────────────
// Vendor-facing order types
// ─────────────────────────────────────────────────────────────────────────────

export interface VendorOrderItem {
  id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
}

export interface VendorOrder {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  shipping_fee: number;
  discount: number;
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  delivery_city: string;
  payment_method: string;
  notes: string | null;
  bosta_shipment_id: string | null;
  tracking_number: string | null;
  bosta_state_code: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  delivery_attempts: number;
  created_at: string;
  order_items: VendorOrderItem[];
}

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
  /** Idempotency key — prevents duplicate orders on retry / double-submit */
  idempotencyKey: string;
}

export async function saveOrder(
  data: CheckoutData,
  items: CartItem[],
): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = createClient();

  // 1. Insert order — on idempotency key conflict return the existing order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: data.userId!,
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
      idempotency_key: data.idempotencyKey,
    })
    .select("id")
    .single();

  // Unique-constraint violation on idempotency_key means the order already
  // exists — look it up and return its id as a success.
  if (orderError?.code === "23505") {
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("idempotency_key", data.idempotencyKey)
      .single();
    if (existing) return { orderId: existing.id, error: null };
  }

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
    vendor_id: null,
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

// ─────────────────────────────────────────────────────────────────────────────
// Vendor order queries (client-side, respects RLS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all orders that contain at least one item belonging to this vendor.
 * Optionally filter by order status.
 */
export async function getVendorOrders(
  vendorId: string,
  status?: string,
): Promise<{ data: VendorOrder[]; error: string | null }> {
  const supabase = createClient();

  let query = supabase
    .from("orders")
    .select(
      `id, user_id, status, total_amount, shipping_fee, discount,
       delivery_name, delivery_phone, delivery_address, delivery_city,
       payment_method, notes,
       bosta_shipment_id, tracking_number, bosta_state_code,
       shipped_at, delivered_at, delivery_attempts,
       created_at,
       order_items!inner(id, product_id, name, sku, quantity, unit_price)`,
    )
    .eq("order_items.vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq(
      "status",
      status as import("@/types/database").OrderStatus,
    );
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as unknown as VendorOrder[], error: null };
}

/**
 * Fetch a single order by ID, scoped to vendor items.
 */
export async function getVendorOrder(
  orderId: string,
  vendorId: string,
): Promise<{ data: VendorOrder | null; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, user_id, status, total_amount, shipping_fee, discount,
       delivery_name, delivery_phone, delivery_address, delivery_city,
       payment_method, notes,
       bosta_shipment_id, tracking_number, bosta_state_code,
       shipped_at, delivered_at, delivery_attempts,
       created_at,
       order_items!inner(id, product_id, name, sku, quantity, unit_price)`,
    )
    .eq("id", orderId)
    .eq("order_items.vendor_id", vendorId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as unknown as VendorOrder, error: null };
}
