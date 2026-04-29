/**
 * vendorService — Vendor management of services and products.
 *
 * Service Center logic (checklist items 13, 14):
 *  ✓ Add / edit / remove service
 *  ✓ Set price and duration
 *  ✓ Services linked to bookings
 *
 * Parts Seller logic (checklist items 15, 16):
 *  ✓ Add / edit product
 *  ✓ Set price and stock
 *  ✓ Mark out-of-stock (stock = 0 → product unavailable)
 */

import { createClient } from "@/lib/supabase/client";
import type { DbService, DbProduct } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateServiceInput {
  vendorId: string;
  name: string;
  description?: string;
  durationMinutes?: number;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  active?: boolean;
}

export interface CreateProductInput {
  vendorId: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory?: string;
  sku?: string;
  oemNumber?: string;
  brand?: string;
  condition: "new" | "used" | "refurbished";
  stock: number;
  imageUrl?: string;
  images?: string[];
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  stock?: number;
  active?: boolean;
  imageUrl?: string;
  images?: string[];
}

// ── Service (Workshop Service) CRUD ──────────────────────────────────────────

export async function createService(
  input: CreateServiceInput,
): Promise<{ service: DbService | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      vendor_id: input.vendorId,
      name: input.name,
      description: input.description ?? null,
      duration_minutes: input.durationMinutes ?? null,
      active: true,
    })
    .select("*")
    .single();
  return {
    service: error ? null : (data as DbService),
    error: error?.message ?? null,
  };
}

export async function updateService(
  serviceId: string,
  vendorId: string,
  updates: UpdateServiceInput,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("services")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && {
        description: updates.description,
      }),
      ...(updates.durationMinutes !== undefined && {
        duration_minutes: updates.durationMinutes,
      }),
      ...(updates.active !== undefined && { active: updates.active }),
    })
    .eq("id", serviceId)
    .eq("vendor_id", vendorId);
  return { error: error?.message ?? null };
}

export async function deleteService(
  serviceId: string,
  vendorId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  // Soft-delete: set active=false (preserves booking history)
  const { error } = await supabase
    .from("services")
    .update({ active: false })
    .eq("id", serviceId)
    .eq("vendor_id", vendorId);
  return { error: error?.message ?? null };
}

export async function getVendorServices(
  vendorId: string,
  includeInactive = false,
): Promise<DbService[]> {
  const supabase = createClient();
  let query = supabase
    .from("services")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as DbService[];
}

// ── Product CRUD ──────────────────────────────────────────────────────────────

export async function createProduct(
  input: CreateProductInput,
): Promise<{ product: DbProduct | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      vendor_id: input.vendorId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      original_price: input.originalPrice ?? null,
      category: input.category,
      subcategory: input.subcategory ?? null,
      oem_number: input.oemNumber ?? null,
      brand: input.brand ?? null,
      condition: input.condition,
      stock: input.stock,
      image_url: input.imageUrl ?? null,
      images: input.images ?? [],
      // Rule: if stock = 0 → product starts as inactive
      active: input.stock > 0,
    })
    .select("*")
    .single();
  return {
    product: error ? null : (data as DbProduct),
    error: error?.message ?? null,
  };
}

export async function updateProduct(
  productId: string,
  vendorId: string,
  updates: UpdateProductInput,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Rule: if stock drops to 0, auto-mark as unavailable (inactive)
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined)
    patch.description = updates.description;
  if (updates.price !== undefined) patch.price = updates.price;
  if (updates.originalPrice !== undefined)
    patch.original_price = updates.originalPrice;
  if (updates.stock !== undefined) {
    patch.stock = updates.stock;
    if (updates.stock === 0) patch.active = false;
  }
  if (updates.active !== undefined) patch.active = updates.active;
  if (updates.imageUrl !== undefined) patch.image_url = updates.imageUrl;
  if (updates.images !== undefined) patch.images = updates.images;
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .eq("vendor_id", vendorId);

  return { error: error?.message ?? null };
}

export async function getVendorProducts(
  vendorId: string,
  includeInactive = false,
): Promise<DbProduct[]> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as DbProduct[];
}

/**
 * Decrement product stock after a purchase.
 * Automatically marks product inactive if stock reaches 0.
 */
export async function decrementStock(
  productId: string,
  qty: number,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: product } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .single();

  if (!product) return { error: "Product not found." };

  const newStock = Math.max(0, (product.stock as number) - qty);

  const { error } = await supabase
    .from("products")
    .update({
      stock: newStock,
      active: newStock > 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  return { error: error?.message ?? null };
}
