/**
 * branchManagerService — Branch-level user assignment and permission checks.
 *
 * Design rules
 * ────────────
 * • Users are created independently — no invitation system.
 * • Owners assign *existing* users to branches by email.
 * • One user may be assigned to multiple branches.
 * • One branch may have multiple managers.
 * • Billing, payments, and business settings are owner-only.
 * • NEVER trust a frontend-supplied role; always verify in the backend.
 */

import { createClient } from "@/lib/supabase/client";
import type { DbBranchUser, BranchUserRole } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssignManagerResult {
  data: DbBranchUser | null;
  error: string | null;
}

export interface BranchManagerRecord extends DbBranchUser {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// ── Assignment ────────────────────────────────────────────────────────────────

/**
 * Assign an existing user as manager of a branch.
 *
 * Steps
 * 1. Normalise email (trim + lowercase).
 * 2. Validate that `ownerId` owns the branch's vendor.
 * 3. Verify the target user exists.
 * 4. Reject duplicate assignments.
 * 5. Insert the branch_users row.
 *
 * All ownership / existence checks are done here (server-side) and are also
 * backed by Supabase RLS so neither layer can be bypassed independently.
 */
export async function assignManager(
  ownerId: string,
  branchId: string,
  email: string,
): Promise<AssignManagerResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // 1 — Normalise
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { data: null, error: "Email is required" };

  // 2 — Validate branch ownership
  const { data: branch, error: branchErr } = await supabase
    .from("vendor_branches")
    .select("id, vendor_id, vendors(user_id)")
    .eq("id", branchId)
    .single();

  if (branchErr || !branch) {
    return { data: null, error: "Branch not found" };
  }

  const vendorOwnerId: string = branch.vendors?.user_id ?? null;
  if (vendorOwnerId !== ownerId) {
    return { data: null, error: "Branch not owned by user" };
  }

  // 3 — Check user existence via security-definer RPC (bypasses RLS on users table)
  const { data: userRows, error: userErr } = await supabase.rpc(
    "find_user_by_email",
    { p_email: normalizedEmail },
  );

  if (userErr) return { data: null, error: userErr.message };
  const targetUser = Array.isArray(userRows)
    ? (userRows[0] ?? null)
    : (userRows ?? null);
  if (!targetUser) return { data: null, error: "User does not exist" };

  // 4 — Check duplicate assignment
  const { data: existing } = await supabase
    .from("branch_users")
    .select("user_id")
    .eq("user_id", targetUser.id)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (existing) {
    return { data: null, error: "User already assigned to this branch" };
  }

  // 5 — Insert
  const { data: record, error: insertErr } = await supabase
    .from("branch_users")
    .insert({
      user_id: targetUser.id,
      branch_id: branchId,
      role: "manager" as BranchUserRole,
      assigned_by: ownerId,
    })
    .select("*, user:users!user_id(id, email, full_name, avatar_url)")
    .single();

  if (insertErr) return { data: null, error: insertErr.message };
  return { data: record as DbBranchUser, error: null };
}

/**
 * Remove a manager from a branch.
 * Only the vendor owner (or admin) may remove assignments.
 */
export async function removeManager(
  ownerId: string,
  branchId: string,
  userId: string,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // Verify ownership
  const { data: branch } = await supabase
    .from("vendor_branches")
    .select("id, vendors(user_id)")
    .eq("id", branchId)
    .single();

  if (!branch || branch.vendors?.user_id !== ownerId) {
    return { error: "Unauthorized access" };
  }

  const { error } = await supabase
    .from("branch_users")
    .delete()
    .eq("user_id", userId)
    .eq("branch_id", branchId);

  return { error: error?.message ?? null };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Get all managers assigned to a specific branch.
 * Caller must be the vendor owner or an admin.
 */
export async function getBranchManagers(
  branchId: string,
): Promise<BranchManagerRecord[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("branch_users")
    .select("*, user:users!user_id(id, email, full_name, avatar_url)")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });

  return (data ?? []) as BranchManagerRecord[];
}

/**
 * Get all branches a user is assigned to (any role).
 */
export async function getAssignedBranches(
  userId: string,
): Promise<DbBranchUser[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("branch_users")
    .select("*, branch:vendor_branches(id, name, name_ar, vendor_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data ?? []) as DbBranchUser[];
}

// ── Permission checks ─────────────────────────────────────────────────────────

/**
 * Returns whether `userId` has any access (owner or manager) to `branchId`.
 * Used by server-side guards; the same logic is enforced by Supabase RLS
 * via `can_access_branch()`.
 */
export async function canAccessBranch(
  userId: string,
  branchId: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // Direct manager assignment?
  const { data: assignment } = await supabase
    .from("branch_users")
    .select("user_id")
    .eq("user_id", userId)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (assignment) return true;

  // Vendor owner?
  const { data: ownerBranch } = await supabase
    .from("vendor_branches")
    .select("id, vendors!inner(user_id)")
    .eq("id", branchId)
    .eq("vendors.user_id", userId)
    .maybeSingle();

  return !!ownerBranch;
}

/**
 * Ensures `userId` is the owner of the vendor that owns `branchId`.
 * Returns an error string if not authorised, null if OK.
 */
export async function assertBranchOwner(
  userId: string,
  branchId: string,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data } = await supabase
    .from("vendor_branches")
    .select("id, vendors(user_id)")
    .eq("id", branchId)
    .single();

  if (!data) return "Branch not found";
  if (data.vendors?.user_id !== userId) return "Unauthorized access";
  return null;
}

/**
 * Scope bookings to branches the user has access to.
 *
 * If the user is a vendor owner, returns null (→ caller uses vendor_id filter).
 * Otherwise returns the list of branch IDs the user is assigned to.
 */
export async function getScopedBranchIds(
  userId: string,
  vendorId: string,
): Promise<string[] | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // Is the user the vendor owner?
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("id", vendorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (vendor) return null; // owner → no branch restriction

  // Return only the branches this manager is assigned to
  const { data: rows } = await supabase
    .from("branch_users")
    .select("branch_id")
    .eq("user_id", userId);

  return ((rows ?? []) as { branch_id: string }[]).map((r) => r.branch_id);
}
