"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";

interface FulfillmentOrder {
  id: string;
  status: OrderStatus;
  total_amount: number;
  payment_method: string | null;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  notes: string | null;
  created_at: string;
  users: {
    full_name: string | null;
    email: string;
    phone: string | null;
  } | null;
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_FLOW: OrderStatus[] = ["pending", "paid", "shipped", "completed"];

const PAGE_SIZE = 20;

export default function LogisticsPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<FulfillmentOrder | null>(null);
  const [trackingNote, setTrackingNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("orders")
      .select(
        "id, status, total_amount, payment_method, delivery_name, delivery_phone, delivery_address, delivery_city, notes, created_at, users(full_name, email, phone)",
        { count: "exact" },
      )
      .not("delivery_address", "is", null);

    if (statusFilter !== "all") q = q.eq("status", statusFilter as OrderStatus);
    if (search.trim()) {
      q = q.or(
        `delivery_name.ilike.%${search.trim()}%,delivery_phone.ilike.%${search.trim()}%,delivery_city.ilike.%${search.trim()}%`,
      );
    }
    q = q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await q;
    setOrders((data ?? []) as unknown as FulfillmentOrder[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [supabase, statusFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(
    id: string,
    newStatus: OrderStatus,
    note?: string,
  ) {
    setUpdating(true);
    const updates: Record<string, unknown> = { status: newStatus };
    if (note !== undefined && note.trim()) updates.notes = note.trim();
    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id);
    setMsg(
      error
        ? { text: `Error: ${error.message}`, ok: false }
        : { text: `Order marked as ${newStatus}.`, ok: true },
    );
    setTimeout(() => setMsg(null), 3000);
    setUpdating(false);
    setSelected(null);
    load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const summary = {
    pending: orders.filter((o) => o.status === "pending").length,
    paid: orders.filter((o) => o.status === "paid").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-black">{t("admin.logisticsTitle")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {total.toLocaleString()} {t("admin.ordersWithDelivery")}
        </p>
      </div>

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

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t("vendor.statusLabels.pending"),
            value: summary.pending,
            icon: "pending",
            color: "text-slate-500",
          },
          {
            label: t("vendor.statusLabels.paid"),
            value: summary.paid,
            icon: "payments",
            color: "text-blue-600",
          },
          {
            label: t("vendor.statusLabels.shipped"),
            value: summary.shipped,
            icon: "local_shipping",
            color: "text-violet-600",
          },
          {
            label: t("admin.delivered"),
            value: summary.completed,
            icon: "check_circle",
            color: "text-emerald-600",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">
                {k.label}
              </span>
              <span
                className={cn("material-symbols-outlined", k.color)}
                style={{ fontSize: 22 }}
              >
                {k.icon}
              </span>
            </div>
            <p className="text-2xl font-black">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            style={{ fontSize: 16 }}
          >
            search
          </span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search name, phone, city…"
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 w-56"
          />
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
          {(
            [
              "all",
              "pending",
              "paid",
              "shipped",
              "completed",
              "cancelled",
            ] as const
          ).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(0);
              }}
              className={cn(
                "px-2 py-1 text-xs font-bold rounded-lg capitalize transition-colors",
                statusFilter === s
                  ? "bg-[#FF4B19] text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Orders table */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span
                className="material-symbols-outlined animate-spin text-slate-400"
                style={{ fontSize: 36 }}
              >
                progress_activity
              </span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <span
                className="material-symbols-outlined block mx-auto mb-2"
                style={{ fontSize: 40 }}
              >
                local_shipping
              </span>
              <p className="text-sm">{t("admin.noOrders")}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3">
                      {t("admin.recipient")}
                    </th>
                    <th className="text-left px-3 py-3">{t("admin.city")}</th>
                    <th className="text-left px-3 py-3">{t("admin.status")}</th>
                    <th className="text-right px-5 py-3">{t("admin.total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => {
                        setSelected(o.id === selected?.id ? null : o);
                        setTrackingNote(o.notes ?? "");
                      }}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selected?.id === o.id
                          ? "bg-[#FF4B19]/5"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/30",
                      )}
                    >
                      <td className="px-5 py-3">
                        <p className="font-bold text-sm">
                          {o.delivery_name ?? o.users?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {o.delivery_phone ?? o.users?.phone ?? ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {o.delivery_city ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                            STATUS_BADGE[o.status],
                          )}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold">
                        EGP {Number(o.total_amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <p className="text-xs text-slate-500">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs text-slate-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center py-20 text-slate-400">
              <span
                className="material-symbols-outlined mb-2"
                style={{ fontSize: 40 }}
              >
                local_shipping
              </span>
              <p className="text-sm">{t("admin.selectOrder")}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black">{t("admin.fulfillmentDetails")}</h3>
                <button onClick={() => setSelected(null)}>
                  <span
                    className="material-symbols-outlined text-slate-400"
                    style={{ fontSize: 18 }}
                  >
                    close
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">
                    {t("admin.recipient")}
                  </p>
                  <p className="font-bold">{selected.delivery_name ?? "—"}</p>
                  <p className="text-xs text-slate-400">
                    {selected.delivery_phone ?? ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{t("admin.payment")}</p>
                  <p className="font-bold capitalize">
                    {selected.payment_method ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    EGP {Number(selected.total_amount).toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-1">
                    {t("admin.deliveryAddress")}
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300">
                    {[selected.delivery_address, selected.delivery_city]
                      .filter(Boolean)
                      .map((v, i) => (
                        <p key={i}>{v}</p>
                      ))}
                  </div>
                </div>
              </div>

              {/* Notes/tracking */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  {t("admin.trackingNotes")}
                </label>
                <textarea
                  value={trackingNote}
                  onChange={(e) => setTrackingNote(e.target.value)}
                  rows={2}
                  placeholder="Tracking number, courier, notes…"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 resize-none font-mono"
                />
              </div>

              {/* Status flow */}
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">
                  {t("admin.updateStatus")}
                </p>
                <div className="space-y-2">
                  {STATUS_FLOW.map((status) => {
                    const current = selected.status;
                    const isActive = current === status;
                    const isDone =
                      STATUS_FLOW.indexOf(current) >
                      STATUS_FLOW.indexOf(status);
                    return (
                      <button
                        key={status}
                        onClick={() =>
                          !isActive &&
                          updateStatus(selected.id, status, trackingNote)
                        }
                        disabled={updating || isActive}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border capitalize",
                          isActive
                            ? "border-[#FF4B19] bg-[#FF4B19]/5 text-[#FF4B19] cursor-default"
                            : isDone
                              ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400"
                              : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19]/50 text-slate-600 dark:text-slate-300",
                        )}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16 }}
                        >
                          {isDone
                            ? "check_circle"
                            : isActive
                              ? "radio_button_checked"
                              : "radio_button_unchecked"}
                        </span>
                        {status}
                      </button>
                    );
                  })}
                  <button
                    onClick={() =>
                      updateStatus(selected.id, "cancelled", trackingNote)
                    }
                    disabled={updating}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      cancel
                    </span>
                    {t("admin.cancelOrder")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
