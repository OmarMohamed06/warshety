/**
 * billingService — Revenue / Billing logic for Garage Egypt.
 *
 * Two revenue streams (strictly separated, settled monthly):
 *
 * 1. Service Centers  (booking-based)
 *    └─ Fixed fee per booking  (booking_fee, default 75 EGP)
 *       Monthly bill = bookings_count × booking_fee
 *       Admin generates a bill at month-end; vendor pays the invoice.
 *
 * 2. Parts Sellers  (commission-based)
 *    └─ Commission % of final order value  (default 15 %)
 *       platform_share = final_order_amount × commission_rate / 100
 *       vendor_share   = final_order_amount − platform_share
 *       Settled monthly — no minimum payout.
 *
 * Billing flow:
 *   Service Centers
 *     generateServiceCenterBilling()  →  creates service_center_billing row
 *     markServiceCenterBillingPaid()  →  sets payment_status = 'paid'
 *
 *   Parts Sellers
 *     createPartsSellerTransaction()  →  creates parts_seller_transactions row
 *     markPartsTransactionPaid()      →  sets payment_status = 'paid'
 *     processRefund()                 →  marks refunded + recalculates shares
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
 * Billing model: fixed EGP fee per booking — NOT a commission percentage.
 */
export interface SCBillingSettings {
  vendor_id: string;
  /** Fixed EGP fee charged per booking (e.g. 75 EGP) */
  booking_fee: number;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Parts Seller billing settings.
 * Billing model: percentage commission on final order value — NOT a fixed fee.
 */
export interface PSBillingSettings {
  vendor_id: string;
  /** Commission % deducted from final order amount (e.g. 15 %) */
  commission_rate: number;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Union of both vendor billing types — used by the shared DB table helpers.
 * Always access only the field relevant to the vendor type:
 *   service_center → booking_fee
 *   parts_seller   → commission_rate
 */
export type VendorBillingSettings = SCBillingSettings & PSBillingSettings;

export interface ServiceCenterBillingRecord {
  id: string;
  vendor_id: string;
  period_start: string; // ISO date string (YYYY-MM-DD)
  period_end: string;
  bookings_count: number;
  /** Fixed EGP fee per booking applied at time of billing */
  booking_fee: number;
  /** bookings_count × booking_fee */
  total_booking_fees: number;
  /** Always 0 — subscription model removed */
  subscription_fee: number;
  /** Equals total_booking_fees (no subscription added) */
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

export interface PartsSellerTransaction {
  id: string;
  vendor_id: string;
  order_id: string;
  order_amount: number;
  discount: number;
  final_order_amount: number;
  /** Commission % applied at time of transaction */
  commission_rate: number;
  /** final_order_amount × commission_rate / 100 */
  platform_share: number;
  /** final_order_amount − platform_share */
  vendor_share: number;
  payment_status: BillingPaymentStatus;
  payment_date?: string | null;
  paid_by?: string | null;
  refunded: boolean;
  refund_amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  vendors?: { business_name: string } | null;
  orders?: { status: string; created_at: string } | null;
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
 * A period is complete only when period_end < today.
 *
 * Periods roll monthly from the approval date:
 *   Period 1: approved_at  →  (approved_at + 1 month) - 1 day
 *   Period 2: (approved_at + 1 month)  →  (approved_at + 2 months) - 1 day
 *   …
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

    if (fmtDate(end) >= todayStr) break; // current period not yet complete

    periods.push({ start: fmtDate(start), end: fmtDate(end) });
  }

  return periods;
}

/**
 * Return the current (in-progress) billing period for a vendor.
 * This is the period that is ongoing and not yet billable.
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
    // Safety: don't look more than 3 years ahead
    if (i > 36) break;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR BILLING HISTORY  (vendor-facing read)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all billing records for a specific service center (vendor-facing).
 * Returns newest first.
 */
export async function getMyBillingHistory(vendorId: string): Promise<{
  data: ServiceCenterBillingRecord[];
  error: string | null;
}> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("service_center_billing")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("period_start", { ascending: false });

