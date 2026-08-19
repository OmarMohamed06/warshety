/**
 * GET /api/rewards/validate?code=WRS-XXXXXX
 *
 * Public endpoint — returns reward info for QR landing page.
 * Does NOT mark as used. Use POST /api/rewards/use for that.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const supabase = await createClient();
  // Use admin client so vendors can look up any user's reward code
  const admin = createAdminClient();

  const { data: userReward, error } = await admin
    .from("user_rewards")
    .select(
      "id, code, is_used, used_at, created_at, reward:rewards(title, title_ar, description, value, value_type, category, type)",
    )
    .eq("code", code.toUpperCase().trim())
    .single();

  if (error || !userReward) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  return NextResponse.json({
    code: userReward.code,
    isUsed: userReward.is_used,
    usedAt: userReward.used_at,
    createdAt: userReward.created_at,
    reward: userReward.reward,
  });
}
