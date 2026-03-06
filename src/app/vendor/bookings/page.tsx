"use client";

import { useEffect, useState, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/types/database";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: { value: BookingStatus; label: string; color: string }[] = [
  { value: "booked", label: "Booked", color: "bg-slate-100 text-slate-700" },
  {
    value: "confirmed",
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "checked_in",
    label: "Checked In",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-amber-100 text-amber-700",
  },
  {
    value: "waiting_parts",
    label: "Waiting Parts",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "ready_for_pickup",
    label: "Ready for Pickup",
    color: "bg-teal-100 text-teal-700",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-green-100 text-green-700",
  },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

const STATUS_COLOR: Record<BookingStatus, string> = Object.fromEntries(
  STATUSES.map((s) => [s.value, s.color]),
) as Record<BookingStatus, string>;

// ── Main component ────────────────────────────────────────────────────────────

export default function VendorBookingsPage() {
  const { vendor, vendorType } = useAuth();
  const supabase = createClient();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState("");

  const loadBookings = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const q = supabase
      .from("bookings")
      .select(
        "*, user:users(full_name,email,phone), vehicle:vehicles(*), service:services(name,price)",
      )
      .eq("vendor_id", vendor.id)
      .order("booking_date", { ascending: false });

    const { data } = filter === "all" ? await q : await q.eq("status", filter);
    setBookings(data ?? []);
    setLoading(false);
  }, [vendor, filter, supabase]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!vendor) return;
    const channel = supabase
      .channel("vendor-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `vendor_id=eq.${vendor.id}`,
        },
        () => loadBookings(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor, supabase, loadBookings]);

  const updateStatus = async (bookingId: string, status: BookingStatus) => {
    setUpdating(true);
    await supabase.from("bookings").update({ status }).eq("id", bookingId);

    if (note) {
      await supabase.from("booking_status_history").insert({
        booking_id: bookingId,
        status,
        note,
        changed_at: new Date().toISOString(),
      });
      setNote("");
    }

    setSelected((prev: any) => (prev ? { ...prev, status } : null));
    setUpdating(false);
    loadBookings();
  };

  // Guard: only service centers
  if (vendorType && vendorType !== "service_center") {
    return (
      <VendorLayout>
        <div className="text-center py-20 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-4 block">
            block
          </span>
          <p className="font-semibold">
            Booking management is only available for Service Centers.
          </p>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Bookings</h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage and update your service bookings.
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === "all" ? "bg-[#FF4B19] text-white" : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === s.value ? "bg-[#FF4B19] text-white" : `${s.color} border border-transparent hover:opacity-80`}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              Loading bookings…
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">
                calendar_month
              </span>
              <p className="font-semibold text-slate-500">No bookings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Customer
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Service
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Vehicle
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bookings.map((b: any) => (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {b.user?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {b.user?.phone ?? b.user?.email ?? ""}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                        {b.service?.name ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                        {b.vehicle
                          ? `${b.vehicle.make} ${b.vehicle.model} ${b.vehicle.year}`
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                        {b.booking_date}
                        {b.booking_time && (
                          <span className="block text-xs text-slate-400">
                            {b.booking_time}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_COLOR[b.status as BookingStatus]}`}
                        >
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelected(b)}
                          className="text-[#FF4B19] text-xs font-bold hover:underline"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <h3 className="font-black text-lg mb-1">Update Booking Status</h3>
            <p className="text-sm text-slate-500 mb-5">
              {selected.user?.full_name} — {selected.service?.name} on{" "}
              {selected.booking_date}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  disabled={updating}
                  onClick={() => updateStatus(selected.id, s.value)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                    selected.status === s.value
                      ? "border-[#FF4B19] bg-[#FF4B19]/10 text-[#FF4B19]"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 hover:border-[#FF4B19]/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Optional note for customer
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Your car is ready for pickup at Gate 3"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
              />
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold py-2.5 rounded-xl text-sm transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
