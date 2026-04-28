/**
 * bookingService — All booking lifecycle logic.
 *
 * Rules enforced:
 *  - User must be authenticated to book
 *  - Booking date cannot be in the past
 *  - Slot must not already be booked (conflict check)
 *  - Cannot cancel a booking that is already in_progress, completed
 *  - Cannot reschedule within RESCHEDULE_LOCK_HOURS of the appointment
 *  - Bookings are AUTO-CONFIRMED on creation — no vendor confirmation step
 *  - Vendor can cancel a confirmed booking (with customer notification)
 *  - Status transitions follow a strict allowlist
 *
 * Booking statuses:
 *   confirmed → checked_in → in_progress → waiting_parts
 *           → ready_for_pickup → completed
 *   confirmed / checked_in → cancelled (vendor or customer)
 */

import { createClient } from "@/lib/supabase/client";
import type { BookingStatus, BookingType, DbBooking } from "@/types/database";

// ── Constants ─────────────────────────────────────────────────────────────────

/** How many hours before the appointment reschedule is locked */
const RESCHEDULE_LOCK_HOURS = 2;

/** Statuses that cannot be cancelled (service already started or done) */
const NON_CANCELLABLE_STATUSES: BookingStatus[] = [
  "in_progress",
  "waiting_parts",
  "ready_for_pickup",
  "completed",
];

/** Valid forward status transitions (vendor side) */
const VENDOR_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  // "booked" is a legacy state — new bookings start as "confirmed" automatically
  booked: ["cancelled"],
  confirmed: ["checked_in", "cancelled"],

  checked_in: ["in_progress"],
  in_progress: ["waiting_parts", "ready_for_pickup", "completed"],
  waiting_parts: ["in_progress", "ready_for_pickup"],
  ready_for_pickup: ["completed"],
  completed: [],
  cancelled: [],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  userId: string;
  vendorId: string;
  /** Branch the booking is for (null = vendor-level, no branch) */
  branchId?: string | null;
  vehicleId: string | null;
  /** Service key string (e.g. "oil_change") — optional */
  serviceKey?: string | null;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // HH:MM
  bookingType: BookingType;
  /** Current vehicle mileage — required for routine_maintenance */
  mileage?: number | null;
  /** Problem description — required for inspection (stored in notes) */
  notes?: string;
  totalPrice?: number;
}

export interface BookingResult {
  booking: DbBooking | null;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDateInPast(date: string, time: string): boolean {
  const dt = new Date(`${date}T${time}:00`);
  return dt < new Date();
}

function hoursUntilAppointment(date: string, time: string): number {
  const dt = new Date(`${date}T${time}:00`);
  return (dt.getTime() - Date.now()) / 3_600_000;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Create a new booking.
 * Checks: past date, slot conflict, one-active-booking-per-user.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<BookingResult> {
  const supabase = createClient();

  // Rule: cannot book in the past
  if (isDateInPast(input.bookingDate, input.bookingTime)) {
    return { booking: null, error: "Cannot book a slot in the past." };
  }

  // Rule: routine_maintenance requires mileage
  if (input.bookingType === "routine_maintenance" && !input.mileage) {
    return {
      booking: null,
      error:
        "Please enter your current vehicle mileage for maintenance bookings.",
    };
  }

  // Rule: inspection requires a problem description
  if (input.bookingType === "inspection" && !input.notes?.trim()) {
    return {
      booking: null,
      error: "Please describe the problem or issue for inspection bookings.",
    };
  }

  // Rule: user can only have one active booking at a time
  const ACTIVE_STATUSES: BookingStatus[] = [
    "confirmed",
    "checked_in",
    "in_progress",
    "waiting_parts",
    "ready_for_pickup",
  ];
  const { data: activeBookings } = await supabase
    .from("bookings")
    .select("id, vendor_id, booking_date, booking_time, status")
    .eq("user_id", input.userId)
    .in("status", ACTIVE_STATUSES)
    .limit(1);

  if (activeBookings && activeBookings.length > 0) {
    return {
      booking: null,
      error:
        "You already have an active booking. Please wait for it to be completed before booking a new appointment.",
    };
  }

  // Rule: slot conflict check (scoped to branch if provided)
  let conflictQuery = supabase
    .from("bookings")
    .select("id")
    .eq("vendor_id", input.vendorId)
    .eq("booking_date", input.bookingDate)
    .eq("booking_time", input.bookingTime)
    .not("status", "eq", "cancelled");

  if (input.branchId) {
    conflictQuery = conflictQuery.eq("branch_id", input.branchId);
  }

  const { data: conflicts } = await conflictQuery;

  if (conflicts && conflicts.length > 0) {
    return {
      booking: null,
      error: "This time slot is already booked. Please choose another.",
    };
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      user_id: input.userId,
      vendor_id: input.vendorId,
      branch_id: input.branchId ?? null,
      vehicle_id: input.vehicleId || null,
      service_key: input.serviceKey ?? null,
      booking_date: input.bookingDate,
      booking_time: input.bookingTime,
      status: "confirmed" as BookingStatus,
      booking_type: input.bookingType,
      mileage: input.mileage ?? null,
      notes: input.notes ?? null,
      total_price: input.totalPrice ?? null,
    })
    .select("*")
    .single();

  if (error) return { booking: null, error: error.message };

  // Log initial status history — auto-confirmed on creation
  await supabase.from("booking_status_history").insert({
    booking_id: data.id,
    status: "confirmed",
    note: "Booking created — auto-confirmed",
    changed_by: input.userId,
  });

  return { booking: data as DbBooking, error: null };
}

/**
 * Cancel a booking (user or vendor).
 * Rules: cannot cancel if already in_progress / completed.
 */
export async function cancelBooking(
  bookingId: string,
  cancelledBy: string,
  reason?: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, booking_date, booking_time")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found." };

