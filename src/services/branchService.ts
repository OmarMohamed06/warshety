/**
 * branchService — CRUD operations for vendor branches.
 *
 * Each service-center vendor may have one or more physical branches.
 * Services, calendar slots, and bookings are all scoped to a branch.
 */

import { createClient } from "@/lib/supabase/client";
import type { DbBranch } from "@/types/database";
import {
  DEFAULT_WORKING_HOURS,
  type WorkingHours,
} from "./availabilityService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BranchFormData = {
  name: string;
  name_ar?: string;
  address?: string;
  city?: string;
  city_ar?: string;
  governorate?: string;
  phone?: string;
  status?: "active" | "inactive";
  is_main?: boolean;
  maps_link?: string | null;
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all branches for a vendor, main branch first.
 */
export async function getBranches(vendorId: string): Promise<DbBranch[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("vendor_branches")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("is_main", { ascending: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as DbBranch[];
}

/**
 * Fetch a single branch by ID.
 */
export async function getBranch(branchId: string): Promise<DbBranch | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("vendor_branches")
    .select("*")
    .eq("id", branchId)
    .single();
  return (data ?? null) as DbBranch | null;
}

/**
 * Create a new branch and seed it with default working hours.
 */
export async function createBranch(
  vendorId: string,
  formData: BranchFormData,
): Promise<{ branch: DbBranch | null; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data: branch, error } = await supabase
    .from("vendor_branches")
    .insert({ ...formData, vendor_id: vendorId })
    .select()
    .single();

  if (error || !branch)
    return { branch: null, error: error?.message ?? "Failed to create branch" };

  // Seed default working hours for the new branch
  const defaultHours = DEFAULT_WORKING_HOURS.map((h: WorkingHours) => ({
    branch_id: branch.id,
    day_of_week: h.dayOfWeek,
    open_time: `${h.open}:00`,
    close_time: `${h.close}:00`,
    is_open: h.isOpen,
  }));
  await supabase.from("branch_working_hours").insert(defaultHours);

  return { branch: branch as DbBranch, error: null };
}

/**
 * Update branch metadata.
 */
export async function updateBranch(
  branchId: string,
  formData: Partial<BranchFormData>,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { error } = await supabase
    .from("vendor_branches")
    .update(formData)
    .eq("id", branchId);
  return { error: error?.message ?? null };
}

/**
 * Delete a branch (cascades to its services, working hours, slot overrides).
 */
export async function deleteBranch(
  branchId: string,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { error } = await supabase
    .from("vendor_branches")
    .delete()
    .eq("id", branchId);
  return { error: error?.message ?? null };
}

// ── Working Hours ─────────────────────────────────────────────────────────────

/**
 * Get working hours for a branch. Falls back to DEFAULT_WORKING_HOURS.
 */
export async function getBranchWorkingHours(
  branchId: string,
): Promise<WorkingHours[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("branch_working_hours")
    .select("*")
    .eq("branch_id", branchId)
    .order("day_of_week");

  if (!data || data.length === 0) return DEFAULT_WORKING_HOURS;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    dayOfWeek: row.day_of_week as number,
    open: (row.open_time as string).slice(0, 5),
    close: (row.close_time as string).slice(0, 5),
    isOpen: row.is_open as boolean,
  }));
}

/**
 * Ensure a main branch record exists for this vendor.
 * If none exists, creates one named after the business.
 * Returns the main branch ID.
 */
export async function getOrCreateMainBranch(
  vendorId: string,
  vendorName: string,
): Promise<{ id: string | null; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // Try to find existing main branch
  const { data: existing } = await supabase
    .from("vendor_branches")
    .select("id")
    .eq("vendor_id", vendorId)
    .eq("is_main", true)
    .maybeSingle();

  if (existing?.id) return { id: existing.id, error: null };

  // Create one
  const { data: created, error } = await supabase
    .from("vendor_branches")
    .insert({
      vendor_id: vendorId,
      name: vendorName,
      is_main: true,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !created)
    return {
      id: null,
      error: error?.message ?? "Failed to create main branch",
    };
  return { id: created.id, error: null };
}

/**
 * Save (upsert) working hours for a branch.
 */
export async function saveBranchWorkingHours(
  branchId: string,
  hours: WorkingHours[],
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const rows = hours.map((h) => ({
    branch_id: branchId,
    day_of_week: h.dayOfWeek,
    open_time: `${h.open}:00`,
    close_time: `${h.close}:00`,
    is_open: h.isOpen,
  }));
  const { error } = await supabase
    .from("branch_working_hours")
    .upsert(rows, { onConflict: "branch_id,day_of_week" });
  return { error: error?.message ?? null };
}
