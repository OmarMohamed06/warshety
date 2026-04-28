/**
 * POST /api/vendor/billing/ensure
 *
 * Called by the vendor billing page on mount.
 * Generates any missing service_center_billing records for the
 * authenticated vendor, for all completed billing periods.
 *
 * Returns:
 *   { generated: number, skipped: number, errors: string[] }
 */

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { runBillingGeneration } from "@/app/api/cron/billing/route";

export async function POST() {
  // ── 1. Verify the caller is an authenticated vendor ─────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Get their vendor record ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendor } = await (supabase as any)
    .from("vendors")
    .select("id, vendor_type, status, approved_at")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!vendor) {
    return NextResponse.json(
      { error: "No approved vendor found for this user" },
      { status: 403 },
    );
  }

  // Parts sellers don't have service_center_billing records
  if (vendor.vendor_type !== "service_center") {
    return NextResponse.json({ generated: 0, skipped: 0, errors: [] });
  }

  // ── 3. Run billing generation for this vendor only ─────────────────────
  // Uses the service-role key so it can write billing records bypassing RLS.
  const result = await runBillingGeneration(vendor.id as string);

  return NextResponse.json(
    {
      ok: result.errors.length === 0,
      generated: result.generated,
      skipped: result.skipped,
      errors: result.errors,
    },
    { status: result.errors.length > 0 ? 207 : 200 },
  );
}

// Silence the "SUPABASE_SERVICE_ROLE_KEY not set" warning at build time
// by wrapping createServiceClient usage inside the handler (not module level).
const _unused = createServiceClient;
void _unused;
