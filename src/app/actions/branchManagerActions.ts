"use server";

/**
 * branchManagerActions — Secure server actions for branch manager assignment.
 *
 * All ownership/existence checks are performed server-side.
 * The frontend MUST NOT pass or trust a role field.
 *
 * These actions use the regular server Supabase client (session-scoped),
 * so Supabase RLS provides a second layer of enforcement automatically.
 */

import { createClient } from "@/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionResult<T = null> {
  data: T | null;
  error: string | null;
}

interface ManagerRow {
  user_id: string;
  branch_id: string;
  role: "owner" | "manager";
  assigned_by: string | null;
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get the authenticated user id or return an error. */
async function getAuthUserId(): Promise<{
  userId: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, error: "Not authenticated" };
  return { userId: user.id, error: null };
}

/** Verify the authenticated user owns the vendor that owns `branchId`. */
async function assertOwnership(
  userId: string,
  branchId: string,
): Promise<{ vendorOwnerId: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data: branch, error } = await (supabase as any)
    .from("vendor_branches")
    .select("id, vendor_id, vendors(user_id)")
    .eq("id", branchId)
    .single();

  if (error || !branch)
    return { vendorOwnerId: null, error: "Branch not found" };

  const vendorOwnerId: string = branch.vendors?.user_id ?? "";
  if (vendorOwnerId !== userId) {
    return { vendorOwnerId: null, error: "Branch not owned by user" };
  }

  return { vendorOwnerId, error: null };
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Assign an existing user as branch manager.
 *
 * @param branchId  Target branch UUID
 * @param email     Email of the user to assign (must already have an account)
 */
export async function assignBranchManager(
  branchId: string,
  email: string,
): Promise<ActionResult<ManagerRow>> {
  // 1 — Auth
  const { userId, error: authErr } = await getAuthUserId();
  if (!userId) return { data: null, error: authErr };

  // 2 — Normalise email
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { data: null, error: "Email is required" };

  // 3 — Validate ownership
  const { error: ownerErr } = await assertOwnership(userId, branchId);
  if (ownerErr) return { data: null, error: ownerErr };

  const supabase = await createClient();

  // 4 — Check user existence via security-definer RPC (bypasses RLS on users table
  //     which only allows each user to read their own row).
  const { data: userRows, error: userErr } = await (supabase as any).rpc(
    "find_user_by_email",
    { p_email: normalizedEmail },
  );

  if (userErr) return { data: null, error: userErr.message };
  const targetUser = Array.isArray(userRows)
    ? (userRows[0] ?? null)
    : (userRows ?? null);
  if (!targetUser) return { data: null, error: "User does not exist" };

  // 5 — Prevent duplicate assignment
  const { data: existing } = await (supabase as any)
    .from("branch_users")
    .select("user_id")
    .eq("user_id", targetUser.id)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (existing)
    return { data: null, error: "User already assigned to this branch" };

  // 6 — Insert (plain, no join — user data already in targetUser)
  const { error: insertErr } = await (supabase as any)
    .from("branch_users")
    .insert({
      user_id: targetUser.id,
      branch_id: branchId,
      role: "manager",
      assigned_by: userId,
    });

  if (insertErr) return { data: null, error: insertErr.message };

  // 7 — Flip the user's role to 'manager' so AuthContext can detect it simply
  await supabase
    .from("users")
    .update({ role: "manager" as any })
    .eq("id", targetUser.id);

  // Build the ManagerRow from data we already have (avoids the RLS join issue)
  const row: ManagerRow = {
    user_id: targetUser.id,
    branch_id: branchId,
    role: "manager",
    assigned_by: userId,
    created_at: new Date().toISOString(),
    user: {
      id: targetUser.id,
      email: targetUser.email,
      full_name: targetUser.full_name ?? null,
      avatar_url: targetUser.avatar_url ?? null,
    },
  };

  return { data: row, error: null };
}

/**
 * Remove a manager assignment from a branch.
 *
 * @param branchId  Branch UUID
 * @param userId    User ID to remove
 */
