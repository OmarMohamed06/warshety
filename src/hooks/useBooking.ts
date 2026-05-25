"use client";

/**
 * useBooking — Hook for the full booking flow and management.
 *
 * Wraps bookingService and availabilityService with React state.
 *
 * Capabilities:
 *  - createBooking: validates, submits, and fires notifications
 *  - cancelBooking / rescheduleBooking
 *  - userBookings: fetches and caches the user's booking history
 *  - selectedSlot / selectedDate: managed locally for the booking form
 *  - availableSlots: fetched per vendor + date combo
 *  - estimatedDuration: fetched per service
 *
 * Usage:
 *   const { createBooking, availableSlots, isSubmitting } = useBooking();
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createBooking as _create,
  cancelBooking as _cancel,
  rescheduleBooking as _reschedule,
  updateBookingStatus as _updateStatus,
  getUserBookings,
  getEstimatedDuration,
  type CreateBookingInput,
} from "@/services/bookingService";
import {
  getAvailableSlots,
  type TimeSlot,
} from "@/services/availabilityService";
import {
  notifyBookingConfirmed,
  notifyBookingCancelled,
} from "@/services/notificationService";
import {
  notifyBookingConfirmedAction,
  notifyCustomerCancelledBookingAction,
} from "@/app/actions/bookingActions";
import type { DbBooking, BookingStatus } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseBookingReturn {
  /** User's booking history */
  bookings: DbBooking[];
  bookingsLoading: boolean;

  /** Available time slots for the selected vendor + date */
  availableSlots: TimeSlot[];
  slotsLoading: boolean;

  /** Estimated duration in minutes for the selected service */
  estimatedDuration: number | null;

  /** Whether a booking submission is in flight */
  isSubmitting: boolean;
  submitError: string | null;

  /** Create a new booking */
  createBooking: (
    input: Omit<CreateBookingInput, "userId">,
  ) => Promise<{ bookingId: string | null; error: string | null }>;

  /** Cancel a booking */
  cancelBooking: (
    bookingId: string,
    reason?: string,
  ) => Promise<{ error: string | null }>;

  /** Reschedule a booking */
  rescheduleBooking: (
    bookingId: string,
    newDate: string,
    newTime: string,
  ) => Promise<{ error: string | null }>;

  /** Vendor: update booking status */
  updateBookingStatus: (
    bookingId: string,
    status: BookingStatus,
    note?: string,
  ) => Promise<{ error: string | null }>;

  /** Load available slots for a vendor + date */
  loadSlots: (vendorId: string, date: string) => Promise<void>;

  /** Load estimated duration for a service */
  loadEstimatedDuration: (serviceId: string) => Promise<void>;

  /** Refresh the user's booking history */
  refreshBookings: () => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBooking(): UseBookingReturn {
  const { user } = useAuth();

  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-load bookings when user is available
  const refreshBookings = useCallback(async () => {
    if (!user?.id) return;
    setBookingsLoading(true);
    const data = await getUserBookings(user.id);
    setBookings(data);
    setBookingsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const createBooking = useCallback(
    async (
      input: Omit<CreateBookingInput, "userId">,
    ): Promise<{ bookingId: string | null; error: string | null }> => {
      if (!user?.id)
        return { bookingId: null, error: "You must be logged in to book." };

      setIsSubmitting(true);
      setSubmitError(null);

      const { booking, error } = await _create({ ...input, userId: user.id });

      setIsSubmitting(false);

      if (error) {
        setSubmitError(error);
        return { bookingId: null, error };
      }

      // In-app notification (client-safe)
      await notifyBookingConfirmed(user.id, booking!.id, input.vendorId);

      // Email + SMS via server action (must be awaited — un-awaited server actions
      // get aborted by the browser during page navigation before they can fire).
      await notifyBookingConfirmedAction(booking!.id).catch(() => {});

      await refreshBookings();
      return { bookingId: booking!.id, error: null };
    },
    [user?.id, refreshBookings],
  );

  const cancelBooking = useCallback(
    async (
      bookingId: string,
      reason?: string,
    ): Promise<{ error: string | null }> => {
      if (!user?.id) return { error: "Not authenticated." };

      const { error } = await _cancel(bookingId, user.id, reason);

      if (!error) {
        // In-app notification
        await notifyBookingCancelled(user.id, bookingId, "your booking");
        // Outbound SMS + Email to customer, and alert the vendor
        await notifyCustomerCancelledBookingAction(bookingId).catch(() => {});
        await refreshBookings();
      }

      return { error };
    },
    [user?.id, refreshBookings],
  );

  const rescheduleBooking = useCallback(
    async (
      bookingId: string,
      newDate: string,
      newTime: string,
    ): Promise<{ error: string | null }> => {
      if (!user?.id) return { error: "Not authenticated." };
      const result = await _reschedule(bookingId, newDate, newTime, user.id);
      if (!result.error) await refreshBookings();
      return result;
    },
    [user?.id, refreshBookings],
  );

  const updateBookingStatus = useCallback(
    async (
      bookingId: string,
      status: BookingStatus,
      note?: string,
    ): Promise<{ error: string | null }> => {
      if (!user?.id) return { error: "Not authenticated." };
      return _updateStatus(bookingId, status, user.id, note);
    },
    [user?.id],
  );

  const loadSlots = useCallback(async (vendorId: string, date: string) => {
    setSlotsLoading(true);
    const slots = await getAvailableSlots(vendorId, date);
    setAvailableSlots(slots);
    setSlotsLoading(false);
  }, []);

  const loadEstimatedDuration = useCallback(async (serviceId: string) => {
    const duration = await getEstimatedDuration(serviceId);
    setEstimatedDuration(duration);
  }, []);

  return {
    bookings,
    bookingsLoading,
    availableSlots,
    slotsLoading,
    estimatedDuration,
    isSubmitting,
    submitError,
    createBooking,
    cancelBooking,
    rescheduleBooking,
    updateBookingStatus,
    loadSlots,
    loadEstimatedDuration,
    refreshBookings,
  };
}
