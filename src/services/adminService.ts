/**
 * adminService — Admin control logic.
 *
 * Admin can:
 *  ✓ Approve vendors
 *  ✓ Suspend vendors
 *  ✓ Remove fake/inappropriate reviews
 *  ✓ Manage categories (add / remove / toggle)
 *  ✓ View platform metrics (users, vendors, bookings, orders, revenue)
 */

import { createClient as _createClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = () => _createClient() as any;
import type { VendorStatus } from "@/types/database";
import {
  notifyVendorApproved,
  notifyVendorRejected,
} from "./notificationService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlatformMetrics {
  totalUsers: number;
  totalVendors: number;
  pendingVendors: number;
  totalBookings: number;
  completedBookings: number;
  totalOrders: number;
  totalRevenue: number;
}

// ── Vendor management ─────────────────────────────────────────────────────────

/**
 * Approve a vendor application.
 */
export async function approveVendor(
  vendorId: string,
  adminId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("user_id")
    .eq("id", vendorId)
    .single();

  const { error } = await supabase
    .from("vendors")
    .update({ status: "approved" as VendorStatus })
    .eq("id", vendorId);

  if (!error && vendor) {
    await notifyVendorApproved(vendor.user_id as string);
  }

  return { error: error?.message ?? null };
}

/**
 * Reject a vendor application.
 */
export async function rejectVendor(
  vendorId: string,
  adminId: string,
  reason?: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("user_id")
    .eq("id", vendorId)
    .single();

  const { error } = await supabase
    .from("vendors")
    .update({ status: "rejected" as VendorStatus })
    .eq("id", vendorId);

  if (!error && vendor) {
    await notifyVendorRejected(vendor.user_id as string, reason);
  }

  return { error: error?.message ?? null };
}

/**
 * Suspend a vendor (e.g. policy violation).
 */
export async function suspendVendor(
  vendorId: string,
  adminId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vendors")
    .update({ status: "suspended" as VendorStatus })
    .eq("id", vendorId);
  return { error: error?.message ?? null };
}

/**
 * Re-activate a suspended vendor.
 */
export async function reinstateVendor(
  vendorId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vendors")
    .update({ status: "approved" as VendorStatus })
    .eq("id", vendorId);
  return { error: error?.message ?? null };
}

/**
 * Get all vendors with optional status filter.
 */
export async function getAllVendors(statusFilter?: VendorStatus) {
  const supabase = createClient();
  let query = supabase
    .from("vendors")
    .select("*, user:users(email, full_name)")
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  return { vendors: data ?? [], error: error?.message ?? null };
}

// ── Review moderation ─────────────────────────────────────────────────────────

/**
 * Remove a review (admin moderation — fake, spam, abusive).
 * Recalculates vendor average rating after removal.
 */
export async function removeReview(
  reviewId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: review } = await supabase
    .from("reviews")
    .select("vendor_id, rating")
    .eq("id", reviewId)
    .single();

  if (!review) return { error: "Review not found." };

  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);

  if (!error) {
    // Recalculate average
    const { data: remaining } = await supabase
      .from("reviews")
      .select("rating")
      .eq("vendor_id", review.vendor_id);

    const count = remaining?.length ?? 0;
    const avg =
      count > 0
        ? remaining!.reduce(
            (s: number, r: { rating: number }) => s + r.rating,
            0,
          ) / count
        : 0;

    await supabase
      .from("vendors")
      .update({
        rating: Math.round(avg * 10) / 10,
        total_reviews: count,
      })
      .eq("id", review.vendor_id);
  }

  return { error: error?.message ?? null };
}

// ── Platform metrics ──────────────────────────────────────────────────────────

/**
 * Fetch platform-wide metrics for the admin dashboard.
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = createClient();

  const [
    { count: totalUsers },
    { count: totalVendors },
    { count: pendingVendors },
    { count: totalBookings },
    { count: completedBookings },
    { count: totalOrders },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("total_amount")
      .in("status", ["paid", "shipped", "completed"]),
  ]);

  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, o: { total_amount: number }) => sum + (o.total_amount ?? 0),
    0,
  );

  return {
    totalUsers: totalUsers ?? 0,
    totalVendors: totalVendors ?? 0,
    pendingVendors: pendingVendors ?? 0,
    totalBookings: totalBookings ?? 0,
    completedBookings: completedBookings ?? 0,
    totalOrders: totalOrders ?? 0,
    totalRevenue,
  };
}
