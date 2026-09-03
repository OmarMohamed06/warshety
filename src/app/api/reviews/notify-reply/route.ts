import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createInAppNotification } from "@/services/inAppNotificationService";
import { sendPushNotification } from "@/services/pushNotificationService";

/**
 * POST /api/reviews/notify-reply
 *
 * Notifies a reviewer (in-app + push) once a vendor replies to their review.
 * Runs server-side so it can call firebase-admin (push), which can't be
 * bundled into the browser client that submits the reply.
 *
 * Body: { reviewId: string; vendorId: string }
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
    const { reviewId, vendorId } = (await req.json()) as {
      reviewId?: string;
      vendorId?: string;
    };

    if (!reviewId || !vendorId) {
      return NextResponse.json(
        { error: "Missing reviewId or vendorId" },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    const { data: review } = await supabase
      .from("reviews")
      .select("user_id, vendor_id")
      .eq("id", reviewId)
      .single();

    if (!review || review.vendor_id !== vendorId) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const { data: vendor } = await supabase
      .from("vendors")
      .select("business_name")
      .eq("id", vendorId)
      .single();

    const title = "New reply to your review";
    const body = `${vendor?.business_name ?? "A workshop"} replied to your review.`;

    await createInAppNotification({
      userId: review.user_id,
      type: "review_reply",
      title,
      body,
      link: `/reviews/${reviewId}`,
    });

    await sendPushNotification({
      userId: review.user_id,
      title,
      body,
      type: "review_reply",
      referenceId: reviewId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reviews/notify-reply]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
