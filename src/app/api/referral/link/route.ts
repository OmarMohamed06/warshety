import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/referral/link
 *
 * Links a newly registered user (referee) to the friend who referred them.
 * Called by the **mobile app** after a new user registers, if they installed
 * the app through a referral link (warshety.com/download?ref=CODE).
 *
 * The app reads the stored referral code from local/install referral storage
 * and POSTs it here once the user's account is created.
 *
 * Points are NOT awarded here — they are awarded when the referee completes
 * their first booking (via /api/bookings/award-points → process_referral_reward).
 */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      refereeId?: string;
      referralCode?: string;
    };

    const { refereeId, referralCode } = body;

    if (!refereeId || !referralCode) {
      return NextResponse.json(
        { error: "Missing refereeId or referralCode" },
        { status: 400 },
      );
    }

    const code = referralCode.trim().toUpperCase();
    const supabase = getServiceClient();

    // Find the referrer by their code
    const { data: referrer, error: referrerErr } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();

    if (referrerErr || !referrer) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 },
      );
    }

    // Prevent self-referral
    if (referrer.id === refereeId) {
      return NextResponse.json(
        { error: "You cannot use your own referral code" },
        { status: 422 },
      );
    }

    // One referral per new user (UNIQUE constraint on referee_id)
    const { error: insertErr } = await supabase.from("referrals").insert({
      referrer_id: referrer.id,
      referee_id: refereeId,
      status: "pending",
    });

    if (insertErr) {
      // Ignore duplicate — user already linked to a referrer
      if (insertErr.code === "23505") {
        return NextResponse.json({ ok: true, alreadyLinked: true });
      }
      console.error("[referral/link] insert error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[referral/link]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
