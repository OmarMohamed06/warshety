"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGarage, vehicleLabel } from "@/context/GarageContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  getAvailableSlots,
  getAvailableSlotsForBranch,
  type TimeSlot,
} from "@/services/availabilityService";
import { createBooking } from "@/services/bookingService";
import { createClient } from "@/lib/supabase/client";
import type { DbService, DbBranch, BookingType } from "@/types/database";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

/** Convert "HH:MM" (24h) to "h:mm AM/PM" for display */
function fmtSlot(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Controls are thumb targets: 44px is the floor. */
const CONTROL =
  "h-11 w-full rounded-lg border border-border bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

/**
 * Step heading. The panel used to be eight blocks wearing the same uppercase
 * label, with no way to tell how far along you were; numbering them (and
 * swapping the number for a tick once the step is satisfied) is the whole
 * difference between a form and a list of inputs.
 */
function StepHeader({
  index,
  title,
  done,
  invalid,
  aside,
}: {
  index: number;
  title: string;
  done?: boolean;
  invalid?: boolean;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
          invalid
            ? "bg-destructive text-white"
            : done
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {invalid ? (
          <Icon name="priority_high" size="xs" />
        ) : done ? (
          <Icon name="check" size="xs" />
        ) : (
          index
        )}
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      {aside && (
        <span className="ms-auto min-w-0 truncate text-xs text-muted-foreground">
          {aside}
        </span>
      )}
    </div>
  );
}

/** Inline, under the field it belongs to — never only at the foot of the form. */
function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
      <Icon name="error" size="2xs" />
      {message}
    </p>
  );
}

interface Props {
  vendorId: string;
  vendorName: string;
  services: DbService[];
  /** Branches for this service center. If >1 branch, a branch selector is shown. */
  branches?: DbBranch[];
}

const BOOKING_TYPES: {
  value: BookingType;
  labelKey: string;
  descKey: string;
  icon: string;
}[] = [
  {
    value: "routine_maintenance",
    labelKey: "bookingSidebar.routineMaintenance",
    descKey: "bookingSidebar.routineMaintenanceDesc",
    icon: "build",
  },
  {
    value: "inspection",
    labelKey: "bookingSidebar.inspection",
    descKey: "bookingSidebar.inspectionDesc",
    icon: "troubleshoot",
  },
];

