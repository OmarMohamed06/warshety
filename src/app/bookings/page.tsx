"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting_parts: "bg-orange-100 text-orange-700",
  ready_for_pickup: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ACTIVE_STATUSES = [
  "booked",
  "confirmed",
  "checked_in",
  "in_progress",
  "waiting_parts",
  "ready_for_pickup",
];

export default function MyBookingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("all");

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let q = supabase
      .from("bookings")
      .select(
        "*, vendor:vendors(business_name,city), vehicle:vehicles(*), service:services(name,price)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data } = await q;
    let all = data ?? [];

    if (filter === "active")
      all = all.filter((b: any) => ACTIVE_STATUSES.includes(b.status));
    else if (filter === "completed")
      all = all.filter((b: any) =>
        ["completed", "cancelled"].includes(b.status),
      );

    setBookings(all);
    setLoading(false);
  }, [user, filter, supabase]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  if (authLoading)
    return (
      <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF4B19]/20 border-t-[#FF4B19] rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-black">My Bookings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track your vehicle service history and live status.
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${filter === f ? "bg-[#FF4B19] text-white" : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              calendar_month
            </span>
            <p className="font-black text-lg mb-2">No bookings yet</p>
            <p className="text-slate-500 text-sm mb-6">
              Book a service at one of our trusted workshops.
            </p>
            <Link
              href="/services"
              className="bg-[#FF4B19] text-white font-black px-6 py-3 rounded-xl hover:bg-[#e03d10] transition"
            >
              Find Service Centers
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b: any) => (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base truncate">
                      {b.vendor?.business_name ?? "Service Center"}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[12px]">
                        location_on
                      </span>
                      {b.vendor?.city ?? ""}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {b.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {b.service && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="material-symbols-outlined text-[14px]">
                        home_repair_service
                      </span>
                      <span className="truncate">{b.service.name}</span>
                    </div>
                  )}
                  {b.vehicle && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="material-symbols-outlined text-[14px]">
                        directions_car
                      </span>
                      <span className="truncate">
                        {b.vehicle.make} {b.vehicle.model}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">
                      calendar_today
                    </span>
                    {b.booking_date}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  {ACTIVE_STATUSES.includes(b.status) && (
                    <Link
                      href={`/bookings/${b.id}`}
                      className="flex items-center gap-1.5 bg-[#FF4B19] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#e03d10] transition"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        my_location
                      </span>
                      Track Live
                    </Link>
                  )}
                  <Link
                    href={`/bookings/${b.id}`}
                    className="text-xs text-slate-500 hover:text-[#FF4B19] transition font-semibold"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
