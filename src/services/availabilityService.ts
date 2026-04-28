/**
 * availabilityService — Garage working hours & slot management.
 *
 * Logic:
 *  - A vendor defines working hours per day-of-week (0=Sun … 6=Sat)
 *  - Slots are generated at a configurable interval (default 30 min)
 *  - Booked slots are fetched from the DB and subtracted
 *  - Past slots on today are filtered out
 *
 * Rules enforced:
 *  ✓ Slots cannot be double-booked
 *  ✓ Slots unavailable if already booked
 *  ✓ Slots in the past on today are hidden
 *  ✓ Whole day unavailable if vendor is closed that day
 */

import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkingHours {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  open: string; // "HH:MM"
  close: string; // "HH:MM"
  isOpen: boolean;
}

export interface TimeSlot {
  time: string; // "HH:MM"
  available: boolean;
  reason?: "booked" | "past" | "closed" | "blocked" | "opened";
  /** True when availability was set manually by the vendor */
  isManualOverride?: boolean;
  /** Number of existing bookings for this slot */
  bookedCount?: number;
  /** Number of vendor-blocked spots in this slot */
  blockedSpots?: number;
  /** Maximum cars this slot can hold (from vendor_slot_settings) */
  capacity?: number;
}

/** A vendor-defined override for a specific date + time slot */
export interface SlotOverride {
  id: string;
  vendor_id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM  — null means the entire day
  /** "blocked" = vendor manually closed the slot; "opened" = extra slot outside normal hours */
  type: "blocked" | "opened";
  /** How many car spots are blocked (only meaningful when type=="blocked"). Default 1. */
  blocked_spots: number;
  note: string | null;
  created_at: string;
}

export type SlotOverrideType = "blocked" | "opened";

// ── Vendor slot settings ─────────────────────────────────────────────────────

export interface VendorSlotSettings {
  slot_interval_minutes: number; // 15 | 20 | 30 | 45 | 60
  cars_per_slot: number; // 1..20
}

// ── Default working hours ─────────────────────────────────────────────────────

/** Used as fallback when vendor has no working_hours row */
export const DEFAULT_WORKING_HOURS: WorkingHours[] = [
  { dayOfWeek: 0, open: "09:00", close: "17:00", isOpen: false }, // Sun
  { dayOfWeek: 1, open: "08:00", close: "20:00", isOpen: true }, // Mon
  { dayOfWeek: 2, open: "08:00", close: "20:00", isOpen: true }, // Tue
  { dayOfWeek: 3, open: "08:00", close: "20:00", isOpen: true }, // Wed
  { dayOfWeek: 4, open: "08:00", close: "20:00", isOpen: true }, // Thu
  { dayOfWeek: 5, open: "09:00", close: "17:00", isOpen: true }, // Fri
  { dayOfWeek: 6, open: "09:00", close: "14:00", isOpen: true }, // Sat
];

export const DEFAULT_SLOT_SETTINGS: VendorSlotSettings = {
  slot_interval_minutes: 30,
  cars_per_slot: 1,
};

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Fetch the slot settings (interval + capacity) for a vendor.
 * Falls back to 30 min interval, 1 car per slot when no record exists.
 */
export async function getVendorSlotSettings(
  vendorId: string,
): Promise<VendorSlotSettings> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("vendor_slot_settings")
    .select("slot_interval_minutes, cars_per_slot")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_SLOT_SETTINGS };
  return {
    slot_interval_minutes: data.slot_interval_minutes as number,
    cars_per_slot: data.cars_per_slot as number,
  };
}

/**
 * Upsert the slot settings for a vendor.
 */
export async function saveVendorSlotSettings(
  vendorId: string,
  settings: VendorSlotSettings,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { error } = await supabase.from("vendor_slot_settings").upsert(
    {
      vendor_id: vendorId,
      slot_interval_minutes: settings.slot_interval_minutes,
      cars_per_slot: settings.cars_per_slot,
    },
    { onConflict: "vendor_id" },
  );
  return { error: error?.message ?? null };
}