export default function BookingSidebar({
  vendorId,
  vendorName,
  services,
  branches = [],
}: Props) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { vehicles, activeVehicle } = useGarage();
  const { t, locale, localePath } = useLanguage();

  // Branch selection — always pre-select main branch (or first) when branches exist
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    () => {
      if (branches.length === 0) return null;
      const main = branches.find((b) => b.is_main);
      return main ? main.id : branches[0].id;
    },
  );

  const [bookingType, setBookingType] = useState<BookingType>(
    "routine_maintenance",
  );
  const [vehicleId, setVehicleId] = useState("");
  const [mileage, setMileage] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** Which field `error` belongs to, so the message can sit beside it. */
  const [errorField, setErrorField] = useState("");
  const [success, setSuccess] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  // null = no active booking (or not yet checked). A string ID means blocked.
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  /** Purely presentational: swaps the vehicle summary card for the picker. */
  const [changingVehicle, setChangingVehicle] = useState(false);
  /** Reveals the native date input for dates beyond the visible strip. */
  const [showDateInput, setShowDateInput] = useState(false);

  // Check for existing active booking in the background — does not block render.
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    supabase
      .from("bookings")
      .select("id")
      .eq("user_id", user.id)
      .in("status", [
        "confirmed",
        "checked_in",
        "in_progress",
        "waiting_parts",
        "ready_for_pickup",
      ])
      .limit(1)
      .then(({ data }) => setActiveBookingId(data?.[0]?.id ?? null));
  }, [user?.id]);

  // Auto-set vehicle and mileage from garage
  useEffect(() => {
    if (vehicles.length > 0 && !vehicleId) {
      const defaultVehicle = activeVehicle ?? vehicles[0];
      setVehicleId(defaultVehicle.id);
      if (defaultVehicle.mileage) {
        setMileage(String(defaultVehicle.mileage));
      }
    }
  }, [vehicles, activeVehicle, vehicleId]);

  // Pre-fill phone from user profile
  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.phone]);

  // Auto-fill mileage when vehicle changes
  useEffect(() => {
    const v = vehicles.find((v) => v.id === vehicleId);
    if (v?.mileage) setMileage(String(v.mileage));
    else setMileage("");
  }, [vehicleId, vehicles]);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      return;
    }
    setTime("");
    setSlotsLoading(true);
    // 'main' is the sentinel for the vendor's own location (no sub-branch)
    const fetcher =
      selectedBranchId && selectedBranchId !== "main"
        ? getAvailableSlotsForBranch(selectedBranchId, date)
        : getAvailableSlots(vendorId, date);
    fetcher
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [date, vendorId, selectedBranchId]);

  const today = new Date().toISOString().split("T")[0];

  // The day strip replaces a bare <input type="date">, which made you commit to
  // a date before it would tell you whether anything was open. Built in UTC off
  // the same `today` string the input's `min` uses, so server and client render
  // identical markup. The native input stays one tap away for anything further out.
  const dayStrip = useMemo(() => {
    const intl = locale === "ar" ? "ar-EG" : "en-US";
    const base = new Date(`${today}T00:00:00Z`);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + i);
      return {
        value: d.toISOString().split("T")[0],
        weekday: d.toLocaleDateString(intl, {
          weekday: "short",
          timeZone: "UTC",
        }),
        day: d.toLocaleDateString(intl, { day: "numeric", timeZone: "UTC" }),
      };
    });
  }, [today, locale]);

  const availableSlots = slots.filter((s) => s.available);
  const morningSlots = availableSlots.filter(
    (s) => Number(s.time.split(":")[0]) < 12,
  );
  const afternoonSlots = availableSlots.filter(
    (s) => Number(s.time.split(":")[0]) >= 12,
  );

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      router.push(
        localePath(
          `/auth/login?next=${encodeURIComponent(window.location.pathname)}`,
        ),
      );
      return;
    }
    if (!date || !time) {
      setError(t("bookingSidebar.errorDateTime"));
      setErrorField("datetime");
      return;
    }
    if (branches.length > 0 && !selectedBranchId) {
      setError(t("bookingSidebar.errorSelectBranch"));
      setErrorField("branch");
      return;
    }
    if (bookingType === "routine_maintenance" && !mileage) {
      setError(t("bookingSidebar.errorMileage"));
      setErrorField("mileage");
      return;
    }
    if (bookingType === "inspection" && !problemDescription.trim()) {
      setError(t("bookingSidebar.errorProblem"));
      setErrorField("problem");
      return;
    }
    if (!phone.trim()) {
      setError(t("bookingSidebar.errorPhone"));
      setErrorField("phone");
      return;
    }
    setLoading(true);
    setError("");
    setErrorField("");

    const { booking: data, error: bookingError } = await createBooking({
      userId: user!.id,
      vendorId,
      // 'main' sentinel means the vendor's own location — no sub-branch
      branchId:
        selectedBranchId && selectedBranchId !== "main"
          ? selectedBranchId
          : null,
      bookingType,
      serviceKey: null,
      vehicleId: vehicleId || null,
      bookingDate: date,
      bookingTime: time,
      mileage:
        bookingType === "routine_maintenance" ? Number(mileage) || null : null,
      notes: bookingType === "inspection" ? problemDescription : undefined,
    });

    if (bookingError || !data) {
      setError(bookingError ?? t("bookingSidebar.errorGeneric"));
      setErrorField("submit");
      setLoading(false);
      return;
    }

    // Save phone to user profile if new or changed — so notify endpoint can use it
    const trimmedPhone = phone.trim();
    if (trimmedPhone && trimmedPhone !== user?.phone) {
      const supabase = createClient();
      await supabase
        .from("users")
        .update({ phone: trimmedPhone })
        .eq("id", user!.id);
    }

    // Fire email + SMS notifications server-side (fire-and-forget)
    // keepalive: true ensures the request survives page navigation
    fetch("/api/bookings/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: data.id }),
      keepalive: true,
    }).catch(() => {});

    setSuccess(true);
    setTimeout(() => router.push(localePath(`/bookings/${data.id}`)), 1500);
  };

  // ── Terminal states ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-foreground/10 lg:sticky lg:top-24">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
          <Icon name="check_circle" size="xl" filled />
        </div>
        <h3 className="mt-4 text-base font-semibold">
          {t("bookingSidebar.bookingConfirmed")}
        </h3>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("bookingSidebar.redirecting")}
        </p>
      </div>
    );
  }

  if (activeBookingId) {
    return (
      <div className="rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-foreground/10 lg:sticky lg:top-24">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-500">
          <Icon name="pending_actions" size="xl" />
        </div>
        <h3 className="mt-4 text-base font-semibold">
          {t("bookingSidebar.activeBookingTitle")}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {t("bookingSidebar.activeBookingDesc")}
        </p>
        <Button
          variant="outline"
          className="mt-4 h-11 w-full"
          onClick={() => router.push(localePath(`/bookings/${activeBookingId}`))}
        >
          {t("bookingSidebar.viewMyBooking")}
        </Button>
      </div>
    );
  }

  // ── Panel ───────────────────────────────────────────────────────────────────

  return (
    // The old panel was `sticky` while being taller than the viewport, so the
    // Confirm button was never on screen together with the fields. Capping the
    // height and scrolling the body keeps the summary and CTA pinned instead.
    <div className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]">
      <div className="min-h-0 flex-1 lg:overflow-y-auto">
        {/* ── Header ── */}
        <div className="p-5 pb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("bookingSidebar.title")}
          </h2>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="storefront" size="xs" />
            <span className="truncate font-medium text-foreground">
              {vendorName}
            </span>
          </p>
        </div>

        {/* ── Branch ── */}
        {branches.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <p className="mb-2.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              {t("bookingSidebar.selectBranch")}
            </p>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => {
                const isSelected = selectedBranchId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBranchId(b.id);
                      setDate("");
                      setTime("");
                    }}
                    aria-pressed={isSelected}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:border-primary/50"
                    }`}
                  >
                    {isSelected && <Icon name="check" size="2xs" />}
                    {b.name}
                    {b.is_main && (
                      <span className={isSelected ? "opacity-70" : "text-muted-foreground"}>
                        · {t("bookingSidebar.mainBranch")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {errorField === "branch" && <FieldError message={error} />}
          </div>
        )}

        {/* ── Auth notice ── */}
        {!isAuthenticated && !authLoading && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <Icon name="info" size="sm" className="mt-px shrink-0" />
            {t("bookingSidebar.mustBeLoggedIn")}
          </div>
        )}

        {/* ── 1. Booking type ── */}
        <div className="border-t border-border p-5">
          <StepHeader index={1} title={t("bookingSidebar.step1")} done />
          <div className="space-y-2">
            {BOOKING_TYPES.map((bt) => {
              const isSelected = bookingType === bt.value;
              return (
                <button
                  key={bt.value}
                  type="button"
                  onClick={() => setBookingType(bt.value)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/[0.06] ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon
                    name={bt.icon}
                    size="lg"
                    className={isSelected ? "text-primary" : "text-muted-foreground"}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {t(bt.labelKey)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t(bt.descKey)}
                    </span>
                  </span>
                  {/* A glyph as well as colour — selection is never colour alone. */}
                  {isSelected ? (
                    <Icon name="check_circle" size="lg" filled className="shrink-0 text-primary" />
                  ) : (
                    <Icon name="radio_button_unchecked" size="lg" className="shrink-0 text-muted-foreground/40" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. Vehicle + (mileage | problem) ── */}
        <div className="border-t border-border p-5">
          <StepHeader
            index={2}
            title={
              bookingType === "inspection"
                ? t("bookingSidebar.step2Problem")
                : t("bookingSidebar.step2Vehicle")
            }
            done={
              bookingType === "inspection"
                ? !!problemDescription.trim()
                : !!mileage
            }
            invalid={errorField === "mileage" || errorField === "problem"}
            aside={
              selectedVehicle && !changingVehicle
                ? t("bookingSidebar.fromYourGarage")
                : undefined
            }
          />

          {/* Vehicle */}
          {vehicles.length === 0 ? (
            <a
              href={localePath("/garage")}
              className="group flex items-center gap-3 rounded-xl border border-dashed border-border p-3 transition-colors hover:border-primary/50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Icon name="add" size="lg" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {t("bookingSidebar.addVehicle")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("bookingSidebar.linkYourCar")}
                </span>
              </span>
            </a>
          ) : selectedVehicle && !changingVehicle ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground ring-1 ring-border">
                <Icon name="directions_car" size="lg" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {vehicleLabel(selectedVehicle)}
                </span>
                {selectedVehicle.plate && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {selectedVehicle.plate}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setChangingVehicle(true)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                {t("bookingSidebar.change")}
              </button>
            </div>
          ) : (
            <Select
              value={vehicleId}
              onValueChange={(v) => {
                if (!v) return;
                setVehicleId(v);
                setChangingVehicle(false);
              }}
            >
              <SelectTrigger className={CONTROL}>
                <span className="flex flex-1 truncate text-start text-sm">
                  {selectedVehicle ? (
                    vehicleLabel(selectedVehicle)
                  ) : (
                    <span className="text-muted-foreground">
                      {t("bookingSidebar.noVehicleSelected")}
                    </span>
                  )}
                </span>
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {vehicleLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Routine maintenance → mileage */}
          {bookingType === "routine_maintenance" && (
            <div className="mt-3 space-y-1.5">
              <label
                htmlFor="booking-mileage"
                className="flex items-center gap-1 text-xs font-semibold"
              >
                {t("bookingSidebar.currentMileage")}
                <span className="text-destructive" aria-hidden="true">*</span>
              </label>
              {/* "km" is a flex sibling, not an overlay on a padded field:
                  `pe-*` does not displace the base `px-*` through
                  tailwind-merge, so the reserved space was never guaranteed. */}
              <div
                className={`${CONTROL} flex items-center gap-2`}
                data-invalid={errorField === "mileage" || undefined}
              >
                <input
                  id="booking-mileage"
                  type="number"
                  inputMode="numeric"
                  value={mileage}
                  min={0}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="45000"
                  aria-invalid={errorField === "mileage"}
                  className="h-full min-w-0 flex-1 bg-transparent outline-none"
                />
                <span className="pointer-events-none shrink-0 text-xs font-semibold text-muted-foreground">
                  km
                </span>
              </div>
              {errorField === "mileage" ? (
                <FieldError message={error} />
              ) : (
                selectedVehicle?.mileage && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon name="auto_awesome" size="2xs" />
                    {t("bookingSidebar.autoFilledMileage")}
                  </p>
                )
              )}
            </div>
          )}

          {/* Inspection → problem description */}
          {bookingType === "inspection" && (
            <div className="mt-3 space-y-1.5">
              <label
                htmlFor="booking-problem"
                className="flex items-center gap-1 text-xs font-semibold"
              >
                {t("bookingSidebar.problemDescription")}
                <span className="text-destructive" aria-hidden="true">*</span>
              </label>
              <textarea
                id="booking-problem"
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder={t("bookingSidebar.problemPlaceholder")}
                rows={4}
                aria-invalid={errorField === "problem"}
                className="w-full resize-none rounded-lg border border-border bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              />
              {errorField === "problem" && <FieldError message={error} />}
              <p className="text-xs text-muted-foreground">
                {t("bookingSidebar.problemHint")}
              </p>
            </div>
          )}
        </div>

        {/* ── 3. When ── */}
        <div className="border-t border-border p-5">
          <StepHeader
            index={3}
            title={t("bookingSidebar.step3")}
            done={!!date && !!time}
            invalid={errorField === "datetime"}
          />

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide">
            {dayStrip.map((d) => {
              const isSelected = date === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDate(d.value)}
                  aria-pressed={isSelected}
                  className={`grid h-16 w-14 shrink-0 content-center justify-items-center gap-0.5 rounded-xl border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase ${
                      isSelected ? "opacity-80" : "text-muted-foreground"
                    }`}
                  >
                    {d.weekday}
                  </span>
                  <span className="text-base font-bold tabular-nums">
                    {d.day}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Anything past the strip still reachable — the old input had no ceiling. */}
          {showDateInput ? (
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className={`${CONTROL} mt-2`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowDateInput(true)}
              className="mt-1 inline-flex items-center gap-1 rounded px-1 py-1 text-xs font-semibold text-primary transition-colors hover:underline"
            >
              <Icon name="calendar_month" size="2xs" />
              {t("bookingSidebar.otherDate")}
            </button>
          )}

          {/* Slots, split by half-day — a flat 3-col grid of 12 chips reads as noise. */}
          <div className="mt-4">
            {!date ? (
              <p className="text-xs text-muted-foreground">
                {t("bookingSidebar.pickDateFirst")}
              </p>
            ) : slotsLoading ? (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                {t("bookingSidebar.loadingSlots")}
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("bookingSidebar.noSlotsAvailable")}
              </p>
            ) : (
              <div className="space-y-4">
                {[
                  { key: "morning", list: morningSlots },
                  { key: "afternoon", list: afternoonSlots },
                ]
                  .filter((g) => g.list.length > 0)
                  .map((group) => (
                    <div key={group.key}>
                      <p className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                        {t(`bookingSidebar.${group.key}`)}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {group.list.map((slot) => {
                          const isSelected = time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setTime(slot.time)}
                              aria-pressed={isSelected}
                              className={`h-11 rounded-lg border text-xs font-semibold transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary hover:text-primary"
                              }`}
                            >
                              {fmtSlot(slot.time)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {errorField === "datetime" && <FieldError message={error} />}
          </div>
        </div>

        {/* ── 4. Contact ── */}
        <div className="border-t border-border p-5">
          <StepHeader
            index={4}
            title={t("bookingSidebar.step4")}
            done={!!phone.trim()}
            invalid={errorField === "phone"}
          />
          <div className="space-y-1.5">
            <label
              htmlFor="booking-phone"
              className="flex items-center gap-1 text-xs font-semibold"
            >
              {t("bookingSidebar.phoneNumber")}
              <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="booking-phone"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+20 1XX XXX XXXX"
              aria-invalid={errorField === "phone"}
              className={CONTROL}
            />
            {errorField === "phone" ? (
              <FieldError message={error} />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("bookingSidebar.phoneHint")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Pinned summary + CTA ── */}
      <div className="shrink-0 border-t border-border bg-card/95 p-5 backdrop-blur">
        {date && time && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs">
            <Icon name="event_available" size="sm" className="shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">
                {new Date(`${date}T00:00:00Z`).toLocaleDateString(
                  locale === "ar" ? "ar-EG" : "en-US",
                  { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" },
                )}{" "}
                · {fmtSlot(time)}
              </span>
              {selectedVehicle && (
                <span className="text-muted-foreground">
                  {" "}
                  — {selectedVehicle.brand} {selectedVehicle.model}
                </span>
              )}
            </span>
          </div>
        )}

        {errorField === "submit" && (
          <p className="mb-3 flex items-start gap-1.5 text-xs font-medium text-destructive">
            <Icon name="error" size="2xs" className="mt-px" />
            {error}
          </p>
        )}

        <Button
          className="h-12 w-full text-sm font-semibold"
          onClick={handleSubmit}
          disabled={loading || authLoading}
        >
          {loading ? (
            <>
              <span
                aria-hidden="true"
                className="me-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
              {t("bookingSidebar.bookingInProgress")}
            </>
          ) : authLoading ? (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : !isAuthenticated || !user ? (
            t("bookingSidebar.loginToBook")
          ) : (
            t("bookingSidebar.confirmBooking")
          )}
        </Button>
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          {t("bookingSidebar.smsConfirmation")}
        </p>
      </div>
    </div>
  );
}
