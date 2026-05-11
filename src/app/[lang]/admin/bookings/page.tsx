"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BookingStatus =
  | "booked"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "waiting_parts"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "no_show";

interface Booking {
  id: string;
  display_id: number;
  booking_date: string;
  booking_type: string;
  status: BookingStatus;
  notes: string | null;
  total_price: number | null;
  mileage: number | null;
  cancelled_by: string | null;
  created_at: string;
  users: { full_name: string | null; email: string } | null;
  vendors: { business_name: string } | null;
  services?: { name: string } | null;
}

const STATUS_BADGE: Record<BookingStatus, string> = {
  booked: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  checked_in:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  waiting_parts:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ready_for_pickup:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  no_show: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

const PAGE_SIZE = 20;

export default function AdminBookingsPage() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("bookings")
      .select(
        "id, display_id, booking_date, booking_type, status, notes, total_price, mileage, cancelled_by, created_at, users(full_name, email), vendors(business_name)",
        { count: "exact" },
      );

    if (statusFilter !== "all")
      q = q.eq("status", statusFilter as BookingStatus);
    if (typeFilter !== "all")
      q = q.eq(
        "booking_type",
        typeFilter as "routine_maintenance" | "inspection",
      );

    q = q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await q;
    if (error) console.error("[AdminBookings] fetch error:", error.message);
    setBookings((data ?? []) as unknown as Booking[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [supabase, statusFilter, typeFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function forceCancel(id: string) {
    setUpdating(id);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);
    setMsg(error ? `Error: ${error.message}` : "Booking cancelled.");
    setTimeout(() => setMsg(null), 3000);
    setUpdating(null);
    load();
  }

  const selected = bookings.find((b) => b.id === selectedId);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">{t("admin.bookingsTitle")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total.toLocaleString()} {t("admin.totalBookings").toLowerCase()}
          </p>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 rounded-xl text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
        >
          <option value="all">{t("admin.allStatuses")}</option>
          {(
            [
              "booked",
              "confirmed",
              "checked_in",
              "in_progress",
              "waiting_parts",
              "ready_for_pickup",
              "completed",
              "cancelled",
              "no_show",
            ] as BookingStatus[]
          ).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
        >
          <option value="all">{t("admin.allTypes")}</option>
          <option value="routine_maintenance">
            {t("admin.routineMaintenance")}
          </option>
          <option value="inspection">{t("admin.inspection")}</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {[
                    t("admin.user"),
                    t("admin.serviceCenter"),
                    t("admin.date"),
                    t("admin.type"),
                    t("admin.status"),
                    t("admin.amount"),
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <span
                        className="material-symbols-outlined animate-spin text-slate-400"
                        style={{ fontSize: 28 }}
                      >
                        progress_activity
                      </span>
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-slate-400 text-sm"
                    >
                      {t("admin.noBookings")}
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() =>
                        setSelectedId(b.id === selectedId ? null : b.id)
                      }
                      className={cn(
                        "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors",
                        selectedId === b.id &&
                          "bg-[#FF4B19]/5 dark:bg-[#FF4B19]/10",
                        b.status === "no_show" && "border-l-4 border-red-400",
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-sm">
                          {b.users?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {b.users?.email ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {b.vendors?.business_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {b.booking_date}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                          {b.booking_type === "routine_maintenance"
                            ? t("vendor.routineMaintenance")
                            : t("vendor.inspection")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                            STATUS_BADGE[b.status],
                          )}
                        >
                          {b.status === "no_show" && (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 12 }}
                            >
                              warning
                            </span>
                          )}
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-sm">
                        {b.total_price
                          ? `EGP ${Number(b.total_price).toLocaleString()}`
                          : "—"}
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
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  \u2190 {t("admin.prev")}
                </button>
                <span className="text-xs text-slate-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {t("admin.next")} \u2192
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 h-fit">
          {!selected ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span
                className="material-symbols-outlined mb-2"
                style={{ fontSize: 36 }}
              >
                calendar_month
              </span>
              <p className="text-sm">{t("admin.selectBooking")}</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black">{t("admin.bookingDetails")}</h3>
                <button onClick={() => setSelectedId(null)}>
                  <span
                    className="material-symbols-outlined text-slate-400"
                    style={{ fontSize: 18 }}
                  >
                    close
                  </span>
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                      STATUS_BADGE[selected.status],
                    )}
                  >
                    {selected.status === "no_show" && (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 12 }}
                      >
                        warning
                      </span>
                    )}
                    {selected.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* No-show fraud alert */}
                {selected.status === "no_show" && (
                  <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <span
                      className="material-symbols-outlined text-red-500 shrink-0 mt-0.5"
                      style={{ fontSize: 16 }}
                    >
                      report
                    </span>
                    <p className="text-xs text-red-700 dark:text-red-400 font-semibold leading-snug">
                      No-show reported by vendor — flagged for fraud review.
                      Please verify before taking action.
                    </p>
                  </div>
                )}

                {[
                  {
                    label: "Booking ID",
                    value: "#" + String(selected.display_id).padStart(3, "0"),
                  },
                  {
                    label: "Customer",
                    value: selected.users?.full_name ?? "—",
                  },
                  { label: "Email", value: selected.users?.email ?? "—" },
                  {
                    label: "Service Center",
                    value: selected.vendors?.business_name ?? "—",
                  },
                  {
                    label: "Service",
                    value:
                      selected.services?.name ??
                      (selected.booking_type === "routine_maintenance"
                        ? t("vendor.routineMaintenance")
                        : t("vendor.inspection")),
                  },
                  { label: "Date", value: selected.booking_date },
                  {
                    label: "Type",
                    value:
                      selected.booking_type === "routine_maintenance"
                        ? t("vendor.routineMaintenance")
                        : t("vendor.inspection"),
                  },
                  {
                    label: "Mileage",
                    value: selected.mileage
                      ? `${selected.mileage.toLocaleString()} km`
                      : "—",
                  },
                  {
                    label: "Total",
                    value: selected.total_price
                      ? `EGP ${Number(selected.total_price).toLocaleString()}`
                      : "—",
                  },
                  selected.cancelled_by
                    ? { label: "Cancelled by", value: selected.cancelled_by }
                    : null,
                  {
                    label: "Created",
                    value: new Date(selected.created_at).toLocaleDateString(
                      "en-EG",
                      { month: "short", day: "numeric", year: "numeric" },
                    ),
                  },
                ]
                  .filter(Boolean)
                  .map((row) => (
                    <div key={row!.label} className="flex justify-between">
                      <span className="text-slate-400 text-xs">
                        {row!.label}
                      </span>
                      <span className="font-semibold text-xs text-right">
                        {row!.value}
                      </span>
                    </div>
                  ))}

                {selected.notes && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">
                      {t("admin.notes")}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                      {selected.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin actions */}
              <div className="pt-2 space-y-2">
                {selected.status !== "cancelled" &&
                  selected.status !== "no_show" &&
                  selected.status !== "completed" && (
                    <button
                      onClick={() => forceCancel(selected.id)}
                      disabled={updating === selected.id}
                      className="w-full px-4 py-2.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-200 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        cancel
                      </span>
                      {t("admin.forceCancel")}
                    </button>
                  )}
                <Link
                  href={`/admin/bookings/${selected.id}`}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16 }}
                  >
                    open_in_new
                  </span>
                  {t("admin.fullDetails")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
