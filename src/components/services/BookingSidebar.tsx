"use client";

/**
 * BookingSidebar — Client-side booking form for a service center profile page.
 *
 * - Checks authentication before allowing submission
 * - Shows vehicles from the user's garage (GarageContext)
 * - Submits a new booking record to Supabase on confirmation
 * - Redirects to /bookings/[id] on success
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGarage, vehicleLabel } from "@/context/GarageContext";
import { createClient } from "@/lib/supabase/client";
import type { DbService } from "@/types/database";

const TIMES = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

interface Props {
  vendorId: string;
  vendorName: string;
  services: DbService[];
}

export default function BookingSidebar({
  vendorId,
  vendorName,
  services,
}: Props) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { vehicles } = useGarage();

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Pre-select first vehicle from garage
  useEffect(() => {
    if (vehicles.length > 0 && !vehicleId) {
      setVehicleId(vehicles[0].id);
    }
  }, [vehicles, vehicleId]);

  const selectedService = services.find((s) => s.id === serviceId);

  // Minimum date: today
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      router.push(
        `/auth/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }

    if (!serviceId || !date || !time) {
      setError("Please select a service, date, and time.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data, error: err } = await supabase
      .from("bookings")
      .insert({
        user_id: user!.id,
        vendor_id: vendorId,
        service_id: serviceId || null,
        vehicle_id: vehicleId || null,
        booking_date: date,
        booking_time: time,
        status: "booked",
        total_price: selectedService?.price ?? null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (err || !data) {
      console.error("Booking error:", err);
      setError("Failed to create booking. Please try again.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push(`/bookings/${data.id}`), 1500);
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 sticky top-24">
        <div className="text-center py-10">
          <span
            className="material-symbols-outlined text-6xl text-green-500 mb-4 block"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <h3 className="font-black text-xl mb-2">Booking Confirmed!</h3>
          <p className="text-slate-500 text-sm">Redirecting to your booking…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 sticky top-24">
      <h3 className="text-xl font-black mb-1">Book an Appointment</h3>
      <p className="text-xs text-slate-400 mb-6">{vendorName}</p>

      {/* Auth warning */}
      {!isAuthenticated && !authLoading && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-base">info</span>
          You must be logged in to book a service.
        </div>
      )}

      <div className="space-y-4 mb-6">
        {/* Service select */}
        <div>
          <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
            Select Service
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
          >
            <option value="">Choose a service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.price > 0 ? ` — EGP ${s.price.toLocaleString()}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle select — only show if user has vehicles */}
        {vehicles.length > 0 && (
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              Your Vehicle
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
            >
              <option value="">No vehicle selected</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date picker */}
        <div>
          <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
            Date
          </label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
          />
        </div>

        {/* Time slots */}
        <div>
          <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
            Time
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TIMES.slice(0, 6).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  time === t
                    ? "border-[#FF4B19] bg-[#FF4B19]/10 text-[#FF4B19]"
                    : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19] hover:text-[#FF4B19]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
            Notes{" "}
            <span className="font-normal text-slate-400 normal-case">
              (optional)
            </span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Specific issues, mileage, or any requests…"
            rows={2}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 resize-none"
          />
        </div>
      </div>

      {/* Price preview */}
      {selectedService && selectedService.price > 0 && (
        <div className="mb-4 flex items-center justify-between p-3 bg-[#FF4B19]/5 rounded-xl border border-[#FF4B19]/20">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {selectedService.name}
          </span>
          <span className="font-black text-[#FF4B19]">
            EGP {selectedService.price.toLocaleString()}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-xs mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-[#FF4B19] text-white font-bold shadow-lg shadow-[#FF4B19]/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Booking…
          </>
        ) : !isAuthenticated ? (
          "Login to Book"
        ) : (
          "Confirm Booking"
        )}
      </button>
      <p className="text-xs text-slate-400 text-center mt-3">
        You&apos;ll receive confirmation via SMS
      </p>
    </div>
  );
}
