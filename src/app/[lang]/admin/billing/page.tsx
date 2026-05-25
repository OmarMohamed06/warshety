"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  getAdminBillingSummary,
  getServiceCenterBillingList,
  markServiceCenterBillingPaid,
  upsertVendorBillingSettings,
  getVendorBillingSettings,
  type ServiceCenterBillingRecord,
  type AdminBillingSummary,
  type BillingPaymentStatus,
} from "@/services/billingService";
import { createClient } from "@/lib/supabase/client";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const PAGE_SIZE = 20;

// ── Badge colours ─────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<BillingPaymentStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  payment_submitted:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

// ── Types for vendor list ─────────────────────────────────────────────────────
interface VendorRow {
  id: string;
  business_name: string;
  vendor_type: "service_center" | "parts_seller";
  status: string;
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  icon,
  color,
  bg,
  loading,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
          bg,
        )}
      >
        <span
          className={cn("material-symbols-outlined", color)}
          style={{ fontSize: 22 }}
        >
          {icon}
        </span>
      </div>
      <p className="text-xl font-black">{loading ? "…" : value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type TabType = "service_centers" | "settings";

export default function BillingPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [tab, setTab] = useState<TabType>("service_centers");
  const [statusFilter, setStatusFilter] = useState<
    BillingPaymentStatus | "all"
  >("all");
  const [page, setPage] = useState(0);

  const [summary, setSummary] = useState<AdminBillingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [scRecords, setScRecords] = useState<ServiceCenterBillingRecord[]>([]);
  const [scCount, setScCount] = useState(0);
  const [scLoading, setScLoading] = useState(false);

  // Settings tab
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [settingsForm, setSettingsForm] = useState({
    booking_fee: 75,
    commission_rate: 15,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Refund modal
  const [refundModal, setRefundModal] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");

  // Mark-paid confirmation
  const [confirmPaid, setConfirmPaid] = useState<{
    id: string;
    type: "sc" | "ps";
    label: string;
  } | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  // ── Load summary ───────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    const { data } = await getAdminBillingSummary();
    if (data) setSummary(data);
    setSummaryLoading(false);
  }, []);

  // ── Load service-center billing ────────────────────────────────────────────
  const loadSC = useCallback(async () => {
    setScLoading(true);
    const { data, count } = await getServiceCenterBillingList({
      paymentStatus: statusFilter,
      page,
      pageSize: PAGE_SIZE,
    });
    setScRecords(data);
    setScCount(count);
    setScLoading(false);
  }, [statusFilter, page]);

  // ── Load vendors for settings ──────────────────────────────────────────────
  const loadVendors = useCallback(async () => {
    setVendorsLoading(true);
    const { data } = await supabase
      .from("vendors")
      .select("id, business_name, vendor_type, status")
      .eq("status", "approved")
      .order("business_name");
    setVendors((data ?? []) as VendorRow[]);
    setVendorsLoading(false);
  }, [supabase]);

  // Initial load
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (tab === "service_centers") loadSC();
    else loadVendors();
  }, [tab, loadSC, loadVendors]);

  // ── Vendor settings: load when vendor selected ─────────────────────────────
  async function onVendorSelect(vendorId: string) {
    setSelectedVendor(vendorId);
    if (!vendorId) return;
    setSettingsLoading(true);
    const { data } = await getVendorBillingSettings(vendorId);
    if (data) {
      setSettingsForm({
        booking_fee: data.booking_fee,
        commission_rate: 0,
      });
    }
    setSettingsLoading(false);
  }

  async function saveSettings() {
    if (!selectedVendor || !user?.id) return;
    setSettingsLoading(true);
    // Only persist the field that is relevant to this vendor type.
    // Service centers pay a fixed fee per booking (no commission %).
    // Parts sellers pay a commission % on orders (no fixed booking fee).
    const payload = { vendor_id: selectedVendor, booking_fee: settingsForm.booking_fee };
    const { error } = await upsertVendorBillingSettings(payload, user.id);
    flash(error ? `Error: ${error}` : t("admin.billing.settingsSaved"), !error);
    setSettingsLoading(false);
  }

  // ── Mark SC paid ───────────────────────────────────────────────────────────
  async function markScPaid(id: string) {
    if (!user?.id) return;
    setMarkingPaid(true);
    const { error } = await markServiceCenterBillingPaid(id, user.id);
    flash(error ? `Error: ${error}` : t("admin.billing.markedPaid"), !error);
    if (!error) {
      loadSC();
      loadSummary();
    }
    setMarkingPaid(false);
    setConfirmPaid(null);
  }

  // ── Refund ─────────────────────────────────────────────────────────────────
  // (Parts seller refund removed — service centers only)

  const scTotalPages = Math.ceil(scCount / PAGE_SIZE);

  const selectedVendorType = vendors.find(
    (v) => v.id === selectedVendor,
  )?.vendor_type;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">{t("admin.billing.title")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {t("admin.billing.subtitle")}
        </p>
      </div>

      {/* Flash message */}
      {msg && (
        <div
          className={cn(
            "px-4 py-3 rounded-xl text-sm font-semibold border",
            msg.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
          )}
        >
          {msg.text}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          label={t("admin.billing.scPending")}
          value={`EGP ${summary?.scPendingFees.toLocaleString("en-EG", { maximumFractionDigits: 0 }) ?? 0}`}
          icon="event_note"
          color="text-amber-600"
          bg="bg-amber-100 dark:bg-amber-900/30"
          loading={summaryLoading}
        />
        <SummaryCard
          label={t("admin.billing.scPaid")}
          value={`EGP ${summary?.scPaidFees.toLocaleString("en-EG", { maximumFractionDigits: 0 }) ?? 0}`}
          icon="check_circle"
          color="text-emerald-600"
          bg="bg-emerald-100 dark:bg-emerald-900/30"
          loading={summaryLoading}
        />
        <SummaryCard
          label={t("admin.billing.scRecords")}
          value={String(summary?.scTotalRecords ?? 0)}
          icon="receipt_long"
          color="text-blue-600"
          bg="bg-blue-100 dark:bg-blue-900/30"
          loading={summaryLoading}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 w-fit">
        {(["service_centers", "settings"] as TabType[]).map(
          (t_tab) => (
            <button
              key={t_tab}
              onClick={() => {
                setTab(t_tab);
                setPage(0);
                setStatusFilter("all");
              }}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors",
                tab === t_tab
                  ? "bg-[#FF4B19] text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
            >
              {t_tab === "service_centers"
                ? t("admin.billing.tabSC")
                : t("admin.billing.tabSettings")}
            </button>
          ),
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          TAB: SERVICE CENTERS
      ──────────────────────────────────────────────────────────────────────── */}
      {tab === "service_centers" && (
        <div className="space-y-4">
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as BillingPaymentStatus | "all");
                setPage(0);
              }}
              className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
            >
              <option value="all">{t("admin.billing.allStatuses")}</option>
              <option value="pending">
                {t("admin.billing.statusPending")}
              </option>
              <option value="payment_submitted">
                {t("admin.billing.statusSubmitted")}
              </option>
              <option value="paid">{t("admin.billing.statusPaid")}</option>
            </select>
            <div className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-xl">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                schedule
              </span>
              {t("admin.billing.autoBillingNote")}
            </div>
          </div>

          {/* Formula info box */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <div className="flex gap-3 items-start">
              <span
                className="material-symbols-outlined text-blue-600 shrink-0"
                style={{ fontSize: 20 }}
              >
                calculate
              </span>
              <div className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5">
                <p className="font-bold text-sm">
                  {t("admin.billing.scFormulaTitle")}
                </p>
                <p>{t("admin.billing.scFormulaLine1")}</p>
                <p>{t("admin.billing.scFormulaLine2")}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    {[
                      t("admin.billing.colVendor"),
                      t("admin.billing.colPeriod"),
                      t("admin.billing.colBookings"),
                      t("admin.billing.colBookingFee"),
                      t("admin.billing.colTotalDue"),
                      t("admin.billing.colStatus"),
                      t("admin.billing.colPaidDate"),
                      t("admin.billing.colActions"),
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {scLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <span
                          className="material-symbols-outlined animate-spin text-slate-400"
                          style={{ fontSize: 28 }}
                        >
                          progress_activity
                        </span>
                      </td>
                    </tr>
                  ) : scRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-16 text-center text-slate-400 text-sm"
                      >
                        {t("admin.billing.noRecords")}
                      </td>
                    </tr>
                  ) : (
                    scRecords.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-sm">
                            {r.vendors?.business_name ?? "—"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {r.vendor_id.slice(0, 8)}…
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {r.period_start} → {r.period_end}
                        </td>
                        <td className="px-4 py-3 font-black text-center">
                          {r.bookings_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          EGP {Number(r.booking_fee).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-black text-[#FF4B19] whitespace-nowrap">
                          EGP {Number(r.total_fees_due).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                              STATUS_BADGE[r.payment_status],
                            )}
                          >
                            {r.payment_status === "paid"
                              ? t("admin.billing.statusPaid")
                              : r.payment_status === "payment_submitted"
                                ? t("admin.billing.statusSubmitted")
                                : t("admin.billing.statusPending")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {r.payment_date
                            ? new Date(r.payment_date).toLocaleDateString(
                                "en-EG",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {(r.payment_status === "pending" ||
                            r.payment_status === "payment_submitted") && (
                            <button
                              onClick={() =>
                                setConfirmPaid({
                                  id: r.id,
                                  type: "sc",
                                  label:
                                    (r.vendors?.business_name ?? "—") +
                                    " · " +
                                    r.period_start +
                                    " → " +
                                    r.period_end,
                                })
                              }
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap",
                                r.payment_status === "payment_submitted"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200",
                              )}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 14 }}
                              >
                                check
                              </span>
                              {r.payment_status === "payment_submitted"
                                ? t("admin.billing.confirmPaid")
                                : t("admin.billing.markPaid")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {scTotalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500">
                  {t("admin.billing.showing")} {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, scCount)}{" "}
                  {t("admin.billing.of")} {scCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    ← {t("admin.prev")}
                  </button>
                  <span className="text-xs text-slate-500">
                    {page + 1} / {scTotalPages}
                  </span>
                  <button
                    disabled={page >= scTotalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    {t("admin.next")} →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────────────────
          TAB: SETTINGS (per-vendor billing config)
      ──────────────────────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="space-y-5 max-w-[720px]">
          {/* Vendor selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-4">
            <div>
              <h2 className="font-black text-lg">
                {t("admin.billing.settingsTitle")}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("admin.billing.settingsSubtitle")}
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("admin.billing.selectVendor")}
              </label>
              {vendorsLoading ? (
                <p className="text-sm text-slate-400">
                  {t("admin.billing.loadingVendors")}
                </p>
              ) : (
                <select
                  value={selectedVendor}
                  onChange={(e) => onVendorSelect(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                >
                  <option value="">{t("admin.billing.chooseVendor")}</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.business_name} (
                      {v.vendor_type === "service_center"
                        ? t("vendor.serviceCenterType")
                        : t("vendor.partsSellerType")}
                      )
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {selectedVendor && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <span
                    className="material-symbols-outlined animate-spin text-slate-400"
                    style={{ fontSize: 32 }}
                  >
                    progress_activity
                  </span>
                </div>
              ) : (
                <>
                  {/* Service-center fields */}
                  {(selectedVendorType === "service_center" ||
                    !selectedVendorType) && (
                    <div className="px-6 py-5 space-y-4 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="material-symbols-outlined text-[#FF4B19]"
                          style={{ fontSize: 18 }}
                        >
                          event_note
                        </span>
                        <h3 className="font-black text-sm">
                          {t("admin.billing.scSection")}
                        </h3>
                      </div>
                      <div className="max-w-xs">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {t("admin.billing.bookingFeeLabel")} (EGP)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={settingsForm.booking_fee}
                          onChange={(e) =>
                            setSettingsForm((f) => ({
                              ...f,
                              booking_fee: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 font-bold"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          {t("admin.billing.bookingFeeHint")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Parts-seller fields */}
                  {(selectedVendorType === "parts_seller" ||
                    !selectedVendorType) && (
                    <div className="px-6 py-5 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="material-symbols-outlined text-[#FF4B19]"
                          style={{ fontSize: 18 }}
                        >
                          inventory_2
                        </span>
                        <h3 className="font-black text-sm">
                          {t("admin.billing.psSection")}
                        </h3>
                      </div>
                      <div className="max-w-xs">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {t("admin.billing.commissionRateLabel")} (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={settingsForm.commission_rate}
                          onChange={(e) =>
                            setSettingsForm((f) => ({
                              ...f,
                              commission_rate: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 font-bold"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          {t("admin.billing.commissionRateHint")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Save button */}
                  <div className="px-6 pb-6">
                    <button
                      onClick={saveSettings}
                      disabled={settingsLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#FF4B19] text-white text-sm font-bold rounded-xl hover:bg-[#e04416] disabled:opacity-60 transition-colors"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18 }}
                      >
                        save
                      </span>
                      {settingsLoading
                        ? t("admin.billing.saving")
                        : t("admin.billing.saveSettings")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: Mark as Paid confirmation
      ──────────────────────────────────────────────────────────────────────── */}
      {confirmPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-lg flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-emerald-600"
                  style={{ fontSize: 22 }}
                >
                  payments
                </span>
                {t("admin.billing.markPaid")}
              </h3>
              <button
                onClick={() => setConfirmPaid(null)}
                disabled={markingPaid}
                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 22 }}
                >
                  close
                </span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  {confirmPaid.type === "sc"
                    ? t("admin.billing.tabSC")
                    : t("admin.billing.tabPS")}
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {confirmPaid.label}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                {t("admin.billing.confirmPaidHint")}
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setConfirmPaid(null)}
                disabled={markingPaid}
                className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                {t("admin.billing.cancel")}
              </button>
              <button
                onClick={() => markScPaid(confirmPaid.id)}
                disabled={markingPaid}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-colors"
              >
                {markingPaid ? (
                  <>
                    <span
                      className="material-symbols-outlined animate-spin"
                      style={{ fontSize: 16 }}
                    >
                      progress_activity
                    </span>
                    {t("admin.billing.saving")}
                  </>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      check_circle
                    </span>
                    {t("admin.billing.markPaid")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: Refund
      ──────────────────────────────────────────────────────────────────────── */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-lg">
                {t("admin.billing.processRefund")}
              </h3>
              <button
                onClick={() => setRefundModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 22 }}
                >
                  close
                </span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                {t("admin.billing.refundHint")}
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {t("admin.billing.refundAmountLabel")} (EGP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400/30 font-bold"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-5">
              <button
                onClick={() => setRefundModal(null)}
                className="px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t("admin.billing.cancel")}
              </button>
              <button
                onClick={() => setRefundModal(null)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16 }}
                >
                  undo
                </span>
                {t("admin.billing.confirmRefund")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