export async function removeBranchManager(
  branchId: string,
  userId: string,
): Promise<ActionResult> {
  // 1 — Auth
  const { userId: callerId, error: authErr } = await getAuthUserId();
  if (!callerId) return { data: null, error: authErr };

  // 2 — Validate ownership
  const { error: ownerErr } = await assertOwnership(callerId, branchId);
  if (ownerErr) return { data: null, error: ownerErr };

  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("branch_users")
    .delete()
    .eq("user_id", userId)
    .eq("branch_id", branchId);

  if (!error) {
    // Check if user is still assigned to any other branch — if not, revert to customer
    const { data: remaining } = await (supabase as any)
      .from("branch_users")
      .select("branch_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!remaining) {
      await supabase
        .from("users")
        .update({ role: "customer" as any })
        .eq("id", userId);
    }
  }

  return { data: null, error: error?.message ?? null };
}

/**
 * List all managers assigned to a branch.
 * Caller must be the vendor owner.
 *
 * @param branchId  Branch UUID
 */
export async function getBranchManagersList(
  branchId: string,
): Promise<ActionResult<ManagerRow[]>> {
  // 1 — Auth
  const { userId, error: authErr } = await getAuthUserId();
  if (!userId) return { data: null, error: authErr };

  // 2 — Validate ownership
  const { error: ownerErr } = await assertOwnership(userId, branchId);
  if (ownerErr) return { data: null, error: ownerErr };

  const supabase = await createClient();

  // Use security-definer RPC so user profile fields are readable
  // even though RLS on public.users only allows reading own row.
  const { data, error } = await (supabase as any).rpc("get_branch_managers", {
    p_branch_id: branchId,
  });

  if (error) return { data: null, error: error.message };

  // Reshape flat RPC rows into the ManagerRow shape the UI expects
  const rows: ManagerRow[] = ((data as any[]) ?? []).map((r) => ({
    user_id: r.user_id,
    branch_id: r.branch_id,
    role: r.role,
    assigned_by: r.assigned_by,
    created_at: r.created_at,
    user: {
      id: r.user_id,
      email: r.email,
      full_name: r.full_name,
      avatar_url: r.avatar_url,
    },
  }));

  return { data: rows, error: null };
}

/**
 * Get all branches assigned to the currently authenticated user.
 * Used to scope dashboard access for managers.
 */
export async function getMyAssignedBranches(): Promise<
  ActionResult<
    {
      branch_id: string;
      role: string;
      branch: {
        id: string;
        name: string;
        name_ar: string | null;
        vendor_id: string;
      } | null;
    }[]
  >
> {
  const { userId, error: authErr } = await getAuthUserId();
  if (!userId) return { data: null, error: authErr };

  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("branch_users")
    .select(
      "branch_id, role, branch:vendor_branches(id, name, name_ar, vendor_id)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Permission gate: check that the current user can access a specific branch.
 * Returns error: null if allowed, error string if denied.
 *
 * Used by manager-facing API routes / server components to enforce
 * branch-scoped access without trusting the frontend.
 */
export async function assertBranchAccess(
  branchId: string,
): Promise<{ error: string | null }> {
  const { userId, error: authErr } = await getAuthUserId();
  if (!userId) return { error: authErr };

  const supabase = await createClient();

  // Check direct assignment
  const { data: assignment } = await (supabase as any)
    .from("branch_users")
    .select("user_id")
    .eq("user_id", userId)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (assignment) return { error: null };

  // Check vendor owner
  const { data: ownerBranch } = await (supabase as any)
    .from("vendor_branches")
    .select("id, vendors!inner(user_id)")
    .eq("id", branchId)
    .eq("vendors.user_id", userId)
    .maybeSingle();

  if (ownerBranch) return { error: null };

  return { error: "Unauthorized access" };
}

/**
 * Permission gate: check that the current user is the OWNER of the branch.
 * Managers are rejected. Used to protect owner-only operations.
 */
export async function assertBranchOwnerAccess(
  branchId: string,
): Promise<{ error: string | null }> {
  const { userId, error: authErr } = await getAuthUserId();
  if (!userId) return { error: authErr };

  const { error: ownerErr } = await assertOwnership(userId, branchId);
  return { error: ownerErr };
}
