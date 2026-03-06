"use client";

/**
 * BookingTracker — Real-time live vehicle progress tracking.
 *
 * Subscribes to Supabase Realtime on the bookings table and
 * booking_status_history table to instantly reflect any status
 * change made by the service center.
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus, DbBookingStatusHistory } from "@/types/database";

// ── Status pipeline config ────────────────────────────────────────────────────

interface StatusStep {
  status: BookingStatus;
  label: string;
  icon: string;
  description: string;
}

const STATUS_PIPELINE: StatusStep[] = [
  {
    status: "booked",
    label: "Booked",
    icon: "bookmark_added",
    description: "Your booking has been received.",
  },
  {
    status: "confirmed",
    label: "Confirmed",
    icon: "task_alt",
    description: "The service center confirmed your appointment.",
  },
  {
    status: "checked_in",
    label: "Checked In",
    icon: "login",
    description: "Your vehicle has arrived at the workshop.",
  },
  {
    status: "in_progress",
    label: "In Progress",
    icon: "build",
    description: "Technicians are working on your vehicle.",
  },
  {
    status: "waiting_parts",
    label: "Waiting for Parts",
    icon: "inventory_2",
    description: "Awaiting spare parts. We'll update you soon.",
  },
  {
    status: "ready_for_pickup",
    label: "Ready for Pickup",
    icon: "directions_car",
    description: "Your vehicle is ready! You can collect it now.",
  },
  {
    status: "completed",
    label: "Completed",
    icon: "check_circle",
    description: "Service completed successfully. Thank you!",
  },
];

const CANCELLED_STEP: StatusStep = {
  status: "cancelled",
  label: "Cancelled",
  icon: "cancel",
  description: "This booking has been cancelled.",
};

const ACTIVE_STATUSES = STATUS_PIPELINE.map((s) => s.status);

// ── Props ─────────────────────────────────────────────────────────────────────

interface BookingTrackerProps {
  bookingId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingTracker({ bookingId }: BookingTrackerProps) {
  const supabase = createClient();

  const [booking, setBooking] = useState<any | null>(null);
  const [history, setHistory] = useState<DbBookingStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBooking = useCallback(async () => {
    const { data } = await supabase
      .from("bookings")
      .select(
        "*, vendor:vendors(business_name,phone,city), vehicle:vehicles(*), service:services(name)",
      )
      .eq("id", bookingId)
      .single();
    setBooking(data);

    const { data: hist } = await supabase
      .from("booking_status_history")
      .select("*")
      .eq("booking_id", bookingId)
      .order("changed_at", { ascending: true });
    setHistory((hist ?? []) as DbBookingStatusHistory[]);
    setLoading(false);
  }, [bookingId, supabase]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    const bookingChannel = supabase
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
          setBooking((prev: any) => ({ ...prev, ...payload.new }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_status_history",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setHistory((prev) => [
            ...prev,
            payload.new as DbBookingStatusHistory,
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, [bookingId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#FF4B19]/20 border-t-[#FF4B19] rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-16 text-slate-400">
        <span className="material-symbols-outlined text-5xl mb-3 block">
          search_off
        </span>
        <p className="font-semibold">Booking not found.</p>
      </div>
    );
  }

  const isCancelled = booking.status === "cancelled";
  const pipeline = isCancelled
    ? [...STATUS_PIPELINE, CANCELLED_STEP]
    : STATUS_PIPELINE;
  const currentIndex = pipeline.findIndex((s) => s.status === booking.status);
  const currentStep = pipeline[currentIndex] ?? pipeline[0];

  return (
    <div className="space-y-6">
      {/* Booking summary card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">
              Booking #{booking.id.slice(0, 8).toUpperCase()}
            </p>
            <h2 className="text-xl font-black">
              {booking.vendor?.business_name ?? "Service Center"}
            </h2>
            {booking.vendor?.city && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">
                  location_on
                </span>
                {booking.vendor.city}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">{booking.booking_date}</p>
            {booking.booking_time && (
              <p className="text-sm font-semibold">{booking.booking_time}</p>
            )}
          </div>
        </div>

        {booking.vehicle && (
          <div className="mt-4 flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
            <span className="material-symbols-outlined text-[#FF4B19] text-[20px]">
              directions_car
            </span>
            <div>
              <p className="font-semibold text-sm">
                {booking.vehicle.make} {booking.vehicle.model}{" "}
                {booking.vehicle.year}
              </p>
              {booking.vehicle.plate_number && (
                <p className="text-xs text-slate-500">
                  {booking.vehicle.plate_number}
                </p>
              )}
            </div>
          </div>
        )}

        {booking.service && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-[16px]">
              home_repair_service
            </span>
            {booking.service.name}
          </div>
        )}
      </div>

      {/* Current status highlight */}
      <div
        className={`rounded-2xl p-6 text-white ${
          isCancelled
            ? "bg-red-500"
            : booking.status === "completed"
              ? "bg-green-500"
              : "bg-[#FF4B19]"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">
              {currentStep.icon}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
              Current Status
            </p>
            <p className="text-2xl font-black">{currentStep.label}</p>
            <p className="text-sm opacity-90 mt-1">{currentStep.description}</p>
          </div>
        </div>
      </div>

      {/* Progress timeline */}
      {!isCancelled && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
          <h3 className="font-black mb-5">Progress</h3>
          <div className="space-y-0">
            {STATUS_PIPELINE.map((step, i) => {
              const isDone =
                ACTIVE_STATUSES.indexOf(booking.status) >=
                ACTIVE_STATUSES.indexOf(step.status);
              const isCurrent = booking.status === step.status;
              const historyEntry = history.find(
                (h) => h.status === step.status,
              );

              return (
                <div key={step.status} className="flex items-start gap-4">
                  {/* Connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isDone
                          ? isCurrent
                            ? "bg-[#FF4B19] text-white shadow-lg shadow-[#FF4B19]/30 scale-110"
                            : "bg-green-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isDone && !isCurrent ? (
                        <span className="material-symbols-outlined text-[16px]">
                          check
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">
                          {step.icon}
                        </span>
                      )}
                    </div>
                    {i < STATUS_PIPELINE.length - 1 && (
                      <div
                        className={`w-0.5 h-8 mt-1 transition-colors ${
                          isDone && ACTIVE_STATUSES.indexOf(booking.status) > i
                            ? "bg-green-400"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 pb-6">
                    <p
                      className={`font-semibold text-sm ${
                        isCurrent
                          ? "text-[#FF4B19]"
                          : isDone
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-400"
                      }`}
                    >
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-[#FF4B19]/10 text-[#FF4B19] px-2 py-0.5 rounded-full animate-pulse">
                          Now
                        </span>
                      )}
                    </p>
                    {historyEntry?.note && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {historyEntry.note}
                      </p>
                    )}
                    {historyEntry?.changed_at && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(historyEntry.changed_at).toLocaleString(
                          "en-EG",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full history log */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
          <h3 className="font-black mb-4">Activity Log</h3>
          <div className="space-y-3">
            {[...history].reverse().map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <span className="material-symbols-outlined text-[#FF4B19] text-[16px] mt-0.5">
                  radio_button_checked
                </span>
                <div>
                  <p className="font-semibold capitalize">
                    {h.status.replace(/_/g, " ")}
                  </p>
                  {h.note && (
                    <p className="text-slate-500 text-xs mt-0.5">{h.note}</p>
                  )}
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {new Date(h.changed_at).toLocaleString("en-EG", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
