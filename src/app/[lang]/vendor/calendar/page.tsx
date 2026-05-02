"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink } from "@/components/ui/locale-link";
import {
  getAvailableSlots,
  getWorkingHours,
  saveWorkingHours,
  blockSlots,
  removeSlotOverride,
  getAvailableSlotsForBranch,
  blockBranchSlots,
  removeBranchSlotOverride,
  getVendorSlotSettings,
  saveVendorSlotSettings,
  type WorkingHours,
  type TimeSlot,
  type VendorSlotSettings,
  DEFAULT_WORKING_HOURS,
  DEFAULT_SLOT_SETTINGS,
} from "@/services/availabilityService";
import {
  getBranches,
  getBranchWorkingHours,
  saveBranchWorkingHours,
} from "@/services/branchService";
import type { DbBranch } from "@/types/database";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  User,
  Car,
  DollarSign,
  Settings2,
  Ban,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarBooking {
  id: string;
  booking_date: string;
  booking_time: string | null;
  status: string;
  notes: string | null;
  total_price: number | null;
  user: { full_name: string | null; phone: string | null } | null;
  service: { name: string; name_ar: string | null } | null;
  vehicle: { make: string; model: string; year: number } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  checked_in: "bg-purple-100 text-purple-700 border-purple-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  waiting_parts: "bg-orange-100 text-orange-700 border-orange-200",
  ready_for_pickup: "bg-teal-100 text-teal-700 border-teal-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const dates: Date[] = [];
  for (let i = 0; i < first.getDay(); i++)
    dates.unshift(new Date(year, month, -i));
  dates.reverse();
  for (let d = 1; d <= last.getDate(); d++)
    dates.push(new Date(year, month, d));
  while (dates.length % 7 !== 0)
    dates.push(
      new Date(
        year,
        month + 1,
        dates.length - last.getDate() - first.getDay() + 1,
      ),
    );
  return dates;
}