/** Convert "HH:MM" to total minutes since midnight */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Generate slot strings between open and close at `intervalMin` intervals */
function generateSlots(
  open: string,
  close: string,
  intervalMin = 30,
): string[] {
  const slots: string[] = [];
  let cur = toMinutes(open);
  const end = toMinutes(close);
  while (cur < end) {
    const h = Math.floor(cur / 60)
      .toString()
      .padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += intervalMin;
  }
  return slots;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Fetch the working hours for a vendor.
 * Falls back to DEFAULT_WORKING_HOURS when no record exists.
 */
export async function getWorkingHours(
  vendorId: string,
): Promise<WorkingHours[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("vendor_working_hours")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("day_of_week");

  if (!data || data.length === 0) return DEFAULT_WORKING_HOURS;

  return (data as Array<Record<string, unknown>>).map((row) => ({
    dayOfWeek: row.day_of_week as number,
    open: (row.open_time as string).slice(0, 5),
    close: (row.close_time as string).slice(0, 5),
    isOpen: row.is_open as boolean,
  }));
}

/**
 * Get available time slots for a vendor on a specific date.
 *
 * Slot availability rules:
 *  - A slot is available when (bookedCount + blockedSpots) < carsPerSlot
 *  - Vendors can block 1..N spots within a slot (partial blocking)
 *  - The slot interval and capacity come from vendor_slot_settings (default 30 min, 1 car)
 *
 * @param vendorId    - The vendor to query
 * @param date        - YYYY-MM-DD
 * @param intervalMin - Fallback interval (overridden by vendor setting when available)
 */
export async function getAvailableSlots(
  vendorId: string,
  date: string,
  intervalMin = 30,
): Promise<TimeSlot[]> {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const isToday = new Date().toISOString().slice(0, 10) === date;

  // Fetch hours, slot settings, booked counts, and overrides in parallel
  const [hours, settingsRes, bookedRes, overridesRes] = await Promise.all([
    getWorkingHours(vendorId),
    supabase
      .from("vendor_slot_settings")
      .select("slot_interval_minutes, cars_per_slot")
      .eq("vendor_id", vendorId)
      .maybeSingle(),
    supabase.rpc("get_booked_slots", {
      p_vendor_id: vendorId,
      p_date: date,
    }),
    supabase
      .from("slot_overrides")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("date", date),
  ]);

  const settings = settingsRes?.data ?? null;
  const effectiveInterval: number =
    settings?.slot_interval_minutes ?? intervalMin;
  const carsPerSlot: number = settings?.cars_per_slot ?? 1;

  const dayHours = hours.find((h) => h.dayOfWeek === dayOfWeek);
  const overrides: SlotOverride[] = (overridesRes.data ?? []) as SlotOverride[];

  // Map time → blocked_spots count (for type=="blocked" with a specific time)
  const blockedSpotsMap = new Map<string, number>();
  for (const o of overrides) {
    if (o.type === "blocked" && o.time) {
      blockedSpotsMap.set((o.time ?? "").slice(0, 5), o.blocked_spots ?? 1);
    }
  }

  const openedTimes = new Set<string>(
    overrides
      .filter((o) => o.type === "opened" && o.time)
      .map((o) => (o.time ?? "").slice(0, 5)),
  );
  const dayBlocked = overrides.some((o) => o.type === "blocked" && !o.time);
  const dayOpened = overrides.some((o) => o.type === "opened" && !o.time);

  // Map time → booking count per slot
  const bookedCountMap = new Map<string, number>();
  for (const b of (bookedRes.data ?? []) as Array<{
    booking_time: string | null;
    booking_count: number;
  }>) {
    const t = (b.booking_time ?? "").slice(0, 5);
    if (t)
      bookedCountMap.set(
        t,
        (bookedCountMap.get(t) ?? 0) + (b.booking_count ?? 1),
      );
  }

  const nowMinutes = isToday
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -1;

  const normalSlots =
    dayHours && dayHours.isOpen && !dayBlocked
      ? generateSlots(dayHours.open, dayHours.close, effectiveInterval)
      : [];

  const extraOpenedSlots = [...openedTimes].filter(
    (t) => !normalSlots.includes(t),
  );

  const allCandidates = [...new Set([...normalSlots, ...extraOpenedSlots])];

  if (allCandidates.length === 0 && !dayOpened) return [];

  return allCandidates.sort().map((time): TimeSlot => {
    const bookedCount = bookedCountMap.get(time) ?? 0;
    // When the whole day is blocked, treat every spot as blocked
    const blockedSpots = dayBlocked
      ? carsPerSlot
      : (blockedSpotsMap.get(time) ?? 0);
    const taken = bookedCount + blockedSpots;

    // Past slots on today are hidden
    if (isToday && toMinutes(time) <= nowMinutes) {
      return {
        time,
        available: false,
        reason: "past",
        capacity: carsPerSlot,
        bookedCount,
        blockedSpots,
      };
    }

    // Slot is at or over capacity
    if (taken >= carsPerSlot) {
      // Determine primary reason: blocked wins if any vendor block caused it
      const isBlocked =
        dayBlocked || (blockedSpotsMap.has(time) && taken >= carsPerSlot);
      return {
        time,
        available: false,
        reason:
          isBlocked && blockedCount(bookedCount, blockedSpots, carsPerSlot)
            ? "blocked"
            : "booked",
        isManualOverride: blockedSpots > 0,
        capacity: carsPerSlot,
        bookedCount,
        blockedSpots,
      };
    }

    // Slot has remaining capacity
    if (openedTimes.has(time)) {
      return {
        time,
        available: true,
        reason: "opened",
        isManualOverride: true,
        capacity: carsPerSlot,
        bookedCount,
        blockedSpots,
      };
    }
    return {
      time,
      available: true,
      capacity: carsPerSlot,
      bookedCount,
      blockedSpots,
    };
  });
}

/** True when the blocking is what pushed the slot over capacity (not pure bookings). */
function blockedCount(booked: number, blocked: number, cap: number): boolean {
  return blocked > 0 && booked < cap;
}

/**
 * Check if a specific date + time slot is available for a vendor.
 * Returns true only if the slot exists in working hours AND is not booked.
 */
export async function isSlotAvailable(
  vendorId: string,
  date: string,
  time: string,
): Promise<boolean> {
  const slots = await getAvailableSlots(vendorId, date);
  return slots.some((s) => s.time === time && s.available);
}

/**
 * Get availability summary for a date range (for calendar view).
 * Returns { [date]: hasAvailableSlots } map.
 */
export async function getMonthAvailability(
  vendorId: string,
  year: number,
  month: number, // 0-indexed
): Promise<Record<string, boolean>> {
  const supabase = createClient();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const from = firstDay.toISOString().slice(0, 10);
  const to = lastDay.toISOString().slice(0, 10);

  // Fetch all bookings in the month
  const { data: bookings } = await supabase
    .from("bookings")
    .select("booking_date, booking_time")
    .eq("vendor_id", vendorId)
    .gte("booking_date", from)
    .lte("booking_date", to)
    .not("status", "eq", "cancelled");

  const bookedByDate: Record<string, Set<string>> = {};
  for (const b of bookings ?? []) {
    const d = b.booking_date as string;
    if (!bookedByDate[d]) bookedByDate[d] = new Set();
    bookedByDate[d].add((b.booking_time as string).slice(0, 5));
  }

  const hours = await getWorkingHours(vendorId);
  const result: Record<string, boolean> = {};

  // Walk each day
  const cur = new Date(firstDay);
  while (cur <= lastDay) {
    const dateStr = cur.toISOString().slice(0, 10);
    const dow = cur.getDay();
    const dayHours = hours.find((h) => h.dayOfWeek === dow);

    if (!dayHours || !dayHours.isOpen) {
      result[dateStr] = false;
    } else {
      const allSlots = generateSlots(dayHours.open, dayHours.close, 30);
      const booked = bookedByDate[dateStr] ?? new Set();
      result[dateStr] = allSlots.some((s) => !booked.has(s));
    }

    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

// ── Slot override CRUD ────────────────────────────────────────────────────────

/**
 * Block one or more specific slots on a date.
 * If `times` is empty, blocks the entire day.
 *
 * @param vendorId    Vendor performing the action
 * @param date        YYYY-MM-DD
 * @param times       Array of "HH:MM" strings. Empty = block whole day.
 * @param note        Optional internal note
 * @param blockedSpots How many car spots to block in each slot (default 1)
 */
export async function blockSlots(
  vendorId: string,
  date: string,
  times: string[],
  note?: string,
  blockedSpots = 1,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const rows =
    times.length > 0
      ? times.map((time) => ({
          vendor_id: vendorId,
          date,
          time,
          type: "blocked",
          blocked_spots: blockedSpots,
          note: note ?? null,
        }))
      : [
          {
            vendor_id: vendorId,
            date,
            time: null,
            type: "blocked",
            blocked_spots: blockedSpots,
            note: note ?? null,
          },
        ];

  const { error } = await supabase.from("slot_overrides").upsert(rows, {
    onConflict: "vendor_id,date,time",
  });
  if (error) console.error("[blockSlots] DB error:", error.message, error);
  return { error: error?.message ?? null };
}

/**
 * Open extra slots on a date that are outside normal working hours.
 * If `times` is empty, opens the whole day (e.g. special event day).
 *
 * @param vendorId  Vendor performing the action
 * @param date      YYYY-MM-DD
 * @param times     Array of "HH:MM" strings. Empty = open whole day.
 * @param note      Optional internal note
 */
export async function openSlots(
  vendorId: string,
  date: string,
  times: string[],
  note?: string,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const rows =
    times.length > 0
      ? times.map((time) => ({
          vendor_id: vendorId,
          date,
          time,
          type: "opened",
          note: note ?? null,
        }))
      : [
          {
            vendor_id: vendorId,
            date,
            time: null,
            type: "opened",
            note: note ?? null,
          },
        ];

  const { error } = await supabase.from("slot_overrides").upsert(rows, {
    onConflict: "vendor_id,date,time",
  });
  return { error: error?.message ?? null };
}

/**
 * Remove a manual override for a specific slot (or whole-day override).
 * Restores the slot to its default state (derived from working hours).
 *
 * @param vendorId
 * @param date      YYYY-MM-DD
 * @param time      "HH:MM" to restore one slot, or null to remove day-level override
 */
export async function removeSlotOverride(
  vendorId: string,
  date: string,
  time: string | null,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  let query = supabase
    .from("slot_overrides")
    .delete()
    .eq("vendor_id", vendorId)
    .eq("date", date);

  if (time === null) {
    query = query.is("time", null);
  } else {
    query = query.eq("time", time);
  }

  const { error } = await query;
  if (error)
    console.error("[removeSlotOverride] DB error:", error.message, error);
  return { error: error?.message ?? null };
}

/**
 * Fetch all overrides for a vendor on a given date.
 */
export async function getSlotOverrides(
  vendorId: string,
  date: string,
): Promise<SlotOverride[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("slot_overrides")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("date", date)
    .order("time");
  return (data ?? []) as SlotOverride[];
}

/**
 * Fetch overrides across a date range (e.g. for calendar month view).
 */
export async function getSlotOverridesRange(
  vendorId: string,
  from: string,
  to: string,
): Promise<SlotOverride[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("slot_overrides")
    .select("*")
    .eq("vendor_id", vendorId)
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .order("time");
  return (data ?? []) as SlotOverride[];
}

/**
 * Convenience: toggle a slot between blocked/opened/default.
 *
 * - If the slot has no override → blocks it
 * - If it's already blocked → removes the block (restores default)
 * - If it's already opened  → blocks it instead
 */
export async function toggleSlotOverride(
  vendorId: string,
  date: string,
  time: string,
): Promise<{ newState: "blocked" | "default"; error: string | null }> {
  const overrides = await getSlotOverrides(vendorId, date);
  const existing = overrides.find((o) => o.time === time);

  if (!existing) {
    const { error } = await blockSlots(vendorId, date, [time]);
    return { newState: "blocked", error };
  }

  // Remove override → back to default
  const { error } = await removeSlotOverride(vendorId, date, time);
  return { newState: "default", error };
}

// ── Branch-specific availability ─────────────────────────────────────────────

/**
 * Get available time slots for a specific branch on a date.
 * Uses branch_working_hours + branch_slot_overrides + bookings.branch_id filter.
 */
export async function getAvailableSlotsForBranch(
  branchId: string,
  date: string,
  intervalMin = 30,
): Promise<TimeSlot[]> {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const isToday = new Date().toISOString().slice(0, 10) === date;

  // Fetch working hours, booked slot counts, overrides, and vendor slot settings in parallel
  const [hoursRes, bookedRes, overridesRes, branchRes] = await Promise.all([
    supabase
      .from("branch_working_hours")
      .select("*")
      .eq("branch_id", branchId)
      .order("day_of_week"),
    supabase.rpc("get_booked_slots_for_branch", {
      p_branch_id: branchId,
      p_date: date,
    }),
    supabase
      .from("branch_slot_overrides")
      .select("*")
      .eq("branch_id", branchId)
      .eq("date", date),
    supabase
      .from("vendor_branches")
      .select("vendor_id")
      .eq("id", branchId)
      .maybeSingle(),
  ]);

  // Fetch vendor slot settings once we have the vendor_id
  const vendorId: string | null = branchRes?.data?.vendor_id ?? null;
  let settingsData: {
    slot_interval_minutes: number;
    cars_per_slot: number;
  } | null = null;
  if (vendorId) {
    const { data } = await supabase
      .from("vendor_slot_settings")
      .select("slot_interval_minutes, cars_per_slot")
      .eq("vendor_id", vendorId)
      .maybeSingle();
    settingsData = data ?? null;
  }
  const effectiveInterval: number =
    settingsData?.slot_interval_minutes ?? intervalMin;
  const carsPerSlot: number = settingsData?.cars_per_slot ?? 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let branchHours: WorkingHours[] = DEFAULT_WORKING_HOURS;
  if (hoursRes.data && hoursRes.data.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    branchHours = (hoursRes.data as any[]).map((row) => ({
      dayOfWeek: row.day_of_week as number,
      open: (row.open_time as string).slice(0, 5),
      close: (row.close_time as string).slice(0, 5),
      isOpen: row.is_open as boolean,
    }));
  }

  const dayHours = branchHours.find((h) => h.dayOfWeek === dayOfWeek);

  const overrides = (overridesRes.data ?? []) as SlotOverride[];

  const blockedSpotsMap = new Map<string, number>();
  for (const o of overrides) {
    if (o.type === "blocked" && o.time) {
      blockedSpotsMap.set((o.time ?? "").slice(0, 5), o.blocked_spots ?? 1);
    }
  }

  const openedTimes = new Set<string>(
    overrides
      .filter((o) => o.type === "opened" && o.time)
      .map((o) => (o.time ?? "").slice(0, 5)),
  );
  const dayBlocked = overrides.some((o) => o.type === "blocked" && !o.time);
  const dayOpened = overrides.some((o) => o.type === "opened" && !o.time);

  const bookedCountMap = new Map<string, number>();
  for (const b of (bookedRes.data ?? []) as Array<{
    booking_time: string | null;
    booking_count: number;
  }>) {
    const t = (b.booking_time ?? "").slice(0, 5);
    if (t)
      bookedCountMap.set(
        t,
        (bookedCountMap.get(t) ?? 0) + (b.booking_count ?? 1),
      );
  }

  const nowMinutes = isToday
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -1;

  const normalSlots =
    dayHours && dayHours.isOpen && !dayBlocked
      ? generateSlots(dayHours.open, dayHours.close, effectiveInterval)
      : [];
  const extraOpenedSlots = [...openedTimes].filter(
    (t) => !normalSlots.includes(t),
  );
  const allCandidates = [...new Set([...normalSlots, ...extraOpenedSlots])];

  if (allCandidates.length === 0 && !dayOpened) return [];

  return allCandidates.sort().map((time): TimeSlot => {
    const bookedCount = bookedCountMap.get(time) ?? 0;
    const blockedSpots = dayBlocked
      ? carsPerSlot
      : (blockedSpotsMap.get(time) ?? 0);
    const taken = bookedCount + blockedSpots;

    if (isToday && toMinutes(time) <= nowMinutes)
      return {
        time,
        available: false,
        reason: "past",
        capacity: carsPerSlot,
        bookedCount,
        blockedSpots,
      };

    if (taken >= carsPerSlot) {
      const isBlocked =
        dayBlocked ||
        (blockedSpotsMap.has(time) &&
          blockedSpots > 0 &&
          bookedCount < carsPerSlot);
      return {
        time,
        available: false,
        reason: isBlocked ? "blocked" : "booked",
        isManualOverride: blockedSpots > 0,
        capacity: carsPerSlot,
        bookedCount,
        blockedSpots,
      };
    }
    if (openedTimes.has(time))
      return {
        time,
        available: true,
        reason: "opened",
        isManualOverride: true,
        capacity: carsPerSlot,
        bookedCount,
        blockedSpots,
      };
    return {
      time,
      available: true,
      capacity: carsPerSlot,
      bookedCount,
      blockedSpots,
    };
  });
}

/**
 * Block one or more slots on a specific branch date.
 * If times is empty, blocks the entire day.
 */
export async function blockBranchSlots(
  branchId: string,
  date: string,
  times: string[],
  note?: string,
  blockedSpots = 1,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const rows =
    times.length > 0
      ? times.map((t) => ({
          branch_id: branchId,
          date,
          time: t,
          type: "blocked",
          blocked_spots: blockedSpots,
          note: note ?? null,
        }))
      : [
          {
            branch_id: branchId,
            date,
            time: null,
            type: "blocked",
            blocked_spots: blockedSpots,
            note: note ?? null,
          },
        ];
  const { error } = await supabase
    .from("branch_slot_overrides")
    .upsert(rows, { onConflict: "branch_id,date,time" });
  if (error)
    console.error("[blockBranchSlots] DB error:", error.message, error);
  return { error: error?.message ?? null };
}

/**
 * Remove a manual branch slot override (unblock).
 */
export async function removeBranchSlotOverride(
  branchId: string,
  date: string,
  time: string | null,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  let query = supabase
    .from("branch_slot_overrides")
    .delete()
    .eq("branch_id", branchId)
    .eq("date", date);
  if (time === null) query = query.is("time", null);
  else query = query.eq("time", time);
  const { error } = await query;
  return { error: error?.message ?? null };
}

// ── Vendor working hours ──────────────────────────────────────────────────────

/**
 * Convenience: update the vendor's working hours for a day.
 * Pass `isOpen: false` to close a whole day of the week.
 */
export async function saveWorkingHours(
  vendorId: string,
  hours: WorkingHours[],
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const rows = hours.map((h) => ({
    vendor_id: vendorId,
    day_of_week: h.dayOfWeek,
    open_time: h.open,
    close_time: h.close,
    is_open: h.isOpen,
  }));

  const { error } = await supabase
    .from("vendor_working_hours")
    .upsert(rows, { onConflict: "vendor_id,day_of_week" });

  return { error: error?.message ?? null };
}
