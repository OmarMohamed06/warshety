"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import type { BookingStatus } from "@/types/database";

interface Booking {
  id: string;
  display_id: number | null;
  status: BookingStatus;
  booking_date: string | null;
  booking_time: string | null;
  notes: string | null;
  service_key: string | null;
  booking_type: string | null;
  vendor?: {
    business_name: string;
    business_name_ar: string | null;
    city: string | null;
    city_ar: string | null;
  } | null;
}

/** Columns as they actually exist on public.bookings — see types/database.ts. */
const BOOKING_SELECT =
  "id, display_id, status, booking_date, booking_time, notes, service_key, booking_type, " +
  "vendor:vendors(business_name, business_name_ar, city, city_ar)";

const STATUS_STEPS: BookingStatus[] = [
  "booked",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready_for_pickup",
  "completed",
];

/** Maps a status to its `tracking.*` translation key suffix. */
const STATUS_KEY: Record<BookingStatus, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  checked_in: "CheckedIn",
  in_progress: "InProgress",
  waiting_parts: "WaitingParts",
  ready_for_pickup: "ReadyForPickup",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Cancelled",
};

/** "14:30:00" → "14:30" */
function trimSeconds(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  return h && m ? `${h}:${m}` : time;
}

export default function BookingTracker({ bookingId }: { bookingId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { t, locale } = useLanguage();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  // Kept as a flag, not a translated string: `t` is re-created on every
  // LanguageProvider render, so depending on it inside `load` would re-fire
  // the fetch effect. Translate at render time instead.
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("id", bookingId)
        .single();

      if (error || !data) {
        // Log the real reason — a silently swallowed error here is what made
        // a wrong column name look like "booking not found" for months.
        if (error) {
          console.error("[BookingTracker] load failed:", error.message);
        }
        setNotFound(true);
      } else {
        setNotFound(false);
        setBooking(data as unknown as Booking);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Live updates ──────────────────────────────────────────────────────────
  // The whole point of this screen is watching the status change while you
  // wait, so subscribe to this one booking row rather than polling.
  useEffect(() => {
    const channel = supabase
      .channel(`booking-tracker-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const next = payload.new as Partial<Booking>;
          // Merge rather than replace: the realtime payload carries the row's
          // own columns only, not the embedded vendor.
          setBooking((prev) => (prev ? { ...prev, ...next } : prev));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, supabase]);

  // Realtime can miss events while the tab is backgrounded or offline —
  // re-sync whenever the user comes back to the page.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="text-center py-12 text-slate-500">
        {t("tracking.notFound")}
      </div>
    );
  }

  const isCancelled =
    booking.status === "cancelled" || booking.status === "no_show";
  // waiting_parts is not its own step — it happens during in_progress.
  const effectiveStatus: BookingStatus =
    booking.status === "waiting_parts" ? "in_progress" : booking.status;
  const currentStep = STATUS_STEPS.indexOf(effectiveStatus);

  const serviceLabel = booking.service_key
    ? t(`home.services.${booking.service_key}`) !==
      `home.services.${booking.service_key}`
      ? t(`home.services.${booking.service_key}`)
      : booking.service_key.replace(/-/g, " ")
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {t("tracking.bookingPrefix")}
          </span>
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
        {serviceLabel && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {serviceLabel}
          </p>
        )}
        {booking.booking_date && (
          <p className="text-sm text-slate-500">
            {booking.booking_date}
            {booking.booking_time
              ? ` — ${trimSeconds(booking.booking_time)}`
              : ""}
          </p>
        )}
      </div>

      {isCancelled ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-6 text-center">
          <p className="font-semibold text-red-700 dark:text-red-400">
            {t(`tracking.status${STATUS_KEY[booking.status]}`)}
          </p>
          <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
            {t(`tracking.status${STATUS_KEY[booking.status]}Desc`)}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-semibold text-slate-500 mb-4">
            {t("tracking.progress")}
          </p>
          {booking.status === "waiting_parts" && (
            <div className="mb-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 p-3">
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                {t("tracking.statusWaitingParts")}
              </p>
              <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
                {t("tracking.statusWaitingPartsDesc")}
              </p>
            </div>
          )}
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
                  <div className="min-w-0">
                    <span
                      className={`text-sm ${active ? "font-semibold text-primary" : done ? "text-slate-400 line-through" : "text-slate-500"}`}
                    >
                      {t(`tracking.status${STATUS_KEY[step]}`)}
                    </span>
                    {active && (
                      <p className="text-xs text-slate-500">
                        {t(`tracking.status${STATUS_KEY[step]}Desc`)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {booking.notes && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {booking.notes}
          </p>
        </div>
      )}
    </div>
  );
}
