"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import type { BookingStatus } from "@/types/database";

interface Booking {
  id: string;
  display_id: string | null;
  status: BookingStatus;
  service_date: string | null;
  service_time: string | null;
  note: string | null;
  vendor?: {
    business_name: string;
    business_name_ar: string | null;
    city: string | null;
    city_ar: string | null;
  } | null;
  service?: { name: string } | null;
}

const STATUS_STEPS: BookingStatus[] = [
  "booked",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready_for_pickup",
  "completed",
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  waiting_parts: "Waiting for Parts",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export default function BookingTracker({ bookingId }: { bookingId: string }) {
  const supabase = createClient();
  const { locale } = useLanguage();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, display_id, status, service_date, service_time, note, vendor:vendors(business_name, business_name_ar, city, city_ar), service:services(name)",
        )
        .eq("id", bookingId)
        .single();

      if (error || !data) {
        setError("Booking not found.");
      } else {
        setBooking(data as unknown as Booking);
      }
      setLoading(false);
    }
    load();
  }, [bookingId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-12 text-slate-500">
        {error ?? "Booking not found."}
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(booking.status as BookingStatus);
  const isCancelled =
    booking.status === "cancelled" || booking.status === "no_show";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Booking</span>
          <span className="font-mono font-bold text-sm">
            {booking.display_id ?? booking.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        {booking.vendor && (
          <div>
            <p className="font-semibold">
              {locale === "ar"
                ? booking.vendor.business_name_ar ||
                  booking.vendor.business_name
                : booking.vendor.business_name}
            </p>
            {booking.vendor.city && (
              <p className="text-sm text-slate-500">
                {locale === "ar"
                  ? booking.vendor.city_ar || booking.vendor.city
                  : booking.vendor.city}
              </p>
            )}
          </div>
        )}
        {booking.service && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {booking.service.name}
          </p>
        )}
        {booking.service_date && (
          <p className="text-sm text-slate-500">
            {booking.service_date}
            {booking.service_time ? ` at ${booking.service_time}` : ""}
          </p>
        )}
      </div>

      {isCancelled ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-6 text-center">
          <p className="font-semibold text-red-700 dark:text-red-400">
            {STATUS_LABELS[booking.status as BookingStatus]}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-semibold text-slate-500 mb-4">
            Booking Progress
          </p>
          <ol className="space-y-3">
            {STATUS_STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-primary text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={`text-sm ${active ? "font-semibold text-primary" : done ? "text-slate-400 line-through" : "text-slate-500"}`}
                  >
                    {STATUS_LABELS[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {booking.note && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {booking.note}
          </p>
        </div>
      )}
    </div>
  );
}
