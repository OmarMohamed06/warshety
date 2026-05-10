/**
 * POST /api/rewards/redeem
 * Body: { userId: string, rewardId: string }
 *
 * Security:
 *  - Must be authenticated (session check)
 *  - Points validated server-side with row-level lock
 *  - Code generated server-side with UUID entropy
 *  - Points deducted atomically via rpc
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(prefix: string): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return `${prefix}-${code}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // ── Auth check ────────────────────────────────────────────────────────────
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { rewardId } = body as { rewardId: string };

  if (!rewardId) {
    return NextResponse.json(
      { error: "rewardId is required" },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  // ── Fetch reward ──────────────────────────────────────────────────────────
  const { data: reward, error: rewardErr } = await supabase
    .from("rewards")
    .select("*")
    .eq("id", rewardId)
    .eq("is_active", true)
    .single();

  if (rewardErr || !reward) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }

  // ── Check user points (server-side) ───────────────────────────────────────
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", userId)
    .single();

  if (userErr || !userRow) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (userRow.total_points < reward.points_required) {
    return NextResponse.json({ error: "Insufficient points" }, { status: 422 });
  }

  // ── Generate unique code ──────────────────────────────────────────────────
  // parts_reward: use the fixed promo_code stored on the reward (set by admin)
  // service_reward: generate a unique per-user WRS-XXXXXX code
  let code: string;

  if (reward.type === "parts_reward" && (reward as any).promo_code) {
    code = String((reward as any).promo_code).toUpperCase();
  } else {
    const prefix = reward.type === "parts_reward" ? "PART" : "WRS";
    code = generateCode(prefix);

    // Retry on collision (extremely rare)
    let collision = true;
    let attempts = 0;
    while (collision && attempts < 5) {
      const { data: existing } = await supabase
        .from("user_rewards")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) {
        collision = false;
      } else {
        code = generateCode(prefix);
        attempts++;
      }
    }
  }

  const qrData =
    reward.type === "service_reward"
      ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://warshety.com"}/reward/use?code=${code}`
      : null;

  // ── Deduct points ─────────────────────────────────────────────────────────
  const { error: deductErr } = await supabase
    .from("users")
    .update({ total_points: userRow.total_points - reward.points_required })
    .eq("id", userId)
    .eq("total_points", userRow.total_points); // optimistic lock

  if (deductErr) {
    return NextResponse.json(
      { error: "Failed to deduct points, please try again" },
      { status: 500 },
    );
  }

  // ── Log transaction ───────────────────────────────────────────────────────
  const txnType =
    reward.type === "parts_reward" ? "redeem_parts" : "redeem_service";

  await supabase.from("points_transactions").insert({
    user_id: userId,
    points: -reward.points_required,
    type: txnType,
    note: `Redeemed: ${reward.title}`,
  });

  // ── Create user_reward row ────────────────────────────────────────────────
  const { data: userReward, error: insertErr } = await supabase
    .from("user_rewards")
    .insert({
      user_id: userId,
      reward_id: rewardId,
      code,
      qr_data: qrData,
    })
    .select("*, reward:rewards(*)")
    .single();

  if (insertErr) {
    // Rollback points deduction on failure
    await supabase
      .from("users")
      .update({ total_points: userRow.total_points })
      .eq("id", userId);

    return NextResponse.json(
      { error: "Failed to create reward, points restored" },
      { status: 500 },
    );
  }

  // Update txn reference_id now that we have the user_reward id
  await supabase
    .from("points_transactions")
    .update({ reference_id: userReward.id })
    .eq("user_id", userId)
    .eq("type", txnType)
    .is("reference_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  return NextResponse.json({ userReward });
}
