"use client";

import { use, useEffect, useState } from "react";
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
  | "cancelled";

const STATUS_COLORS: Record<BookingStatus, string> = {
  booked: "bg-blue-500",
  confirmed: "bg-indigo-500",
  checked_in: "bg-cyan-500",
  in_progress: "bg-amber-500",
  waiting_parts: "bg-orange-500",
  ready_for_pickup: "bg-teal-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  booked: "confirmed",
  confirmed: "checked_in",
  checked_in: "in_progress",
  in_progress: "completed",
};

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLanguage();
  const supabase = createClient();

  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [bRes, hRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "*, users(full_name, email, phone), vendors(business_name, city, phone), vehicles(make, model, year, plate_number), services(name, price)",
          )
          .eq("id", id)
          .single(),
        supabase
          .from("booking_status_history")
          .select("status, note, changed_at, users(full_name)")
          .eq("booking_id", id)
          .order("changed_at", { ascending: true }),
      ]);
      setBooking(bRes.data as Record<string, unknown>);
      setHistory((hRes.data ?? []) as Record<string, unknown>[]);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function updateStatus(status: BookingStatus) {
    setUpdating(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);
    setMsg(error ? `Error: ${error.message}` : `Status updated to ${status}.`);
    setTimeout(() => setMsg(null), 3000);
    setUpdating(false);
    if (!error && booking) setBooking({ ...booking, status });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span
          className="material-symbols-outlined animate-spin text-[#FF4B19]"
          style={{ fontSize: 36 }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6">
        <p className="text-slate-500 mb-2">{t("admin.bookingNotFound")}</p>
        <Link href="/admin/bookings" className="text-[#FF4B19] font-bold">
          ← {t("admin.backToBookings")}
        </Link>
      </div>
    );
  }

  const status = String(booking.status) as BookingStatus;
  const user = booking.users as Record<string, unknown> | null;
  const vendor = booking.vendors as Record<string, unknown> | null;
  const vehicle = booking.vehicles as Record<string, unknown> | null;
  const service = booking.services as Record<string, unknown> | null;
  const nextStatus = NEXT_STATUS[status];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/bookings"
          className="text-slate-400 hover:text-[#FF4B19] transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            arrow_back
          </span>
        </Link>
        <div>
          <h1 className="text-2xl font-black">{t("admin.bookingDetails")}</h1>
          <p className="text-xs text-slate-400 font-mono">{id}</p>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
          {msg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Status + actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-4">
          <h2 className="font-black">{t("admin.status")}</h2>
          <div className="flex items-center gap-3">
            <div
              className={cn("w-3 h-3 rounded-full", STATUS_COLORS[status])}
            />
            <span className="font-black text-lg capitalize">
              {status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Status timeline */}
          <div className="space-y-2">
            {(
              [
                "booked",
                "confirmed",
                "checked_in",
                "in_progress",
                "waiting_parts",
                "ready_for_pickup",
                "completed",
              ] as BookingStatus[]
            ).map((s, i, arr) => {
              const statusOrder = [
                "booked",
                "confirmed",
                "checked_in",
                "in_progress",
                "waiting_parts",
                "ready_for_pickup",
                "completed",
                "cancelled",
              ];
              const currentIdx = statusOrder.indexOf(status);
              const thisIdx = statusOrder.indexOf(s);
              const done = currentIdx >= thisIdx;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                      done
                        ? STATUS_COLORS[s]
                        : "bg-slate-200 dark:bg-slate-700",
                    )}
                  >
                    {done && (
                      <span
                        className="material-symbols-outlined text-white"
                        style={{ fontSize: 12 }}
                      >
                        check
                      </span>
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      className={cn(
                        "w-0.5 h-4 absolute ml-2.5 mt-5",
                        done
                          ? "bg-slate-300"
                          : "bg-slate-200 dark:bg-slate-700",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "text-xs capitalize",
                      done ? "font-bold" : "text-slate-400",
                    )}
                  >
                    {s.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Admin actions */}
          <div className="space-y-2 pt-2">
            {nextStatus && (
              <button
                onClick={() => updateStatus(nextStatus)}
                disabled={updating}
                className="w-full px-4 py-2.5 bg-[#FF4B19] text-white text-sm font-bold rounded-xl hover:bg-[#e03d12] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16 }}
                >
                  arrow_forward
                </span>
                {t("admin.advanceTo")} "{nextStatus.replace(/_/g, " ")}"
              </button>
            )}
            {status !== "cancelled" && status !== "completed" && (
              <button
                onClick={() => updateStatus("cancelled")}
                disabled={updating}
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
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="font-black text-sm mb-3 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-blue-500"
                style={{ fontSize: 18 }}
              >
                person
              </span>
              {t("admin.customer")}
            </h3>
            <p className="font-bold">{String(user?.full_name ?? "—")}</p>
            <p className="text-sm text-slate-500">
              {String(user?.email ?? "—")}
            </p>
            <p className="text-sm text-slate-500">
              {String(user?.phone ?? "—")}
            </p>
          </div>

          {/* Service Center */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="font-black text-sm mb-3 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-purple-500"
                style={{ fontSize: 18 }}
              >
                storefront
              </span>
              {t("admin.serviceCenter")}
            </h3>
            <p className="font-bold">{String(vendor?.business_name ?? "—")}</p>
            <p className="text-sm text-slate-500">
              {String(vendor?.city ?? "—")}
            </p>
            <p className="text-sm text-slate-500">
              {String(vendor?.phone ?? "—")}
            </p>
          </div>

          {/* Vehicle */}
          {vehicle && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
              <h3 className="font-black text-sm mb-3 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-amber-500"
                  style={{ fontSize: 18 }}
                >
                  directions_car
                </span>
                {t("admin.vehicle")}
              </h3>
              <p className="font-bold">
                {String(vehicle.year)} {String(vehicle.make)}{" "}
                {String(vehicle.model)}
              </p>
              {!!vehicle.plate_number && (
                <p className="text-sm text-slate-500">
                  {String(vehicle.plate_number)}
                </p>
              )}
              {!!booking.mileage && (
                <p className="text-sm text-slate-500">
                  {Number(booking.mileage as number).toLocaleString()} km
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
        <h2 className="font-black mb-4">{t("admin.bookingInfo")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs">{t("admin.service")}</p>
            <p className="font-bold">
              {service?.name
                ? String(service.name)
                : String(booking.booking_type).replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">{t("admin.date")}</p>
            <p className="font-bold">{String(booking.booking_date)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">{t("admin.total")}</p>
            <p className="font-bold">
              {booking.total_price
                ? `EGP ${Number(booking.total_price).toLocaleString()}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">{t("admin.type")}</p>
            <p className="font-bold capitalize">
              {String(booking.booking_type).replace(/_/g, " ")}
            </p>
          </div>
        </div>
        {!!booking.notes && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 mb-1">
              {t("admin.customerNotes")}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
              {booking.notes as string}
            </p>
          </div>
        )}
      </div>

      {/* Status history */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
        <h2 className="font-black mb-4">{t("admin.statusTimeline")}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">{t("admin.noHistory")}</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-4">
              {history.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-4 w-3 h-3 rounded-full bg-[#FF4B19] border-2 border-white dark:border-slate-800" />
                  <p className="font-bold text-sm capitalize">
                    {String(h.status).replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(String(h.changed_at)).toLocaleString("en-EG", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {h.note ? ` · ${String(h.note)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
