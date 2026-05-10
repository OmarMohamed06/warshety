/**
 * POST /api/rewards/promo
 * Body: { code: string }
 *
 * Apply a parts promo code at checkout.
 * Returns discount details. Does NOT mark as used — call /api/rewards/use after order is placed.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { code } = body as { code: string };

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const { data: userReward, error } = await supabase
    .from("user_rewards")
    .select("*, reward:rewards(*)")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (error || !userReward) {
    return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
  }

  if (userReward.is_used) {
    return NextResponse.json(
      { error: "Promo code has already been used" },
      { status: 422 },
    );
  }

  const reward = userReward.reward as {
    type: string;
    value: number;
    value_type: string;
    title: string;
  };

  if (reward.type !== "parts_reward") {
    return NextResponse.json(
      { error: "This code is not valid for parts orders" },
      { status: 422 },
    );
  }

  // Verify the code belongs to the authenticated user
  if (userReward.user_id !== session.user.id) {
    return NextResponse.json(
      { error: "This code does not belong to your account" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    success: true,
    userRewardId: userReward.id,
    value: reward.value,
    valueType: reward.value_type,
    title: reward.title,
  });
}
