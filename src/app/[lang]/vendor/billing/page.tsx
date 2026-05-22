"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  getMyBillingHistory,
  getMyTransactionHistory,
  currentBillingPeriod,
  type ServiceCenterBillingRecord,
  type PartsSellerTransaction,
} from "@/services/billingService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Banknote,
  ChevronRight,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function egp(n: number) {
  return `EGP ${Number(n).toLocaleString("en-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment instructions modal (for SC vendors with a pending bill)
// ─────────────────────────────────────────────────────────────────────────────

function PaymentModal({
  bill,
  open,
  onClose,
  onSubmitted,
}: {
  bill: ServiceCenterBillingRecord | null;
  open: boolean;
  onClose: () => void;
  onSubmitted: (billingId: string) => void;
}) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset state when a new bill is opened
  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setSubmitting(false);
    }
  }, [open, bill?.id]);

  if (!bill) return null;

  async function handleGotIt() {
    if (!bill) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/billing/submit-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingId: bill.id }),
      });
      if (res.ok) {
        setSubmitted(true);
        onSubmitted(bill.id);
      }
    } catch {
      // Non-fatal — the modal still closes
    }
    setSubmitting(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pay Invoice
          </DialogTitle>
        </DialogHeader>

        {/* Invoice summary */}
        <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Period</span>
            <span className="font-semibold">
              {fmt(bill.period_start)} – {fmt(bill.period_end)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bookings</span>
            <span className="font-semibold">{bill.bookings_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee / Booking</span>
            <span className="font-semibold">{egp(bill.booking_fee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-black">
            <span>{t("vendor.billing.colTotal")}</span>
            <span className="text-primary">{egp(bill.total_fees_due)}</span>
          </div>
        </div>

        {/* Payment instructions */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">How to pay:</p>
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2 text-sm text-blue-900 dark:text-blue-200">
            <div className="flex items-start gap-2">
              <Banknote className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <p className="font-bold">Bank Transfer</p>
                <p>Bank: CIB Egypt</p>
                <p>Account name: Garage Egypt Platform</p>
                <p>Account number: 1234 5678 9012 3456</p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  Use your business name as the transfer reference.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            After transferring, click the button below. Our team will verify and
            mark your invoice as paid within 1–2 business days.
          </p>
        </div>

        <Button
          onClick={handleGotIt}
          disabled={submitting || submitted}
          className="w-full"
        >
          {submitting
            ? "Submitting…"
            : submitted
              ? "Payment Submitted ✓"
              : "I've Transferred — Notify Team"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function VendorBillingPage() {
  const { vendor, vendorType } = useAuth();
  const { t } = useLanguage();
  const isService = vendorType === "service_center";

  const [loading, setLoading] = useState(true);
  const [ensuring, setEnsuring] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // SC state
  const [bills, setBills] = useState<ServiceCenterBillingRecord[]>([]);
  // Live current-period booking count
  const [currentPeriodCount, setCurrentPeriodCount] = useState<number | null>(
    null,
  );

  // PS state
  const [transactions, setTransactions] = useState<PartsSellerTransaction[]>(
    [],
  );
  const [psPending, setPsPending] = useState(0);
  const [psPaid, setPsPaid] = useState(0);

  // SC payment modal
  const [payBill, setPayBill] = useState<ServiceCenterBillingRecord | null>(
    null,
  );

  // Current in-progress period (SC only)
  const currentPeriod = useMemo(() => {
    if (!isService || !vendor) return null;
    const anchor = vendor.approved_at ?? vendor.created_at;
    if (!anchor) return null;
    return currentBillingPeriod(new Date(anchor));
  }, [isService, vendor]);

  // Period detail dialog state
  const [detailPeriod, setDetailPeriod] = useState<{
    start: string;
    end: string;
    label: string;
    fee: number;
    isLive?: boolean;
  } | null>(null);
  const [detailBookings, setDetailBookings] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const openPeriodDetail = useCallback(
    async (
      start: string,
      end: string,
      label: string,
      fee: number,
      isLive = false,
    ) => {
      setDetailPeriod({ start, end, label, fee, isLive });
      setDetailBookings([]);
      setDetailLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, booking_date, booking_time, booking_type, service_key, user:users!left(full_name, phone)",
        )
        .eq("vendor_id", vendor!.id)
        .eq("status", "completed")
        .gte("booking_date", start)
        .lte("booking_date", end)
        .order("booking_date", { ascending: true });
      setDetailBookings(data ?? []);
      setDetailLoading(false);
    },
    [vendor, supabase],
  );

  // Fetch live count of completed bookings in the current period
  const fetchCurrentPeriodCount = useCallback(async () => {
    if (!vendor || !currentPeriod) return;
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendor.id)
      .eq("status", "completed")
      .gte("booking_date", currentPeriod.start)
      .lte("booking_date", currentPeriod.end);
    setCurrentPeriodCount(count ?? 0);
  }, [vendor, currentPeriod, supabase]);

  // Subscribe to realtime booking changes for live count updates
  useEffect(() => {
    if (!vendor || !isService || !currentPeriod) return;
    fetchCurrentPeriodCount();
    const channel = supabase
      .channel("billing-current-period")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `vendor_id=eq.${vendor.id}`,
        },
        () => fetchCurrentPeriodCount(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor, isService, currentPeriod, supabase, fetchCurrentPeriodCount]);

  // SC summary
  const totalPending = useMemo(
    () =>
      bills
        .filter((b) => b.payment_status === "pending")
        .reduce((s, b) => s + Number(b.total_fees_due ?? 0), 0),
    [bills],
  );
  const totalPaid = useMemo(
    () =>
      bills
        .filter((b) => b.payment_status === "paid")
        .reduce((s, b) => s + Number(b.total_fees_due ?? 0), 0),
    [bills],
  );

  // ── Ensure bills are generated, then load ────────────────────────────────
  const load = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);

    // Trigger auto-generation of any missing billing periods (SC only)
    if (isService) {
      setEnsuring(true);
      try {
        await fetch("/api/vendor/billing/ensure", { method: "POST" });
      } catch {
        // Non-fatal — billing records that already exist will still load
      }
      setEnsuring(false);
    }

    if (isService) {
      const { data } = await getMyBillingHistory(vendor.id);
      setBills(data);
    } else {
      const { data, pendingTotal, paidTotal } = await getMyTransactionHistory(
        vendor.id,
      );
      setTransactions(data);
      setPsPending(pendingTotal);
      setPsPaid(paidTotal);
    }

    setLoading(false);
  }, [vendor, isService]);

  useEffect(() => {
    load();
  }, [load]);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading skeleton
  // ─────────────────────────────────────────────────────────────────────────
  if (loading || ensuring) {
    return (
      <VendorLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-muted rounded-2xl animate-pulse"
              />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-2xl animate-pulse" />
        </div>
      </VendorLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERVICE CENTER view
  // ─────────────────────────────────────────────────────────────────────────
  if (isService) {
    return (
      <VendorLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              {t("vendor.billing.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("vendor.billing.scSubtitle")}
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xl font-black">{egp(totalPending)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("vendor.billing.pendingAmount")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xl font-black">{egp(totalPaid)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("vendor.billing.paidAmount")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-xl font-black text-blue-700 dark:text-blue-400">
                        {currentPeriodCount === null ? "…" : currentPeriodCount}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        bookings this period
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentPeriod
                        ? `${fmt(currentPeriod.start)} – ${fmt(currentPeriod.end)}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t("vendor.billing.scInfo")}
            </p>
          </div>

          {/* Bills table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("vendor.billing.invoicesTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bills.length === 0 && currentPeriodCount === null ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  {t("vendor.billing.noInvoices")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        {[
                          t("vendor.billing.colPeriod"),
                          t("vendor.billing.colBookings"),
                          t("vendor.billing.colFee"),
                          t("vendor.billing.colTotal"),
                          t("vendor.billing.colStatus"),
                          t("vendor.billing.colAction"),
                        ].map((h, i) => (
                          <th
                            key={i}
                            className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* ── Current in-progress period (live) ─────────────── */}
                      {/* Only show the live row if there is NO billing record for the current period yet */}
                      {currentPeriod &&
                        currentPeriodCount !== null &&
                        !bills.find(
                          (b) =>
                            b.period_start === currentPeriod.start &&
                            b.period_end === currentPeriod.end,
                        ) &&
                        (() => {
                          // find the booking_fee from the most recent bill, or fall back to 75
                          const fee = bills[0]?.booking_fee ?? 75;
                          const estimate = currentPeriodCount * fee;
                          return (
                            <tr
                              className="bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                              onClick={() =>
                                openPeriodDetail(
                                  currentPeriod.start,
                                  currentPeriod.end,
                                  `${fmt(currentPeriod.start)} – ${fmt(currentPeriod.end)}`,
                                  fee,
                                  true,
                                )
                              }
                            >
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-700 dark:text-blue-400">
                                <span className="flex items-center gap-1">
                                  {fmt(currentPeriod.start)} –{" "}
                                  {fmt(currentPeriod.end)}
                                  <ChevronRight className="h-3 w-3 text-blue-500" />
                                </span>
                                <span className="ml-0 inline-block text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-semibold">
                                  In Progress
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-blue-700 dark:text-blue-400">
                                {currentPeriodCount}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                {egp(fee)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700 dark:text-blue-400">
                                ~{egp(estimate)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300">
                                  Accumulating
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                Billed at month-end
                              </td>
                            </tr>
                          );
                        })()}
                      {bills.map((bill) => (
                        <tr
                          key={bill.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() =>
                            openPeriodDetail(
                              bill.period_start,
                              bill.period_end,
                              `${fmt(bill.period_start)} – ${fmt(bill.period_end)}`,
                              bill.booking_fee,
                            )
                          }
                        >
                          <td className="px-4 py-3 whitespace-nowrap font-medium">
                            <span className="flex items-center gap-1">
                              {fmt(bill.period_start)} – {fmt(bill.period_end)}
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {bill.bookings_count}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {egp(bill.booking_fee)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-bold">
                            {egp(bill.total_fees_due)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                bill.payment_status === "paid"
                                  ? "default"
                                  : "secondary"
                              }
                              className={cn(
                                bill.payment_status === "paid"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                  : bill.payment_status === "payment_submitted"
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-amber-100 text-amber-700 hover:bg-amber-100",
                              )}
                            >
                              {bill.payment_status === "paid"
                                ? t("vendor.billing.statusPaid")
                                : bill.payment_status === "payment_submitted"
                                  ? t("vendor.billing.statusSubmitted")
                                  : t("vendor.billing.statusPending")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {bill.payment_status === "pending" ? (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPayBill(bill);
                                }}
                                className="text-xs"
                              >
                                {t("vendor.billing.payBtn")}
                              </Button>
                            ) : bill.payment_status === "payment_submitted" ? (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t("vendor.billing.awaitingApproval")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {bill.payment_date
                                  ? fmt(bill.payment_date)
                                  : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment modal */}
        <PaymentModal
          bill={payBill}
          open={!!payBill}
          onClose={() => setPayBill(null)}
          onSubmitted={(billingId) => {
            // Optimistically update local state so badge changes immediately
            setBills((prev) =>
              prev.map((b) =>
                b.id === billingId
                  ? { ...b, payment_status: "payment_submitted" }
                  : b,
              ),
            );
            setPayBill(null);
          }}
        />

        {/* Period detail dialog */}
        <Dialog
          open={!!detailPeriod}
          onOpenChange={(o) => !o && setDetailPeriod(null)}
        >
          <DialogContent className="w-full max-w-3xl sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Completed Bookings
              </DialogTitle>
              <DialogDescription>
                {detailPeriod?.label}
                {detailPeriod?.isLive && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    In Progress
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : detailBookings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No completed bookings in this period
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50 sticky top-0">
                    <tr>
                      {["Date", "Customer", "Type", "Fee"].map((h, i) => (
                        <th
                          key={i}
                          className="text-left px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detailBookings.map((b: any, i: number) => (
                      <tr key={b.id ?? i} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <p className="font-medium">{b.booking_date}</p>
                          {b.booking_time && (
                            <p className="text-xs text-muted-foreground">
                              {b.booking_time}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium">
                            {b.user?.full_name ?? "—"}
                          </p>
                          {b.user?.phone && (
                            <p className="text-xs text-muted-foreground">
                              {b.user.phone}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {b.service_key ??
                            (b.booking_type === "routine_maintenance"
                              ? t("vendor.routineMaintenance")
                              : b.booking_type === "inspection"
                                ? t("vendor.inspection")
                                : (b.booking_type ?? "—"))}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {egp(detailPeriod?.fee ?? 75)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/50">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-2.5 font-bold text-right"
                      >
                        {detailBookings.length} bookings ×{" "}
                        {egp(detailPeriod?.fee ?? 75)}
                      </td>
                      <td className="px-3 py-2.5 font-black text-base text-primary whitespace-nowrap">
                        {detailPeriod?.isLive ? "~" : ""}
                        {egp(detailBookings.length * (detailPeriod?.fee ?? 75))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </VendorLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PARTS SELLER view  (commission earned, paid by platform)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            {t("vendor.billing.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("vendor.billing.psSubtitle")}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-black">{egp(psPending)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("vendor.billing.pendingPayout")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-black">{egp(psPaid)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("vendor.billing.totalReceived")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t("vendor.billing.psInfo")}
          </p>
        </div>

        {/* Transactions table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("vendor.billing.transactionsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                {t("vendor.billing.noTransactions")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      {[
                        t("vendor.billing.colDate"),
                        t("vendor.billing.colOrderAmount"),
                        t("vendor.billing.colCommission"),
                        t("vendor.billing.colYourShare"),
                        t("vendor.billing.colStatus"),
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className={cn(
                          "hover:bg-muted/30 transition-colors",
                          tx.refunded && "opacity-60",
                        )}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {fmt(tx.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {egp(tx.final_order_amount)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tx.commission_rate}%{" "}
                          <span className="text-xs">
                            ({egp(tx.platform_share)})
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">
                          {egp(tx.vendor_share)}
                        </td>
                        <td className="px-4 py-3">
                          {tx.refunded ? (
                            <Badge
                              variant="secondary"
                              className="bg-red-100 text-red-700 hover:bg-red-100"
                            >
                              Refunded
                            </Badge>
                          ) : (
                            <Badge
                              variant={
                                tx.payment_status === "paid"
                                  ? "default"
                                  : "secondary"
                              }
                              className={cn(
                                tx.payment_status === "paid"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-100",
                              )}
                            >
                              {tx.payment_status === "paid"
                                ? t("vendor.billing.statusPaid")
                                : t("vendor.billing.statusPending")}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}