/** Format a Date as YYYY-MM-DD in LOCAL time (avoids UTC shift for Egypt UTC+2/+3). */
function localDateStr(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/** Returns Tailwind classes for a slot chip based on its state and capacity. */
function slotChipCls(slot: TimeSlot): string {
  if (!slot.available) {
    if (slot.reason === "blocked")
      return "bg-red-100 text-red-600 border-red-200 cursor-pointer hover:bg-red-200";
    if (slot.reason === "booked")
      return "bg-blue-100 text-blue-600 border-blue-200 cursor-default opacity-80";
    if (slot.reason === "past")
      return "bg-muted text-muted-foreground border-border cursor-default opacity-50";
    return "bg-muted text-muted-foreground border-border cursor-default";
  }
  // Partially used (has bookings or blocks but still available)
  const cap = slot.capacity ?? 1;
  const used = (slot.bookedCount ?? 0) + (slot.blockedSpots ?? 0);
  if (cap > 1 && used > 0) {
    return "bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100";
  }
  return "bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100";
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function VendorCalendarPage() {
  const { vendor, vendorType } = useAuth();
  const { t, locale } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // ── Branch selector ───────────────────────────────────────────────────────
  const [branches, setBranches] = useState<DbBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  // ── Bookings ──────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);

  // ── Selected day ──────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  // ── Booking detail dialog ─────────────────────────────────────────────────
  const [detailBooking, setDetailBooking] = useState<CalendarBooking | null>(
    null,
  );

  // ── Working hours dialog ──────────────────────────────────────────────────
  const [showWH, setShowWH] = useState(false);
  const [editHours, setEditHours] = useState<WorkingHours[]>(
    DEFAULT_WORKING_HOURS,
  );
  const [slotSettings, setSlotSettings] = useState<VendorSlotSettings>(
    DEFAULT_SLOT_SETTINGS,
  );
  const [savingHours, setSavingHours] = useState(false);

  // ── Block slot dialog ─────────────────────────────────────────────────────
  const [blockDialog, setBlockDialog] = useState<{
    slot: TimeSlot;
    newBlocked: number;
  } | null>(null);

  // ── Load branches once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!vendor) return;
    // Load extra branches. selectedBranch = null (main location) is the default.
    getBranches(vendor.id).then(setBranches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor]);

  // Reload working hours and slot settings when branch changes
  useEffect(() => {
    if (!vendor) return;
    if (selectedBranch) {
      getBranchWorkingHours(selectedBranch).then(setEditHours);
    } else {
      getWorkingHours(vendor.id).then(setEditHours);
    }
    // Load slot settings for the vendor (branch inherits vendor settings for now)
    getVendorSlotSettings(vendor.id).then(setSlotSettings);
  }, [vendor, selectedBranch]);

  // ── Load bookings for visible month ──────────────────────────────────────
  const loadBookings = useCallback(async () => {
    if (!vendor) return;
    setLoadingCal(true);
    const from = localDateStr(new Date(year, month, 1));
    const to = localDateStr(new Date(year, month + 1, 0));
    let q = supabase
      .from("bookings")
      .select(
        "id,booking_date,booking_time,status,notes,total_price," +
          "user:users!left(full_name,phone)," +
          "service:services(name,name_ar)," +
          "vehicle:vehicles!left(make,model,year)",
      )
      .eq("vendor_id", vendor.id)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("booking_time");
    // Apply branch filter only when a branch is explicitly selected
    if (selectedBranch) q = q.eq("branch_id", selectedBranch);
    const { data } = await q;
    setBookings((data ?? []) as unknown as CalendarBooking[]);
    setLoadingCal(false);
  }, [vendor, year, month, supabase, selectedBranch]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // ── Load time slots for the selected date ────────────────────────────────
  const loadSlots = useCallback(
    async (date: string) => {
      if (!vendor) return;
      setLoadingSlots(true);
      const slots = selectedBranch
        ? await getAvailableSlotsForBranch(selectedBranch, date)
        : await getAvailableSlots(vendor.id, date);
      setDaySlots(slots);
      setLoadingSlots(false);
    },
    [vendor, selectedBranch],
  );

  useEffect(() => {
    if (selectedDate) {
      setSlotError(null);
      loadSlots(selectedDate);
    } else setDaySlots([]);
  }, [selectedDate, loadSlots]);

  // ── Toggle a slot → always open the block dialog ────────────────────────
  const handleToggleSlot = useCallback(
    (slot: TimeSlot) => {
      if (!vendor || !selectedDate) return;
      if (slot.reason === "booked" || slot.reason === "past") return;

      const currentBlocked = slot.blockedSpots ?? 0;
      const cap = slot.capacity ?? 1;
      const booked = slot.bookedCount ?? 0;
      const maxBlockable = cap - booked;

      let startAt: number;
      if (cap === 1) {
        // Single-cap: already blocked → open at 0 so "Unblock" shows immediately.
        // Available → open at 1 so "Block Slot" shows immediately.
        startAt = currentBlocked > 0 ? 0 : 1;
      } else {
        // Multi-cap: start at the current blocked count (or 1 when nothing is blocked).
        startAt =
          currentBlocked > 0 ? currentBlocked : Math.min(1, maxBlockable);
      }

      setBlockDialog({ slot, newBlocked: startAt });
    },
    [vendor, selectedDate],
  );

  // ── Confirm block from dialog ────────────────────────────────────────────
  const handleConfirmBlock = useCallback(async () => {
    if (!blockDialog || !vendor || !selectedDate) return;
    const { slot, newBlocked } = blockDialog;
    setBlockDialog(null);
    setTogglingSlot(slot.time);
    setSlotError(null);

    let result: { error: string | null };

    if (newBlocked === 0) {
      result = selectedBranch
        ? await removeBranchSlotOverride(
            selectedBranch,
            selectedDate,
            slot.time,
          )
        : await removeSlotOverride(vendor.id, selectedDate, slot.time);
    } else {
      result = selectedBranch
        ? await blockBranchSlots(
            selectedBranch,
            selectedDate,
            [slot.time],
            "Blocked by vendor",
            newBlocked,
          )
        : await blockSlots(
            vendor.id,
            selectedDate,
            [slot.time],
            "Blocked by vendor",
            newBlocked,
          );
    }

    if (result.error) setSlotError(result.error);
    await loadSlots(selectedDate);
    setTogglingSlot(null);
  }, [blockDialog, vendor, selectedDate, loadSlots, selectedBranch]);

  // ── Save working hours + slot settings ──────────────────────────────────
  const handleSaveHours = useCallback(async () => {
    if (!vendor) return;
    setSavingHours(true);
    await Promise.all([
      selectedBranch
        ? saveBranchWorkingHours(selectedBranch, editHours)
        : saveWorkingHours(vendor.id, editHours),
      saveVendorSlotSettings(vendor.id, slotSettings),
    ]);
    setSavingHours(false);
    setShowWH(false);
    if (selectedDate) await loadSlots(selectedDate);
  }, [
    vendor,
    editHours,
    slotSettings,
    selectedDate,
    loadSlots,
    selectedBranch,
  ]);

  // ── Derived values (hooks must come before any conditional return) ─────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bookedCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings)
      map[b.booking_date] = (map[b.booking_date] ?? 0) + 1;
    return map;
  }, [bookings]);

  // ── Guard: calendar only for service centers ──────────────────────────────
  if (vendorType !== "service_center") {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>{t("vendor.calendarOnlyServiceCenters")}</p>
        </div>
      </VendorLayout>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const grid = buildMonthGrid(year, month);
  const todayStr = localDateStr(now);

  const byDate = (d: Date) =>
    bookings.filter((b) => b.booking_date === localDateStr(d));

  const dateBookings = selectedDate
    ? bookings.filter((b) => b.booking_date === selectedDate)
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* ── Branch selector ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">
            {t("vendor.navBranches")}:
          </span>
          {/* Main location tab — always visible, maps to vendor-level slot functions */}
          <Button
            size="sm"
            variant={selectedBranch === null ? "default" : "outline"}
            onClick={() => {
              setSelectedBranch(null);
              setSelectedDate(null);
            }}
          >
            {vendor?.business_name ?? t("vendor.mainLocation")}
            <span className="ml-1 text-xs opacity-60">
              ({t("vendor.mainBadge")})
            </span>
          </Button>
          {branches
            .filter((b) => !b.is_main)
            .map((b) => (
              <Button
                key={b.id}
                size="sm"
                variant={selectedBranch === b.id ? "default" : "outline"}
                onClick={() => {
                  setSelectedBranch(b.id);
                  setSelectedDate(null);
                }}
              >
                {b.name}
              </Button>
            ))}
        </div>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {t("vendor.calendarTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {MONTH_NAMES[month]} {year} &mdash; {t("vendor.calendarSubtitle")}
              <span className="ml-2 text-primary font-medium">
                &middot;{" "}
                {selectedBranch
                  ? (branches.find((b) => b.id === selectedBranch)?.name ?? "")
                  : (vendor?.business_name ?? t("vendor.mainLocation"))}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowWH(true)}
            >
              <Settings2 className="h-4 w-4" />
              {t("vendor.workingHours")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (month === 0) {
                  setMonth(11);
                  setYear((y) => y - 1);
                } else setMonth((m) => m - 1);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMonth(now.getMonth());
                setYear(now.getFullYear());
              }}
            >
              {t("vendor.today")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (month === 11) {
                  setMonth(0);
                  setYear((y) => y + 1);
                } else setMonth((m) => m + 1);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Calendar grid ───────────────────────────────────────────── */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-px mb-2">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-bold text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {loadingCal ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {grid.map((date, i) => {
                    const ds = localDateStr(date);
                    const inMonth = date.getMonth() === month;
                    const isToday = ds === todayStr;
                    const isSel = ds === selectedDate;
                    const dayBks = byDate(date);
                    const count = bookedCountByDate[ds];
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(isSel ? null : ds)}
                        className={cn(
                          "min-h-[80px] rounded-lg p-1.5 text-left transition-colors border",
                          inMonth ? "hover:bg-muted" : "opacity-30",
                          isToday
                            ? "border-primary bg-primary/5"
                            : "border-transparent",
                          isSel ? "border-primary bg-primary/10" : "",
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-bold block mb-1",
                            isToday
                              ? "text-primary"
                              : inMonth
                                ? "text-foreground"
                                : "text-muted-foreground",
                          )}
                        >
                          {date.getDate()}
                        </span>
                        <div className="space-y-0.5">
                          {dayBks.slice(0, 3).map((b) => (
                            <div
                              key={b.id}
                              className={cn(
                                "text-[9px] font-semibold px-1 py-0.5 rounded truncate border",
                                STATUS_CLS[b.status] ??
                                  "bg-muted text-foreground border-border",
                              )}
                            >
                              {b.booking_time ? b.booking_time.slice(0, 5) + " " : ""}
                              {b.user?.full_name?.split(" ")[0] ?? (locale === "ar" && b.service?.name_ar ? b.service.name_ar : (b.service?.name ?? "—"))}
                            </div>
                          ))}
                          {dayBks.length > 3 && (
                            <div className="text-[9px] text-muted-foreground px-1">
                              +{dayBks.length - 3} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />{" "}
                  {t("vendor.available")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />{" "}
                  {t("vendor.booked")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-100 border border-red-200" />{" "}
                  {t("vendor.blocked")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-muted border" />{" "}
                  {t("vendor.pastClosed")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ── Day detail panel ────────────────────────────────────────── */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">
                {selectedDate
                  ? new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      locale === "ar" ? "ar-EG" : "en",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : t("vendor.selectDate")}
              </CardTitle>
              {selectedDate && (
                <p className="text-xs text-muted-foreground">
                  {t("vendor.clickSlotHint")}
                </p>
              )}
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">
                  {t("vendor.clickDateHint")}
                </p>
              ) : (
                <>
                  {/* ── Slot grid ──────────────────────────────────── */}
                  <section>
                    <p className="text-xs font-semibold mb-2">
                      {t("vendor.timeSlots")}
                    </p>

                    {slotError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 mb-2">
                        <strong>{t("vendor.couldNotSave")}</strong> {slotError}
                        {slotError.includes("exist") && (
                          <p className="mt-1 text-red-600">
                            The <code>slot_overrides</code> table is missing.
                            Run the SQL migration in your Supabase dashboard.
                          </p>
                        )}
                      </div>
                    )}

                    {loadingSlots ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 rounded" />
                        ))}
                      </div>
                    ) : daySlots.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        {t("vendor.noSlotsOutsideHours")}
                        <br />
                        <button
                          className="text-primary underline mt-1"
                          onClick={() => setShowWH(true)}
                        >
                          {t("vendor.configureWorkingHours")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-1.5">
                          {daySlots.map((slot) => {
                            const isToggling = togglingSlot === slot.time;
                            const clickable =
                              slot.reason !== "booked" &&
                              slot.reason !== "past";
                            const cap = slot.capacity ?? 1;
                            const used =
                              (slot.bookedCount ?? 0) +
                              (slot.blockedSpots ?? 0);
                            const showCap = cap > 1;
                            return (
                              <button
                                key={slot.time}
                                disabled={!clickable || isToggling}
                                onClick={() => handleToggleSlot(slot)}
                                title={
                                  slot.reason === "booked"
                                    ? t("vendor.bookedByCustomer")
                                    : slot.reason === "blocked"
                                      ? t("vendor.manuallyBlocked")
                                      : slot.reason === "past"
                                        ? t("vendor.pastSlot")
                                        : t("vendor.clickToManageBlocking")
                                }
                                className={cn(
                                  "relative text-xs font-semibold rounded border px-1 py-1.5 transition-colors text-center leading-tight",
                                  slotChipCls(slot),
                                  isToggling && "opacity-60",
                                )}
                              >
                                {isToggling ? (
                                  <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                                ) : (
                                  <>
                                    <span className="block">{slot.time}</span>
                                    {showCap && (
                                      <span className="block text-[9px] opacity-75 mt-0.5">
                                        {used}/{cap}
                                      </span>
                                    )}
                                    {!showCap && slot.blockedSpots ? (
                                      <span className="block text-[9px] opacity-70">
                                        🔒
                                      </span>
                                    ) : null}
                                  </>
                                )}
                                {slot.reason === "blocked" && !isToggling && (
                                  <Ban className="h-2.5 w-2.5 absolute top-0.5 right-0.5 opacity-60" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {daySlots.filter((s) => s.available).length}{" "}
                          {t("vendor.available")} &middot;{" "}
                          {daySlots.filter((s) => s.reason === "booked").length}{" "}
                          {t("vendor.booked")} &middot;{" "}
                          {
                            daySlots.filter((s) => s.reason === "blocked")
                              .length
                          }{" "}
                          {t("vendor.blocked")}
                          {(slotSettings.cars_per_slot ?? 1) > 1 && (
                            <span className="ml-2 text-primary font-medium">
                              · {slotSettings.cars_per_slot}{" "}
                              {t("vendor.carsPerSlot")}
                            </span>
                          )}
                        </p>
                      </>
                    )}
                  </section>

                  {/* ── Bookings list ────────────────────────────── */}
                  {dateBookings.length > 0 && (
                    <section>
                      <p className="text-xs font-semibold mb-2">
                        {t("vendor.bookingsSection")}
                      </p>
                      <div className="space-y-2">
                        {dateBookings.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => setDetailBooking(b)}
                            className="w-full text-left"
                          >
                            <div
                              className={cn(
                                "rounded-lg border p-3 space-y-1 hover:shadow-sm transition-shadow",
                                STATUS_CLS[b.status] ?? "",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold truncate">
                                  {b.user?.full_name ?? "—"}
                                </span>
                                <span className="text-[10px] font-bold capitalize shrink-0">
                                  {t(`vendor.statusLabels.${b.status}`) ||
                                    b.status.replace(/_/g, " ")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>{b.booking_time?.slice(0, 5) ?? "—"}</span>
                                <span>·</span>
                                <span className="truncate">
                                  {locale === "ar" && b.service?.name_ar
                                    ? b.service.name_ar
                                    : (b.service?.name ?? t("vendor.service"))}
                                </span>
                              </div>
                              {b.user?.phone && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {b.user.phone}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Booking detail dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!detailBooking}
        onOpenChange={(o) => !o && setDetailBooking(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("vendor.bookingDetails")}</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-4">
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm font-semibold capitalize",
                  STATUS_CLS[detailBooking.status] ?? "",
                )}
              >
                {t(`vendor.statusLabels.${detailBooking.status}`) ||
                  detailBooking.status.replace(/_/g, " ")}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>
                    {detailBooking.booking_date}
                    {detailBooking.booking_time
                      ? ` at ${detailBooking.booking_time.slice(0, 5)}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>
                    {detailBooking.user?.full_name ?? "—"}
                    {detailBooking.user?.phone
                      ? ` · ${detailBooking.user.phone}`
                      : ""}
                  </span>
                </div>
                {detailBooking.vehicle && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Car className="h-4 w-4 shrink-0" />
                    <span>
                      {detailBooking.vehicle.year} {detailBooking.vehicle.make}{" "}
                      {detailBooking.vehicle.model}
                    </span>
                  </div>
                )}
                {detailBooking.total_price != null && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    <span>
                      EGP {detailBooking.total_price.toLocaleString()}
                    </span>
                  </div>
                )}
                {detailBooking.notes && (
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    {detailBooking.notes}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDetailBooking(null)}
                >
                  {t("vendor.close")}
                </Button>
                <Button className="flex-1" asChild>
                  <LocaleLink href="/vendor/bookings">
                    {t("vendor.manage")}
                  </LocaleLink>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Block Slot dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!blockDialog}
        onOpenChange={(o) => !o && setBlockDialog(null)}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              {t("vendor.blockSlotDialogTitle")} {blockDialog?.slot.time}
            </DialogTitle>
          </DialogHeader>
          {blockDialog &&
            (() => {
              const slot = blockDialog.slot;
              const cap = slot.capacity ?? 1;
              const booked = slot.bookedCount ?? 0;
              const maxBlockable = cap - booked;
              const free = Math.max(0, cap - booked - blockDialog.newBlocked);
              const isSingleCap = cap === 1;
              return (
                <div className="space-y-4">
                  {/* Visual capacity bar */}
                  <div className="space-y-2">
                    <div className="flex gap-1 h-9">
                      {Array.from({ length: cap }).map((_, i) => {
                        let cls: string;
                        if (i < booked) cls = "bg-blue-400 border-blue-500";
                        else if (i < booked + blockDialog.newBlocked)
                          cls = "bg-red-400 border-red-500";
                        else cls = "bg-green-100 border-green-300";
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 rounded border transition-colors",
                              cls,
                            )}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />
                        {booked} {t("vendor.booked")}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
                        {blockDialog.newBlocked} {t("vendor.blocked")}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-green-200 inline-block" />
                        {free} {t("vendor.available")}
                      </span>
                    </div>
                  </div>

                  {/* Counter (+/−) — only shown for multi-cap */}
                  {!isSingleCap && (
                    <div className="flex items-center justify-center gap-6 py-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 text-xl font-bold rounded-full"
                        disabled={blockDialog.newBlocked <= 0}
                        onClick={() =>
                          setBlockDialog((d) =>
                            d ? { ...d, newBlocked: d.newBlocked - 1 } : d,
                          )
                        }
                      >
                        −
                      </Button>
                      <div className="text-center min-w-[5rem]">
                        <span className="text-5xl font-bold tabular-nums">
                          {blockDialog.newBlocked}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {t("vendor.blockSlotCarsToBlock")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 text-xl font-bold rounded-full"
                        disabled={blockDialog.newBlocked >= maxBlockable}
                        onClick={() =>
                          setBlockDialog((d) =>
                            d ? { ...d, newBlocked: d.newBlocked + 1 } : d,
                          )
                        }
                      >
                        +
                      </Button>
                    </div>
                  )}

                  {blockDialog.newBlocked === 0 &&
                    (slot.blockedSpots ?? 0) > 0 && (
                      <p className="text-xs text-center text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                        {t("vendor.blockSlotClearHint")}
                      </p>
                    )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setBlockDialog(null)}
                    >
                      {t("vendor.close")}
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={
                        blockDialog.newBlocked === 0 &&
                        (slot.blockedSpots ?? 0) === 0
                      }
                      variant={
                        blockDialog.newBlocked === 0 ? "outline" : "default"
                      }
                      onClick={handleConfirmBlock}
                    >
                      {blockDialog.newBlocked === 0
                        ? t("vendor.blockSlotClear")
                        : isSingleCap
                          ? t("vendor.blockSlot")
                          : t("vendor.blockSlotConfirm")}
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* ── Working Hours dialog ───────────────────────────────────────────── */}
      <Dialog
        open={showWH}
        onOpenChange={(o) => {
          if (!o) setShowWH(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {t("vendor.workingHours")}
              <span className="text-sm text-muted-foreground font-normal">
                &mdash;{" "}
                {selectedBranch
                  ? (branches.find((b) => b.id === selectedBranch)?.name ?? "")
                  : (vendor?.business_name ?? t("vendor.mainLocation"))}
              </span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            {t("vendor.workingHoursDesc")}
          </p>

          <div className="space-y-3 mt-2 max-h-[55vh] overflow-y-auto pr-1">
            {editHours.map((h, idx) => (
              <div
                key={h.dayOfWeek}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <Switch
                    id={`day-${h.dayOfWeek}`}
                    checked={h.isOpen}
                    onCheckedChange={(val) =>
                      setEditHours((prev) =>
                        prev.map((d, i) =>
                          i === idx ? { ...d, isOpen: val } : d,
                        ),
                      )
                    }
                  />
                  <Label
                    htmlFor={`day-${h.dayOfWeek}`}
                    className={cn(
                      "text-sm font-semibold select-none cursor-pointer",
                      !h.isOpen && "text-muted-foreground",
                    )}
                  >
                    {DAY_NAMES_FULL[h.dayOfWeek].slice(0, 3)}
                  </Label>
                </div>
                {h.isOpen ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={h.open}
                      onChange={(e) =>
                        setEditHours((prev) =>
                          prev.map((d, i) =>
                            i === idx ? { ...d, open: e.target.value } : d,
                          ),
                        )
                      }
                      className="h-8 text-sm w-28"
                    />
                    <span className="text-muted-foreground text-sm shrink-0">
                      {t("vendor.to")}
                    </span>
                    <Input
                      type="time"
                      value={h.close}
                      onChange={(e) =>
                        setEditHours((prev) =>
                          prev.map((d, i) =>
                            i === idx ? { ...d, close: e.target.value } : d,
                          ),
                        )
                      }
                      className="h-8 text-sm w-28"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground flex-1 italic">
                    {t("vendor.closedDay")}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ── Slot Settings ───────────────────────────────────────────── */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-bold">{t("vendor.slotSettings")}</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Time interval */}
              <div className="space-y-1">
                <Label className="text-xs">{t("vendor.slotInterval")}</Label>
                <select
                  value={slotSettings.slot_interval_minutes}
                  onChange={(e) =>
                    setSlotSettings((s) => ({
                      ...s,
                      slot_interval_minutes: Number(e.target.value),
                    }))
                  }
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
              {/* Cars per slot */}
              <div className="space-y-1">
                <Label className="text-xs">{t("vendor.carsPerSlot")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={slotSettings.cars_per_slot}
                  onChange={(e) =>
                    setSlotSettings((s) => ({
                      ...s,
                      cars_per_slot: Math.max(
                        1,
                        Math.min(20, Number(e.target.value) || 1),
                      ),
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("vendor.slotSettingsHint")}
            </p>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowWH(false)}
            >
              {t("vendor.close")}
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={handleSaveHours}
              disabled={savingHours}
            >
              {savingHours ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("vendor.saveHours")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