  if (NON_CANCELLABLE_STATUSES.includes(booking.status as BookingStatus)) {
    return {
      error: `Cannot cancel a booking with status "${booking.status}".`,
    };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: "cancelled",
    note: reason ?? "Cancelled by user",
    changed_by: cancelledBy,
  });

  return { error: null };
}

/**
 * Reschedule a booking to a new date/time.
 * Rules: cannot reschedule within RESCHEDULE_LOCK_HOURS, slot conflict check.
 */
export async function rescheduleBooking(
  bookingId: string,
  newDate: string,
  newTime: string,
  rescheduledBy: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, booking_date, booking_time, vendor_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found." };

  if (
    NON_CANCELLABLE_STATUSES.includes(booking.status as BookingStatus) ||
    booking.status === "completed"
  ) {
    return { error: "This booking cannot be rescheduled." };
  }

  // Rule: lock window
  if (
    hoursUntilAppointment(
      booking.booking_date,
      booking.booking_time ?? "00:00",
    ) < RESCHEDULE_LOCK_HOURS
  ) {
    return {
      error: `Cannot reschedule within ${RESCHEDULE_LOCK_HOURS} hours of the appointment.`,
    };
  }

  // Rule: new slot cannot be in the past
  if (isDateInPast(newDate, newTime)) {
    return { error: "Cannot reschedule to a past date/time." };
  }

  // Slot conflict on new slot
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("vendor_id", booking.vendor_id)
    .eq("booking_date", newDate)
    .eq("booking_time", newTime)
    .not("id", "eq", bookingId)
    .not("status", "eq", "cancelled");

  if (conflicts && conflicts.length > 0) {
    return {
      error: "The new time slot is already booked. Please choose another.",
    };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      booking_date: newDate,
      booking_time: newTime,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: booking.status,
    note: `Rescheduled to ${newDate} ${newTime}`,
    changed_by: rescheduledBy,
  });

  return { error: null };
}

/**
 * Vendor updates a booking status.
 * Validates against the allowed transition map.
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  changedBy: string,
  note?: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found." };

  const currentStatus = booking.status as BookingStatus;
  const allowed = VENDOR_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(newStatus)) {
    return {
      error: `Cannot transition from "${currentStatus}" to "${newStatus}".`,
    };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: newStatus,
    note: note ?? null,
    changed_by: changedBy,
  });

  return { error: null };
}

/**
 * Fetch all bookings for a user (history).
 */
export async function getUserBookings(userId: string): Promise<DbBooking[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "*, vendor:vendors(id,business_name,city,logo_url), vehicle:vehicles(make,model,year)",
    )
    .eq("user_id", userId)
    .order("booking_date", { ascending: false });
  return (data ?? []) as unknown as DbBooking[];
}

/**
 * Fetch bookings for a vendor with optional date range.
 */
export async function getVendorBookings(
  vendorId: string,
  from?: string,
  to?: string,
): Promise<DbBooking[]> {
  const supabase = createClient();
  let query = supabase
    .from("bookings")
    .select(
      "*, user:users(full_name,phone,email), vehicle:vehicles(make,model,year), status_history:booking_status_history(*)",
    )
    .eq("vendor_id", vendorId)
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: true });

  if (from) query = query.gte("booking_date", from);
  if (to) query = query.lte("booking_date", to);

  const { data } = await query;
  return (data ?? []) as unknown as DbBooking[];
}

/**
 * Estimate total duration for a booking (fetches service duration).
 */
export async function getEstimatedDuration(
  serviceId: string,
): Promise<number | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();
  return data?.duration_minutes ?? null;
}
