"use client";

import { useState, useEffect } from "react";
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Loader2,
  Info,
  CalendarDays,
  Clock,
  AlertCircle,
  Car,
  Plus,
  Wrench,
  Search,
  Gauge,
  Phone,
} from "lucide-react";

/** Convert "HH:MM" (24h) to "h:mm AM/PM" for display */
function fmtSlot(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
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
  icon: React.ReactNode;
}[] = [
  {
    value: "routine_maintenance",
    labelKey: "bookingSidebar.routineMaintenance",
    descKey: "bookingSidebar.routineMaintenanceDesc",
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    value: "inspection",
    labelKey: "bookingSidebar.inspection",
    descKey: "bookingSidebar.inspectionDesc",
    icon: <Search className="w-5 h-5" />,
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
  const { t, localePath } = useLanguage();

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
  const [success, setSuccess] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<
    string | null | undefined
  >(undefined); // undefined = loading

  // Check for existing active booking
  useEffect(() => {
    if (!user?.id) {
      setActiveBookingId(null);
      return;
    }
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
      return;
    }
    if (branches.length > 0 && !selectedBranchId) {
      setError(t("bookingSidebar.errorSelectBranch"));
      return;
    }
    if (bookingType === "routine_maintenance" && !mileage) {
      setError(t("bookingSidebar.errorMileage"));
      return;
    }
    if (bookingType === "inspection" && !problemDescription.trim()) {
      setError(t("bookingSidebar.errorProblem"));
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your phone number for booking confirmation SMS.");
      return;
    }
    setLoading(true);
    setError("");

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
      setError(bookingError ?? "Failed to create booking. Please try again.");
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

  if (success) {
    return (
      <Card className="sticky top-24">
        <CardContent className="text-center py-16">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="font-black text-xl mb-2">
            {t("bookingSidebar.bookingConfirmed")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("bookingSidebar.redirecting")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Active booking block — shown while loading or when blocked
  if (activeBookingId === undefined) {
    return (
      <Card className="sticky top-24">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (activeBookingId) {
    return (
      <Card className="sticky top-24">
        <CardContent className="text-center py-12 px-6 space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-black text-lg">Active Booking in Progress</h3>
          <p className="text-sm text-muted-foreground">
            You already have an active booking. Please wait for it to be
            completed before making a new appointment.
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={() =>
              router.push(localePath(`/bookings/${activeBookingId}`))
            }
          >
            View My Booking
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-black">
          {t("bookingSidebar.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{vendorName}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Branch selector (shown whenever the center has branches) ─────── */}
        {branches.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              {t("bookingSidebar.selectBranch")}
            </label>
            <div className="grid gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelectedBranchId(b.id);
                    setDate("");
                    setTime("");
                  }}
                  className={`flex items-start gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    selectedBranchId === b.id
                      ? "border-primary bg-primary/[0.06] text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div>
                    <span className="block text-sm font-bold leading-tight">
                      {b.name}
                    </span>
                    {(b.address || b.city) && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {[b.address, b.city].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                  {b.is_main && (
                    <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                      {t("bookingSidebar.mainBranch")}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Separator />
          </div>
        )}{" "}
        {/* Auth warning */}
        {!isAuthenticated && !authLoading && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            {t("bookingSidebar.mustBeLoggedIn")}
          </div>
        )}
        {/* ── Step 1: Booking type ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
            {t("bookingSidebar.bookingType")}
          </label>
          <div className="grid grid-cols-1 gap-2">
            {BOOKING_TYPES.map((bt) => (
              <button
                key={bt.value}
                type="button"
                onClick={() => setBookingType(bt.value)}
                className={`flex items-start gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  bookingType === bt.value
                    ? "border-primary bg-primary/[0.06] text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 ${bookingType === bt.value ? "text-primary" : "text-muted-foreground"}`}
                >
                  {bt.icon}
                </span>
                <span>
                  <span className="block text-sm font-bold leading-tight">
                    {t(bt.labelKey)}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {t(bt.descKey)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <Separator />
        {/* ── Step 2a: Routine Maintenance → mileage ───────────────────────── */}
        {bookingType === "routine_maintenance" && (
          <>
            {/* Mileage */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />{" "}
                {t("bookingSidebar.currentMileage")}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                value={mileage}
                min={0}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {vehicles.find((v) => v.id === vehicleId)?.mileage && (
                <p className="text-[10px] text-muted-foreground">
                  {t("bookingSidebar.autoFilledMileage")}
                </p>
              )}
            </div>
          </>
        )}
        {/* ── Step 2b: Inspection → problem description ────────────────────── */}
        {bookingType === "inspection" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
              {t("bookingSidebar.problemDescription")}
              <span className="text-destructive">*</span>
            </label>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder={t("bookingSidebar.problemPlaceholder")}
              rows={4}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground">
              {t("bookingSidebar.problemHint")}
            </p>
          </div>
        )}
        {/* ── Vehicle select (both types) ──────────────────────────────────── */}
        {vehicles.length === 0 ? (
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              {t("bookingSidebar.yourVehicle")}{" "}
              <span className="font-normal normal-case">
                {t("bookingSidebar.optional")}
              </span>
            </label>
            <a
              href={localePath("/garage")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/[0.03] transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Car className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">
                  {t("bookingSidebar.addVehicle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("bookingSidebar.linkYourCar")}
                </p>
              </div>
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </a>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              {t("bookingSidebar.yourVehicle")}
            </label>
            <Select
              value={vehicleId}
              onValueChange={(v) => v && setVehicleId(v)}
            >
              <SelectTrigger>
                <span className="flex flex-1 text-left text-sm truncate">
                  {(() => {
                    const v = vehicles.find((v) => v.id === vehicleId);
                    return v ? (
                      vehicleLabel(v)
                    ) : (
                      <span className="text-muted-foreground">
                        {t("bookingSidebar.noVehicleSelected")}
                      </span>
                    );
                  })()}
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
          </div>
        )}
        {/* ── Phone number ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            {t("bookingSidebar.phoneNumber") || "Phone Number"}
            <span className="text-destructive">*</span>
          </label>
          <input
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+20 1XX XXX XXXX"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground">
            {t("bookingSidebar.phoneHint") ||
              "Used for booking confirmation and updates via SMS."}
          </p>
        </div>
        <Separator />
        {/* ── Date picker ──────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> {t("bookingSidebar.date")}
          </label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {/* ── Time slots ───────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {t("bookingSidebar.time")}
          </label>
          {!date ? (
            <p className="text-xs text-muted-foreground">
              {t("bookingSidebar.pickDateFirst")}
            </p>
          ) : slotsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
              {t("bookingSidebar.loadingSlots")}
            </div>
          ) : slots.filter((s) => s.available).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("bookingSidebar.noSlotsAvailable")}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots
                .filter((s) => s.available)
                .map((slot) => {
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setTime(slot.time)}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all leading-tight ${
                        time === slot.time
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary hover:text-primary"
                      }`}
                    >
                      <span className="block">{fmtSlot(slot.time)}</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-1.5 text-destructive text-xs">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <Button
          size="lg"
          className="w-full font-bold shadow-lg shadow-primary/20"
          onClick={handleSubmit}
          disabled={loading || authLoading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("bookingSidebar.bookingInProgress")}
            </>
          ) : authLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : !isAuthenticated || !user ? (
            t("bookingSidebar.loginToBook")
          ) : (
            t("bookingSidebar.confirmBooking")
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {t("bookingSidebar.smsConfirmation")}
        </p>
      </CardContent>
    </Card>
  );
}