  return {
    data: (data ?? []) as ServiceCenterBillingRecord[],
    error: error?.message ?? null,
  };
}

/**
 * Fetch all commission transactions for a parts seller (vendor-facing).
 * Returns newest first.
 */
export async function getMyTransactionHistory(vendorId: string): Promise<{
  data: PartsSellerTransaction[];
  pendingTotal: number;
  paidTotal: number;
  error: string | null;
}> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("parts_seller_transactions")
    .select("*, orders(status, created_at)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as PartsSellerTransaction[];
  const pendingTotal = rows
    .filter((r) => r.payment_status === "pending" && !r.refunded)
    .reduce((s, r) => s + Number(r.vendor_share ?? 0), 0);
  const paidTotal = rows
    .filter((r) => r.payment_status === "paid")
    .reduce((s, r) => s + Number(r.vendor_share ?? 0), 0);

  return {
    data: rows,
    pendingTotal,
    paidTotal,
    error: error?.message ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform defaults (fallback when system_settings not available client-side)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  booking_fee: 75, // EGP per booking (service centers)
  commission_rate: 15, // % of final order (parts sellers)
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR BILLING SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the billing settings for a specific vendor.
 * Returns platform defaults if no row exists yet.
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

  // Return defaults if no row exists
  if (!data) {
    return {
      data: {
        vendor_id: vendorId,
        booking_fee: DEFAULTS.booking_fee,
        commission_rate: DEFAULTS.commission_rate,
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
 * Service centers are billed a FIXED EGP fee per booking — NOT a commission %.
 * Returns the platform default (75 EGP) if no custom setting exists.
 */
export async function getSCFee(
  vendorId: string,
): Promise<{ fee: number; error: string | null }> {
  const { data, error } = await getVendorBillingSettings(vendorId);
  return { fee: data?.booking_fee ?? DEFAULTS.booking_fee, error };
}

/**
 * Fetch only the commission_rate for a parts seller.
 * Parts sellers are billed a PERCENTAGE of the final order value — NOT a fixed fee.
 * Returns the platform default (15 %) if no custom setting exists.
 */
export async function getPSCommissionRate(
  vendorId: string,
): Promise<{ rate: number; error: string | null }> {
  const { data, error } = await getVendorBillingSettings(vendorId);
  return { rate: data?.commission_rate ?? DEFAULTS.commission_rate, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CENTER BILLING  (fixed fee per booking, settled monthly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a monthly billing record for a service center.
 *
 * Billing model: FIXED FEE PER BOOKING (not a commission percentage).
 *
 * Step 1: Count non-cancelled bookings in the period.
 * Step 2: Retrieve the vendor's booking_fee setting.
 * Step 3: Calculate total_fees_due = bookings_count × booking_fee.
 * Step 4: Insert/upsert into service_center_billing.
 */
export async function generateServiceCenterBilling(
  vendorId: string,
  periodStart: string, // YYYY-MM-DD
  periodEnd: string, // YYYY-MM-DD
  adminId: string,
): Promise<{ data: ServiceCenterBillingRecord | null; error: string | null }> {
  const supabase = createClient();

  // Step 1 — Count only completed bookings in the period
  const { count: bookingsCount, error: countErr } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId)
    .eq("status", "completed")
    .gte("booking_date", periodStart)
    .lte("booking_date", periodEnd);

  if (countErr) return { data: null, error: countErr.message };

  // Step 2 — Get this vendor's fixed booking fee (service centers only)
  const { fee: bookingFee, error: feeErr } = await getSCFee(vendorId);
  if (feeErr) return { data: null, error: feeErr };

  // Step 3 — Monthly bill = bookings_count × booking_fee  (fixed fee, NOT a %)
  const count = bookingsCount ?? 0;
  const totalBookingFees = count * bookingFee;
  const totalFeesDue = totalBookingFees;

  // Step 4 — Upsert billing record
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
// PARTS SELLER TRANSACTIONS  (commission % per order, settled monthly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a commission transaction record for a parts-seller order.
 * Billing model: COMMISSION % of final order — NOT a fixed booking fee.
 *
 * Step 1: final_order_amount = order_amount − discount
 * Step 2: platform_share = final_order_amount × commission_rate / 100
 * Step 3: vendor_share   = final_order_amount − platform_share
 * Step 4: Insert into parts_seller_transactions.
 */
export async function createPartsSellerTransaction(
  vendorId: string,
  orderId: string,
  orderAmount: number,
  discount: number,
  adminId?: string,
): Promise<{ data: PartsSellerTransaction | null; error: string | null }> {
  const supabase = createClient();

  // Fetch the commission rate for this parts seller (% of final order value)
  const { rate } = await getPSCommissionRate(vendorId);

  // Calculations: platform_share = final_order_amount × rate / 100
  const finalAmount = Math.max(0, orderAmount - discount);
  const platformShare = parseFloat(((finalAmount * rate) / 100).toFixed(2));
  const vendorShareAmt = parseFloat((finalAmount - platformShare).toFixed(2));

  const { data, error } = await supabase
    .from("parts_seller_transactions")
    .upsert(
      {
        vendor_id: vendorId,
        order_id: orderId,
        order_amount: orderAmount,
        discount: discount,
        final_order_amount: finalAmount,
        commission_rate: rate,
        platform_share: platformShare,
        vendor_share: vendorShareAmt,
        payment_status: "pending",
        refunded: false,
        refund_amount: 0,
      },
      { onConflict: "vendor_id,order_id" },
    )
    .select("*, vendors(business_name), orders(status, created_at)")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PartsSellerTransaction, error: null };
}

/**
 * Mark a parts-seller transaction as paid.
 */
export async function markPartsTransactionPaid(
  transactionId: string,
  adminId: string,
  notes?: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("parts_seller_transactions")
    .update({
      payment_status: "paid",
      payment_date: new Date().toISOString(),
      paid_by: adminId,
      ...(notes ? { notes } : {}),
    })
    .eq("id", transactionId);

  return { error: error?.message ?? null };
}

/**
 * Process a refund: recalculate platform_share and vendor_share based on
 * the remaining (non-refunded) amount.
 */
export async function processPartsRefund(
  transactionId: string,
  refundAmount: number,
  adminId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Fetch current record
  const { data: tx, error: fetchErr } = await supabase
    .from("parts_seller_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (fetchErr || !tx) return { error: fetchErr?.message ?? "Not found" };

  const remaining = Math.max(0, tx.final_order_amount - refundAmount);
  const platformShare = parseFloat(
    ((remaining * tx.commission_rate) / 100).toFixed(2),
  );
  const vendorShare = parseFloat((remaining - platformShare).toFixed(2));

  const { error } = await supabase
    .from("parts_seller_transactions")
    .update({
      refunded: true,
      refund_amount: refundAmount,
      final_order_amount: remaining,
      platform_share: platformShare,
      vendor_share: vendorShare,
      payment_status: "pending", // re-open for reconciliation
      paid_by: adminId,
      notes: `Refund of ${refundAmount} EGP processed on ${new Date().toLocaleDateString("en-EG")}`,
    })
    .eq("id", transactionId);

  return { error: error?.message ?? null };
}

/**
 * Get all parts-seller transactions for admin view.
 */
export async function getPartsSellerTransactionList(params?: {
  vendorId?: string;
  paymentStatus?: BillingPaymentStatus | "all";
  page?: number;
  pageSize?: number;
}): Promise<{
  data: PartsSellerTransaction[];
  count: number;
  error: string | null;
}> {
  const supabase = createClient();
  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? 20;

  let q = supabase
    .from("parts_seller_transactions")
    .select("*, vendors(business_name), orders(status, created_at)", {
      count: "exact",
    });

  if (params?.vendorId) q = q.eq("vendor_id", params.vendorId);
  if (params?.paymentStatus && params.paymentStatus !== "all")
    q = q.eq("payment_status", params.paymentStatus);

  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  return {
    data: (data ?? []) as PartsSellerTransaction[],
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

/**
 * Fetch ALL parts-seller transactions without pagination.
 * Used for client-side weekly payout grouping in the admin billing page.
 * Returns newest-first so the weekly view sorts naturally.
 */
export async function getAllPSTransactionsForWeekly(): Promise<{
  data: PartsSellerTransaction[];
  error: string | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parts_seller_transactions")
    .select("*, vendors(business_name), orders(status, created_at)")
    .order("created_at", { ascending: false });

  return {
    data: (data ?? []) as PartsSellerTransaction[],
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
  psPendingCommission: number;
  psPaidCommission: number;
  psTotalRecords: number;
}

/**
 * Aggregate billing totals for the admin dashboard summary cards.
 */
export async function getAdminBillingSummary(): Promise<{
  data: AdminBillingSummary;
  error: string | null;
}> {
  const supabase = createClient();

  const [scRes, psRes] = await Promise.all([
    supabase
      .from("service_center_billing")
      .select("total_fees_due, payment_status"),
    supabase
      .from("parts_seller_transactions")
      .select("platform_share, payment_status"),
  ]);

  const scRows = scRes.data ?? [];
  const psRows = psRes.data ?? [];

  const sum = (
    rows: {
      total_fees_due?: number;
      platform_share?: number;
      payment_status: string;
    }[],
    field: "total_fees_due" | "platform_share",
    status: string,
  ) =>
    rows
      .filter((r) => r.payment_status === status)
      .reduce((acc, r) => acc + Number(r[field] ?? 0), 0);

  return {
    data: {
      scPendingFees: sum(scRows as never, "total_fees_due", "pending"),
      scPaidFees: sum(scRows as never, "total_fees_due", "paid"),
      scTotalRecords: scRows.length,
      psPendingCommission: sum(psRows as never, "platform_share", "pending"),
      psPaidCommission: sum(psRows as never, "platform_share", "paid"),
      psTotalRecords: psRows.length,
    },
    error: (scRes.error ?? psRes.error)?.message ?? null,
  };
}
