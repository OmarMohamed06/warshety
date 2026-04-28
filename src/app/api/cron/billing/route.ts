/**
 * /api/cron/billing — Automatic monthly billing generation
 *
 * Generates service_center_billing records for every approved Service Center
 * whose billing period(s) have completed but don't yet have a record.
 *
 * Billing cycle (rolling monthly from approval date):
 *   Period 1 start = approved_at
 *   Period 1 end   = (approved_at + 1 month) – 1 day
 *   Period 2 start = approved_at + 1 month
 *   …
 *
 * A period is only billed once it is fully COMPLETE (period_end < today).
 *
 * ── Invocation ─────────────────────────────────────────────────────────────
 *   Automatic: Vercel Cron calls GET /api/cron/billing on the 1st of each
 *              month at 06:00 UTC (see vercel.json).
 *              Protected by the CRON_SECRET env var.
 *
 * ── Environment variables required ────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL      — already set
 *   SUPABASE_SERVICE_ROLE_KEY     — service-role key (bypasses RLS)
 *   CRON_SECRET                   — random secret shared with Vercel Cron
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { completedBillingPeriods } from "@/services/billingService";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase service-role client — bypasses RLS so the cron can write billing
// records without an authenticated user session.
// ─────────────────────────────────────────────────────────────────────────────

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Core billing generation logic (exported for use by vendor ensure route too)
// ─────────────────────────────────────────────────────────────────────────────

interface BillingResult {
  generated: number;
  skipped: number;
  errors: string[];
}

export async function runBillingGeneration(
  filterVendorId?: string,
): Promise<BillingResult> {
  const db = serviceClient();
  const today = new Date();

  // ── 1. Fetch approved Service Centers with approved_at ──────────────────
  let query = db
    .from("vendors")
    .select("id, business_name, approved_at")
    .eq("vendor_type", "service_center")
    .eq("status", "approved")
    .not("approved_at", "is", null);

  if (filterVendorId) {
    query = query.eq("id", filterVendorId);
  }

  const { data: vendors, error: vendorErr } = await query;

  if (vendorErr) {
    return { generated: 0, skipped: 0, errors: [vendorErr.message] };
  }

  // ── 2. Platform default booking fee ──────────────────────────────────────
  const { data: feeSetting } = await db
    .from("system_settings")
    .select("value")
    .eq("key", "service_center_booking_fee")
    .maybeSingle();
  const platformDefaultFee = parseFloat(
    (feeSetting as { value: string } | null)?.value ?? "75",
  );

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const vendor of vendors ?? []) {
    const approvedAt = new Date(vendor.approved_at as string);
    const periods = completedBillingPeriods(approvedAt, today);

    if (periods.length === 0) {
      skipped++;
      continue; // vendor approved less than 1 month ago
    }

    // ── 3. Vendor's custom booking fee ────────────────────────────────────
    const { data: vendorSettings } = await db
      .from("vendor_billing_settings")
      .select("booking_fee")
      .eq("vendor_id", vendor.id)
      .maybeSingle();
    const bookingFee =
      (vendorSettings as { booking_fee: number } | null)?.booking_fee ??
      platformDefaultFee;

    for (const period of periods) {
      // ── 4. Skip if billing record already exists ─────────────────────────
      const { data: existing } = await db
        .from("service_center_billing")
        .select("id")
        .eq("vendor_id", vendor.id)
        .eq("period_start", period.start)
        .eq("period_end", period.end)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // ── 5. Count only completed bookings in the period ──────────────────
      const { count } = await db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendor.id)
        .eq("status", "completed")
        .gte("booking_date", period.start)
        .lte("booking_date", period.end);

      const bookingsCount = count ?? 0;
      const totalFeesDue = bookingsCount * bookingFee;

      // ── 6. Insert the billing record ──────────────────────────────────────
      const { error: insertErr } = await db
        .from("service_center_billing")
        .insert({
          vendor_id: vendor.id,
          period_start: period.start,
          period_end: period.end,
          bookings_count: bookingsCount,
          booking_fee: bookingFee,
          total_booking_fees: totalFeesDue,
          subscription_fee: 0,
          total_fees_due: totalFeesDue,
          payment_status: "pending",
        });

      if (insertErr) {
        const isDupe =
          insertErr.message.includes("duplicate") ||
          insertErr.message.includes("unique") ||
          insertErr.code === "23505";
        if (!isDupe) {
          errors.push(
            `Vendor ${vendor.id} [${period.start}→${period.end}]: ${insertErr.message}`,
          );
        } else {
          skipped++;
        }
      } else {
        generated++;
      }
    }
  }

  return { generated, skipped, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Vercel Cron trigger (runs 1st of each month)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runBillingGeneration();

  return NextResponse.json(
    {
      ok: result.errors.length === 0,
      generated: result.generated,
      skipped: result.skipped,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    },
    { status: result.errors.length > 0 ? 207 : 200 },
  );
}
