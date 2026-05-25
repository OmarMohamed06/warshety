"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type PayStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "partially_refunded";

interface Transaction {
  id: string;
  reference_type: string;
  reference_id: string;
  amount: number;
  commission: number;
  net_to_vendor: number;
  method: string;
  status: PayStatus;
  gateway_ref: string | null;
  notes: string | null;
  created_at: string;
  users: { full_name: string | null; email: string } | null;
  vendors: { business_name: string } | null;
}

const STATUS_BADGE: Record<PayStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  partially_refunded:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const PAGE_SIZE = 20;

export default function PaymentsPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    pendingPayout: 0,
    refunded: 0,
    totalBillingRecords: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);

    const [txRes, billingRes] = await Promise.all([
      (() => {
        let q = db
          .from("payment_transactions")
          .select(
            "id, reference_type, reference_id, amount, commission, net_to_vendor, method, status, gateway_ref, notes, created_at, users(full_name, email), vendors(business_name)",
            { count: "exact" },
          );
        if (statusFilter !== "all") q = q.eq("status", statusFilter);
        if (methodFilter !== "all") q = q.eq("method", methodFilter);
        return q
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      })(),
      (supabase as any)
        .from("service_center_billing")
        .select("payment_status, total_fees_due"),
    ]);

    setTransactions((txRes.data ?? []) as unknown as Transaction[]);
    setTotal(txRes.count ?? 0);

    const billingRows = billingRes.data ?? [];
    const totalRevenue = billingRows
      .filter((b: any) => b.payment_status === "paid")
      .reduce((s: number, b: any) => s + Number(b.total_fees_due), 0);
    const pendingPayout = billingRows
      .filter((b: any) => b.payment_status === "pending")
      .reduce((s: number, b: any) => s + Number(b.total_fees_due), 0);
    const refunded = billingRows
      .filter((b: any) => b.payment_status === "waived")
      .reduce((s: number, b: any) => s + Number(b.total_fees_due), 0);
    setSummary({
      totalRevenue,
      pendingPayout,
      refunded,
      totalBillingRecords: billingRows.length,
    });
    setLoading(false);
  }, [supabase, statusFilter, methodFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-black">{t("admin.paymentsTitle")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {t("admin.financialRecords")}
        </p>
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 rounded-xl text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: t("admin.totalRevenue"),
            value: `EGP ${summary.totalRevenue.toLocaleString()}`,
            icon: "payments",
            color: "text-emerald-600",
            bg: "bg-emerald-100 dark:bg-emerald-900/30",
          },
          {
            label: t("admin.pendingPayout"),
            value: `EGP ${summary.pendingPayout.toLocaleString()}`,
            icon: "account_balance",
            color: "text-amber-600",
            bg: "bg-amber-100 dark:bg-amber-900/30",
          },
          {
            label: t("admin.cancelledRefund"),
            value: `EGP ${summary.refunded.toLocaleString()}`,
            icon: "undo",
            color: "text-red-600",
            bg: "bg-red-100 dark:bg-red-900/30",
          },
          {
            label: t("admin.totalOrders"),
            value: summary.totalBillingRecords.toLocaleString(),
            icon: "receipt",
            color: "text-blue-600",
            bg: "bg-blue-100 dark:bg-blue-900/30",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                s.bg,
              )}
            >
              <span
                className={cn("material-symbols-outlined", s.color)}
                style={{ fontSize: 22 }}
              >
                {s.icon}
              </span>
            </div>
            <p className="text-xl font-black">{loading ? "…" : s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
          >
            <option value="all">{t("admin.allStatuses")}</option>
            {(
              [
                "pending",
                "completed",
                "failed",
                "refunded",
                "partially_refunded",
              ] as PayStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
          >
            <option value="all">{t("admin.allMethods")}</option>
            {["card", "cod", "wallet", "bank_transfer"].map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {[
                    t("admin.customer"),
                    t("admin.vendor"),
                    t("admin.amount"),
                    t("admin.commission"),
                    t("admin.net"),
                    t("admin.method"),
                    t("admin.type"),
                    t("admin.status"),
                    t("admin.date"),
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <span
                        className="material-symbols-outlined animate-spin text-slate-400"
                        style={{ fontSize: 28 }}
                      >
                        progress_activity
                      </span>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-16 text-center text-slate-400 text-sm"
                    >
                      {t("admin.noTransactions")}
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-5 py-3">
                        <p className="font-bold text-sm">
                          {t.users?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t.users?.email ?? ""}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {t.vendors?.business_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-black">
                        EGP {Number(t.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        EGP {Number(t.commission).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-semibold text-emerald-600">
                        EGP {Number(t.net_to_vendor).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                          {t.method}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 capitalize">
                        {t.reference_type}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                            STATUS_BADGE[t.status],
                          )}
                        >
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString("en-EG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
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
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
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
    </div>
  );
}
