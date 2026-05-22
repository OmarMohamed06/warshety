/**
 * POST /api/vendor/billing/submit-payment
 *
 * Called when a vendor clicks "Got it" after viewing bank transfer instructions.
 * Marks the billing record's payment_status as 'payment_submitted' so admin
 * knows to verify the transfer and mark it as paid.
 *
 * Body: { billingId: string }
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 1. Authenticate the caller
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let billingId: string;
  try {
    const body = await req.json();
    billingId = body.billingId;
    if (!billingId) throw new Error("Missing billingId");
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // 3. Confirm the caller owns this billing record (via vendor linkage)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendor } = await (supabase as any)
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!vendor) {
    return NextResponse.json(
      { error: "No approved vendor found" },
      { status: 403 },
    );
  }

  // 4. Update status — only if the record belongs to this vendor and is still pending
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("service_center_billing")
    .update({ payment_status: "payment_submitted" })
    .eq("id", billingId)
    .eq("vendor_id", vendor.id)
    .eq("payment_status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
