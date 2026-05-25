/**
 * billingService — Revenue / Billing logic for service centers.
 *
 * Service Centers  (booking-based):
 *    Fixed fee per booking  (booking_fee, default 75 EGP)
 *    Monthly bill = bookings_count × booking_fee
 *    Admin generates a bill at month-end; vendor pays the invoice.
 *
 * Billing flow:
 *   generateServiceCenterBilling()  →  creates service_center_billing row
 *   markServiceCenterBillingPaid()  →  sets payment_status = 'paid'
 */

import { createClient as _createClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = () => _createClient() as any;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BillingPaymentStatus = "pending" | "payment_submitted" | "paid";

/**
 * Service Center billing settings.
 * Billing model: fixed EGP fee per booking.
 */
export interface SCBillingSettings {
  vendor_id: string;
  /** Fixed EGP fee charged per booking (e.g. 75 EGP) */
  booking_fee: number;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type VendorBillingSettings = SCBillingSettings;

export interface ServiceCenterBillingRecord {
  id: string;
  vendor_id: string;
  period_start: string;
  period_end: string;
  bookings_count: number;
  /** Fixed EGP fee per booking applied at time of billing */
  booking_fee: number;
  /** bookings_count × booking_fee */
  total_booking_fees: number;
  /** Always 0 — subscription model removed */
  subscription_fee: number;
  /** Equals total_booking_fees */
  total_fees_due: number;
  payment_status: BillingPaymentStatus;
  payment_date?: string | null;
  paid_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  vendors?: { business_name: string; vendor_type: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// BILLING PERIOD UTILITIES  (pure — no Supabase)
// ─────────────────────────────────────────────────────────────────────────────

/** Add N calendar months to a UTC date, clamping to the last day of the month. */
function addMonthsClamped(date: Date, n: number): Date {
  const targetYear =
    date.getUTCFullYear() + Math.floor((date.getUTCMonth() + n) / 12);
  const targetMonth = (date.getUTCMonth() + n + 120) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return new Date(Date.UTC(targetYear, targetMonth, day));
}

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Return all COMPLETED billing periods since the vendor was approved.
 */
export function completedBillingPeriods(
  approvedAt: Date,
  today: Date = new Date(),
): { start: string; end: string }[] {
  const base = new Date(
    Date.UTC(
      approvedAt.getUTCFullYear(),
      approvedAt.getUTCMonth(),
      approvedAt.getUTCDate(),
    ),
  );
  const todayStr = fmtDate(today);
  const periods: { start: string; end: string }[] = [];

  for (let i = 0; ; i++) {
    const start = addMonthsClamped(base, i);
    const end = new Date(addMonthsClamped(base, i + 1).getTime() - 86_400_000);

    if (fmtDate(end) >= todayStr) break;

    periods.push({ start: fmtDate(start), end: fmtDate(end) });
  }

  return periods;
}

/**
 * Return the current (in-progress) billing period for a vendor.
 */
export function currentBillingPeriod(
  approvedAt: Date,
  today: Date = new Date(),
): { start: string; end: string } | null {
  if (!approvedAt) return null;
  const base = new Date(
    Date.UTC(
      approvedAt.getUTCFullYear(),
      approvedAt.getUTCMonth(),
      approvedAt.getUTCDate(),
    ),
  );
  const todayStr = fmtDate(today);

  for (let i = 0; ; i++) {
    const start = addMonthsClamped(base, i);
    const end = new Date(addMonthsClamped(base, i + 1).getTime() - 86_400_000);

    if (fmtDate(start) <= todayStr && fmtDate(end) >= todayStr) {
      return { start: fmtDate(start), end: fmtDate(end) };
    }
    if (i > 36) break;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR BILLING HISTORY  (vendor-facing read)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all billing records for a specific service center (vendor-facing).
 */
export async function getMyBillingHistory(vendorId: string): Promise<{
  data: ServiceCenterBillingRecord[];
  error: string | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_center_billing")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("period_start", { ascending: false });

  return {
    data: (data ?? []) as ServiceCenterBillingRecord[],
    error: error?.message ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  booking_fee: 75, // EGP per booking (service centers)
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR BILLING SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the billing settings for a specific vendor.
 */
export async function getVendorBillingSettings(
  vendorId: string,
): Promise<{ data: VendorBillingSettings | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vendor_billing_settings")
    .select("*")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };

  if (!data) {
    return {
      data: {
        vendor_id: vendorId,
        booking_fee: DEFAULTS.booking_fee,
      },
      error: null,
    };
  }

  return { data: data as VendorBillingSettings, error: null };
}

/**
 * Create or update billing settings for a vendor.
 */
export async function upsertVendorBillingSettings(
  settings: Partial<VendorBillingSettings> & { vendor_id: string },
  adminId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vendor_billing_settings")
    .upsert({ ...settings, updated_by: adminId });

  return { error: error?.message ?? null };
}

/**
 * Fetch only the booking_fee for a service center.
 */
export async function getSCFee(
  vendorId: string,
): Promise<{ fee: number; error: string | null }> {
  const { data, error } = await getVendorBillingSettings(vendorId);
  return { fee: data?.booking_fee ?? DEFAULTS.booking_fee, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CENTER BILLING  (fixed fee per booking, settled monthly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a monthly billing record for a service center.
 */
export async function generateServiceCenterBilling(
  vendorId: string,
  periodStart: string,
  periodEnd: string,
  adminId: string,
): Promise<{ data: ServiceCenterBillingRecord | null; error: string | null }> {
  const supabase = createClient();

  const { count: bookingsCount, error: countErr } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId)
    .eq("status", "completed")
    .gte("booking_date", periodStart)
    .lte("booking_date", periodEnd);

  if (countErr) return { data: null, error: countErr.message };

  const { fee: bookingFee, error: feeErr } = await getSCFee(vendorId);
  if (feeErr) return { data: null, error: feeErr };

  const count = bookingsCount ?? 0;
  const totalBookingFees = count * bookingFee;
  const totalFeesDue = totalBookingFees;

  const { data, error } = await supabase
    .from("service_center_billing")
    .upsert(
      {
        vendor_id: vendorId,
        period_start: periodStart,
        period_end: periodEnd,
        bookings_count: count,
        booking_fee: bookingFee,
        total_booking_fees: totalBookingFees,
        subscription_fee: 0,
        total_fees_due: totalFeesDue,
        payment_status: "pending",
        payment_date: null,
        paid_by: null,
      },
      { onConflict: "vendor_id,period_start,period_end" },
    )
    .select("*, vendors(business_name, vendor_type)")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ServiceCenterBillingRecord, error: null };
}

/**
 * Mark a service center billing record as payment_submitted.
 */
export async function markBillingPaymentSubmitted(
  billingId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("service_center_billing")
    .update({ payment_status: "payment_submitted" })
    .eq("id", billingId)
    .eq("payment_status", "pending");

  return { error: error?.message ?? null };
}

/**
 * Mark a service center billing record as paid.
 */
export async function markServiceCenterBillingPaid(
  billingId: string,
  adminId: string,
  notes?: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("service_center_billing")
    .update({
      payment_status: "paid",
      payment_date: new Date().toISOString(),
      paid_by: adminId,
      ...(notes ? { notes } : {}),
    })
    .eq("id", billingId);

  return { error: error?.message ?? null };
}

/**
 * Get all billing records for admin view.
 */
export async function getServiceCenterBillingList(params?: {
  vendorId?: string;
  paymentStatus?: BillingPaymentStatus | "all";
  page?: number;
  pageSize?: number;
}): Promise<{
  data: ServiceCenterBillingRecord[];
  count: number;
  error: string | null;
}> {
  const supabase = createClient();
  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? 20;

  let q = supabase
    .from("service_center_billing")
    .select("*, vendors(business_name, vendor_type)", { count: "exact" });

  if (params?.vendorId) q = q.eq("vendor_id", params.vendorId);
  if (params?.paymentStatus && params.paymentStatus !== "all")
    q = q.eq("payment_status", params.paymentStatus);

  const { data, count, error } = await q
    .order("period_start", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  return {
    data: (data ?? []) as ServiceCenterBillingRecord[],
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN BILLING SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminBillingSummary {
  scPendingFees: number;
  scPaidFees: number;
  scTotalRecords: number;
}

/**
 * Aggregate billing totals for the admin dashboard summary cards.
 */
export async function getAdminBillingSummary(): Promise<{
  data: AdminBillingSummary;
  error: string | null;
}> {
  const supabase = createClient();

  const { data: scData, error: scError } = await supabase
    .from("service_center_billing")
    .select("total_fees_due, payment_status");

  const scRows = scData ?? [];

  const sum = (
    rows: { total_fees_due?: number; payment_status: string }[],
    status: string,
  ) =>
    rows
      .filter((r) => r.payment_status === status)
      .reduce((acc, r) => acc + Number(r.total_fees_due ?? 0), 0);

  return {
    data: {
      scPendingFees: sum(scRows, "pending"),
      scPaidFees: sum(scRows, "paid"),
      scTotalRecords: scRows.length,
    },
    error: scError?.message ?? null,
  };
}
