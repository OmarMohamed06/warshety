"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
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
  no_show: "bg-red-100 text-red-700",
};

const ACTIVE_STATUSES = [
  "booked",
  "confirmed",
  "checked_in",
  "in_progress",
  "waiting_parts",
  "ready_for_pickup",
];

/** Returns true if the booking date is strictly in the future (not today or past). */
function canCancelBooking(booking: any): boolean {
  if (!["booked", "confirmed"].includes(booking.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDay = new Date(booking.booking_date);
  bookingDay.setHours(0, 0, 0, 0);
  return bookingDay > today;
}

export default function MyBookingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const supabase = createClient();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("all");
  const [timeGroup, setTimeGroup] = useState<
    "today" | "upcoming" | "past" | "all"
  >("all");
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let q = supabase
      .from("bookings")
      .select("*, vendor:vendors(business_name,city), vehicle:vehicles(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data } = await q;
    let all = data ?? [];

    if (filter === "active")
      all = all.filter((b: any) => ACTIVE_STATUSES.includes(b.status));
    else if (filter === "completed")
      all = all.filter((b: any) =>
        ["completed", "cancelled", "no_show"].includes(b.status),
      );

    setBookings(all);
    setLoading(false);
  }, [user, filter, supabase]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancel = async () => {
    if (!cancelConfirmId) return;
    setCancelling(true);
    await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_by: "customer" })
      .eq("id", cancelConfirmId);
    setCancelling(false);
    setCancelConfirmId(null);
    loadBookings();
  };

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
          <h1 className="text-2xl font-black">{t("bookings.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t("bookings.subtitle")}
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${filter === f ? "bg-[#FF4B19] text-white" : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700"}`}
            >
              {t(`bookings.${f}`)}
            </button>
          ))}
        </div>

        {/* Time-group tabs */}
        {(() => {
          const _d = new Date();
          const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;
          const counts = {
            all: bookings.length,
            today: bookings.filter((b: any) => b.booking_date === todayStr)
              .length,
            upcoming: bookings.filter((b: any) => b.booking_date > todayStr)
              .length,
            past: bookings.filter((b: any) => b.booking_date < todayStr).length,
          };
          return (
            <div className="flex gap-2 mb-6 flex-wrap">
              {(
                [
                  { key: "all", label: t("bookings.timeAll") },
                  { key: "today", label: t("bookings.timeToday") },
                  { key: "upcoming", label: t("bookings.timeUpcoming") },
                  { key: "past", label: t("bookings.timePast") },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeGroup(key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    timeGroup === key
                      ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                      : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {label}
                  {counts[key] > 0 && (
                    <span
                      className={`text-[10px] font-black px-1.5 rounded-full ${
                        timeGroup === key
                          ? "bg-white/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {counts[key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })()}

        {loading ? (
          <div className="text-center py-16 text-slate-400">
            {t("bookings.loading")}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              calendar_month
            </span>
            <p className="font-black text-lg mb-2">
              {t("bookings.noBookings")}
            </p>
            <p className="text-slate-500 text-sm mb-6">
              {t("bookings.noBookingsDesc")}
            </p>
            <Link
              href="/services"
              className="bg-[#FF4B19] text-white font-black px-6 py-3 rounded-xl hover:bg-[#e03d10] transition"
            >
              {t("bookings.findServiceCenters")}
            </Link>
          </div>
        ) : (
          (() => {
            const _d2 = new Date();
            const todayStr = `${_d2.getFullYear()}-${String(_d2.getMonth() + 1).padStart(2, "0")}-${String(_d2.getDate()).padStart(2, "0")}`;
            const displayed = bookings.filter((b: any) => {
              if (timeGroup === "today") return b.booking_date === todayStr;
              if (timeGroup === "upcoming") return b.booking_date > todayStr;
              if (timeGroup === "past") return b.booking_date < todayStr;
              return true;
            });
            if (displayed.length === 0)
              return (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
                    calendar_month
                  </span>
                  <p className="font-black text-lg mb-2">
                    {timeGroup === "today"
                      ? t("bookings.noBookingsToday")
                      : timeGroup === "upcoming"
                        ? t("bookings.noBookingsUpcoming")
                        : t("bookings.noBookingsPast")}
                  </p>
                </div>
              );
            return (
              <div className="space-y-4">
                {displayed.map((b: any) => {
                  const cancellable = canCancelBooking(b);
                  const todayOrPast =
                    ["booked", "confirmed"].includes(b.status) && !cancellable;
                  return (
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
                        {b.service_key && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <span className="material-symbols-outlined text-[14px]">
                              home_repair_service
                            </span>
                            <span className="truncate">
                              {t(`services.services.${b.service_key}`) !==
                              `services.services.${b.service_key}`
                                ? t(`services.services.${b.service_key}`)
                                : b.service_key.replace(/-/g, " ")}
                            </span>
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

                      <div className="mt-4 flex items-center gap-3 flex-wrap">
                        {ACTIVE_STATUSES.includes(b.status) && (
                          <Link
                            href={`/bookings/${b.id}`}
                            className="flex items-center gap-1.5 bg-[#FF4B19] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#e03d10] transition"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              my_location
                            </span>
                            {t("bookings.trackLive")}
                          </Link>
                        )}
                        <Link
                          href={`/bookings/${b.id}`}
                          className="text-xs text-slate-500 hover:text-[#FF4B19] transition font-semibold"
                        >
                          {t("bookings.viewDetails")}
                        </Link>

                        {/* Cancel button — only for booked/confirmed AND booking date is still future */}
                        {cancellable && (
                          <button
                            onClick={() => setCancelConfirmId(b.id)}
                            className="ms-auto text-xs text-red-500 hover:text-red-700 font-semibold transition"
                          >
                            {t("bookings.cancelBooking")}
                          </button>
                        )}
                        {/* Greyed-out hint when day has arrived */}
                        {todayOrPast && (
                          <span className="ms-auto text-xs text-slate-400 italic">
                            {t("bookings.cannotCancelToday")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* Cancel confirmation overlay */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <p className="font-black text-base mb-2">
              {t("bookings.cancelBooking")}
            </p>
            <p className="text-sm text-slate-500 mb-6">
              {t("bookings.cancelConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold hover:border-slate-400 transition"
              >
                {t("garage.cancel")}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 transition"
              >
                {cancelling
                  ? t("bookings.cancelling")
                  : t("bookings.cancelBooking")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
