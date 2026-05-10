/**
 * rewardsService — All rewards & redemption logic.
 *
 * Security rules:
 *  - Points deducted and user_rewards row created atomically
 *  - Code uniqueness enforced by DB UNIQUE constraint
 *  - is_used checked server-side only — never trust client
 *  - All actions logged in points_transactions
 */

import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RewardCategory =
  | "wash"
  | "detailing"
  | "protection"
  | "inspection"
  | "parts"
  | "other";

export type RewardType = "service_reward" | "parts_reward";

export interface DbReward {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  points_required: number;
  category: RewardCategory;
  type: RewardType;
  image_url: string | null;
  value: number | null;
  value_type: "fixed" | "percent";
  is_active: boolean;
  created_at: string;
}

export interface DbUserReward {
  id: string;
  user_id: string;
  reward_id: string;
  code: string;
  qr_data: string | null;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
  reward?: DbReward;
}

export interface DbPointsTransaction {
  id: string;
  user_id: string;
  points: number;
  type:
    | "booking_reward"
    | "redeem_service"
    | "redeem_parts"
    | "admin_adjustment";
  reference_id: string | null;
  note: string | null;
  created_at: string;
}

export interface RedeemResult {
  success: boolean;
  userReward?: DbUserReward;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a unique alphanumeric code */
function generateCode(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

// ── Service functions ─────────────────────────────────────────────────────────

/** Fetch all active rewards for the catalogue */
export async function getRewards(): Promise<{
  rewards: DbReward[];
  error: string | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("rewards")
    .select("*")
    .eq("is_active", true)
    .order("points_required", { ascending: true });

  return { rewards: (data as DbReward[]) ?? [], error: error?.message ?? null };
}

/** Fetch user's current points balance */
export async function getUserPoints(userId: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", userId)
    .single();
  return (data as { total_points: number } | null)?.total_points ?? 0;
}

/** Fetch user's points transaction history */
export async function getPointsHistory(userId: string): Promise<{
  transactions: DbPointsTransaction[];
  error: string | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("points_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    transactions: (data as DbPointsTransaction[]) ?? [],
    error: error?.message ?? null,
  };
}

/** Fetch user's redeemed vouchers */
export async function getUserVouchers(userId: string): Promise<{
  vouchers: DbUserReward[];
  error: string | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_rewards")
    .select("*, reward:rewards(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return {
    vouchers: (data as DbUserReward[]) ?? [],
    error: error?.message ?? null,
  };
}

/**
 * Redeem a reward for the current user.
 * - Validates points server-side via API route (never client-side only)
 * - Returns the created user_reward with code and qr_data
 */
export async function redeemReward(
  userId: string,
  rewardId: string,
): Promise<RedeemResult> {
  const response = await fetch("/api/rewards/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, rewardId }),
  });
  const json = await response.json();
  if (!response.ok) {
    return { success: false, error: json.error ?? "Failed to redeem reward" };
  }
  return { success: true, userReward: json.userReward };
}

/**
 * Vendor-side: validate and mark a code as used.
 * Called by vendor scanning QR or typing code manually.
 */
export async function useRewardCode(code: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const response = await fetch("/api/rewards/use", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const json = await response.json();
  return response.ok
    ? { success: true }
    : { success: false, error: json.error };
}

/**
 * Apply a parts promo code at checkout.
 * Returns discount info if valid, error if used/invalid.
 */
export async function applyPromoCode(code: string): Promise<{
  success: boolean;
  value?: number;
  valueType?: "fixed" | "percent";
  userRewardId?: string;
  error?: string;
}> {
  const response = await fetch("/api/rewards/promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const json = await response.json();
  return response.ok ? json : { success: false, error: json.error };
}

export { generateCode };
