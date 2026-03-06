"use client";

import { useEffect, useState, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface CalendarBooking {
  id: string;
  booking_date: string;
  booking_time: string | null;
  status: string;
  notes: string | null;
  total_price: number | null;
  user: { full_name: string | null; phone: string | null } | null;
  service: { name: string } | null;
  vehicle: { make: string; model: string; year: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  checked_in: "bg-purple-100 text-purple-700 border-purple-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  waiting_parts: "bg-orange-100 text-orange-700 border-orange-200",
  ready_for_pickup: "bg-teal-100 text-teal-700 border-teal-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

function getMonthDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const dates: Date[] = [];
  // Pad start
  for (let i = 0; i < first.getDay(); i++) {
    dates.push(new Date(year, month, -i));
  }
  dates.reverse();
  for (let d = 1; d <= last.getDate(); d++) {
    dates.push(new Date(year, month, d));
  }
  // Pad end to fill 6 rows
  while (dates.length % 7 !== 0) {
    dates.push(
      new Date(
        year,
        month + 1,
        dates.length - last.getDate() - first.getDay() + 1,
      ),
    );
  }
  return dates;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function VendorCalendarPage() {
  const { vendor, vendorType, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    today.toISOString().slice(0, 10),
  );

  // Guard: service_center only
  useEffect(() => {
    if (!isLoading && vendorType && vendorType !== "service_center") {
      router.replace("/vendor/dashboard");
    }
  }, [isLoading, vendorType, router]);

  const loadBookings = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const firstDay = new Date(viewYear, viewMonth, 1)
      .toISOString()
      .slice(0, 10);
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
      .toISOString()
      .slice(0, 10);

    const { data } = await supabase
      .from("bookings")
      .select(
        `
        id, booking_date, booking_time, status, notes, total_price,
        user:users(full_name, phone),
        service:services(name),
        vehicle:vehicles(make, model, year)
      `,
      )
      .eq("vendor_id", vendor.id)
      .gte("booking_date", firstDay)
      .lte("booking_date", lastDay)
      .neq("status", "cancelled")
      .order("booking_time", { ascending: true });

    setBookings((data ?? []) as unknown as CalendarBooking[]);
    setLoading(false);
  }, [vendor, supabase, viewYear, viewMonth]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const dates = getMonthDates(viewYear, viewMonth);

  // Group by date string
  const byDate: Record<string, CalendarBooking[]> = {};
  bookings.forEach((b) => {
    if (!byDate[b.booking_date]) byDate[b.booking_date] = [];
    byDate[b.booking_date].push(b);
  });

  const selectedBookings = selectedDate ? (byDate[selectedDate] ?? []) : [];

  const isCurrentMonth = (d: Date) => d.getMonth() === viewMonth;
  const isToday = (d: Date) =>
    d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);

  return (
    <VendorLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Appointment Calendar</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              View and manage your bookings by date
            </p>
          </div>
          <button
            onClick={loadBookings}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              refresh
            </span>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
                >
                  chevron_left
                </span>
              </button>
              <h2 className="text-lg font-black">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
                >
                  chevron_right
                </span>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-bold text-slate-400 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Date grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <span
                  className="material-symbols-outlined animate-spin mr-2"
                  style={{ fontSize: "24px" }}
                >
                  progress_activity
                </span>
                Loading…
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {dates.map((d, i) => {
                  const iso = d.toISOString().slice(0, 10);
                  const count = (byDate[iso] ?? []).length;
                  const isSelected = selectedDate === iso;
                  const inMonth = isCurrentMonth(d);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(iso)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                        isSelected
                          ? "bg-[#FF4B19] text-white shadow-lg shadow-[#FF4B19]/20"
                          : isToday(d)
                            ? "border-2 border-[#FF4B19] font-bold"
                            : ""
                      } ${inMonth ? "" : "opacity-30"} hover:bg-[#FF4B19]/10 ${
                        isSelected ? "hover:bg-[#FF4B19]" : ""
                      }`}
                    >
                      <span
                        className={`font-bold ${isSelected ? "text-white" : ""}`}
                      >
                        {d.getDate()}
                      </span>
                      {count > 0 && (
                        <span
                          className={`text-[10px] font-bold mt-0.5 ${
                            isSelected ? "text-white/80" : "text-[#FF4B19]"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar: selected day bookings */}
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
              <h3 className="font-black text-sm mb-3">
                {selectedDate
                  ? new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      "en-EG",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : "Select a date"}
              </h3>

              {selectedBookings.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No bookings for this day
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedBookings.map((b) => (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border ${
                        STATUS_COLORS[b.status] ??
                        "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">
                          {b.booking_time ?? "Time TBD"}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="font-bold text-sm">
                        {b.user?.full_name ?? "Unknown Customer"}
                      </p>
                      {b.service && (
                        <p className="text-xs opacity-75">{b.service.name}</p>
                      )}
                      {b.vehicle && (
                        <p className="text-xs opacity-60">
                          {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                        </p>
                      )}
                      {b.total_price && (
                        <p className="text-xs font-bold mt-1">
                          EGP {b.total_price.toLocaleString("en-EG")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Month summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
              <h3 className="font-black text-sm mb-3">Month Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bookings</span>
                  <span className="font-bold">{bookings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Busiest Day</span>
                  <span className="font-bold">
                    {Object.entries(byDate).sort(
                      (a, b) => b[1].length - a[1].length,
                    )[0]?.[0]
                      ? new Date(
                          Object.entries(byDate).sort(
                            (a, b) => b[1].length - a[1].length,
                          )[0][0] + "T00:00:00",
                        ).toLocaleDateString("en-EG", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Revenue (est.)</span>
                  <span className="font-bold">
                    EGP{" "}
                    {bookings
                      .reduce((s, b) => s + (b.total_price ?? 0), 0)
                      .toLocaleString("en-EG")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
}
