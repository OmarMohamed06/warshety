"use client";

/**
 * Branch Management Page — /branch/[branchId]
 *
 * Tabs:
 *  - Bookings    — real-time list, status update (same logic as vendor/bookings)
 *  - Calendar    — full slot grid + block dialog + working hours (same logic as vendor/calendar)
 *  - Services    — table + add/edit/delete (same logic as vendor/services)
 *  - Customers   — unique customers derived from bookings
 */

import { useEffect, useState, useCallback, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";
import en from "@/../messages/en.json";
import ar from "@/../messages/ar.json";

const _msgs = { en, ar } as Record<string, Record<string, unknown>>;
function resolveMsg(locale: string, key: string): string {
  const parts = key.split(".");
  let val: unknown = _msgs[locale] ?? _msgs.en;
  for (const p of parts) val = (val as Record<string, unknown>)?.[p];
  return typeof val === "string" ? val : key;
}
import {
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
  getBranchWorkingHours,
  saveBranchWorkingHours,
} from "@/services/branchService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  Wrench,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  CalendarX,
  User,
  Car,
  DollarSign,
  Loader2,
  CheckCircle2,
  Ban,
  Users,
  Pencil,
  Trash2,
  Search,
  Clock,
  Settings2,
  PlusCircle,
  Eye,
  Phone,
  Mail,
  Gauge,
  FileText,
  MapPin,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingStatus =
  | "booked"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "waiting_parts"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "no_show";

interface CalendarBooking {
  id: string;
  booking_date: string;
  booking_time: string | null;
  booking_type: string | null;
  service_key: string | null;
  status: string;
  notes: string | null;
  total_price: number | null;
  user: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  vehicle: { make: string; model: string; year: number } | null;
}

interface DbService {
  id: string;
  vendor_id: string;
  branch_id: string | null;
  name: string;
  name_ar: string | null;
  description: string | null;
  duration_minutes: number | null;
  active: boolean;
  created_at: string;
}

interface BranchInfo {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  vendor_id: string;
}

interface Customer {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  booking_count: number;
  last_booking: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: { value: BookingStatus; label: string; variant: string }[] = [
  {
    value: "booked",
    label: "Booked",
    variant: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    variant: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  {
    value: "checked_in",
    label: "Checked In",
    variant: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  },
  {
    value: "in_progress",
    label: "In Progress",
    variant: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  {
    value: "waiting_parts",
    label: "Waiting Parts",
    variant: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
  {
    value: "ready_for_pickup",
    label: "Ready for Pickup",
    variant: "bg-teal-100 text-teal-700 hover:bg-teal-100",
  },
  {
    value: "completed",
    label: "Completed",
    variant: "bg-green-100 text-green-700 hover:bg-green-100",
  },
];

const ALL_DISPLAY_STATUSES: {
  value: BookingStatus;
  label: string;
  variant: string;
}[] = [
  ...STATUSES,
  {
    value: "cancelled",
    label: "Cancelled",
    variant: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  {
    value: "no_show",
    label: "No Show",
    variant: "bg-red-100 text-red-700 hover:bg-red-100",
  },
];

const STATUS_VARIANT: Record<BookingStatus, string> = Object.fromEntries(
  ALL_DISPLAY_STATUSES.map((s) => [s.value, s.variant]),
) as Record<BookingStatus, string>;

const STATUS_CLS_CAL: Record<string, string> = {
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

const emptyService = {
  serviceKey: "",
  description: "",
  duration_minutes: "60",
  active: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function localDateStr(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

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
  const cap = slot.capacity ?? 1;
  const used = (slot.bookedCount ?? 0) + (slot.blockedSpots ?? 0);
  if (cap > 1 && used > 0)
    return "bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100";
  return "bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100";
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "bookings" | "calendar" | "services" | "customers";

export default function BranchManagementPage({
  params,
}: {
  params: Promise<{ branchId: string; lang: string }>;
}) {
  const { branchId } = use(params);
  const {
    user,
    role,
    managedBranchId,
    isLoading: authLoading,
    signOut,
  } = useAuth();
  const router = useRouter();
  const { localePath, t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [branchLoading, setBranchLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace(localePath("/auth/login"));
  }, [authLoading, user, router, localePath]);

  // Load branch info
  useEffect(() => {
    if (!branchId) return;
    (supabase as any)
      .from("vendor_branches")
      .select("id, name, address, city, phone, vendor_id")
      .eq("id", branchId)
      .maybeSingle()
      .then(({ data }: { data: BranchInfo | null }) => {
        setBranch(data);
        setBranchLoading(false);
      });
  }, [branchId, supabase]);

  const handleSignOut = async () => {
    await signOut();
    router.replace(localePath("/auth/login"));
  };

  if (
    authLoading ||
    branchLoading ||
    (role === "manager" && managedBranchId === null)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAuthorized =
    role === "vendor" ||
    role === "admin" ||
    (role === "manager" && managedBranchId === branchId);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <p>You are not authorized to view this branch.</p>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <p>Branch not found.</p>
      </div>
    );
  }

  const TABS: { value: Tab; label: string }[] = [
    { value: "bookings", label: t("vendor.bookingsTitle") },
    { value: "calendar", label: t("vendor.calendarTitle") },
    { value: "services", label: t("vendor.servicesTitle") },
    { value: "customers", label: t("vendor.customersTitle") },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-black text-sm leading-tight">{branch.name}</p>
              {branch.city && (
                <p className="text-xs text-muted-foreground">
                  {branch.address ? `${branch.address}, ` : ""}
                  {branch.city}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("nav.signOut")}
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "bookings" && (
          <BookingsTab branchId={branchId} supabase={supabase} />
        )}
        {activeTab === "calendar" && (
          <CalendarTab
            branchId={branchId}
            vendorId={branch.vendor_id}
            supabase={supabase}
          />
        )}
        {activeTab === "services" && (
          <ServicesTab
            branchId={branchId}
            vendorId={branch.vendor_id}
            supabase={supabase}
          />
        )}
        {activeTab === "customers" && (
          <CustomersTab branchId={branchId} supabase={supabase} />
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Bookings Tab  (mirrors vendor/bookings/page.tsx)
// ══════════════════════════════════════════════════════════════════════════════

function BookingsTab({
  branchId,
  supabase,
}: {
  branchId: string;
  supabase: any;
}) {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [timeGroup, setTimeGroup] = useState<
    "today" | "upcoming" | "past" | "all"
  >("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [viewBooking, setViewBooking] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState("");
  const [noShowConfirmId, setNoShowConfirmId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const q = supabase
      .from("bookings")
      .select(
        "*, user:users!left(full_name,email,phone), vehicle:vehicles!left(*)",
      )
      .eq("branch_id", branchId)
      .order("booking_date", { ascending: false });
    const { data } = filter === "all" ? await q : await q.eq("status", filter);
    setBookings(data ?? []);
    setLoading(false);
  }, [branchId, filter, supabase]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Real-time subscription (same as vendor/bookings)
  useEffect(() => {
    const channel = supabase
      .channel("branch-bookings-" + branchId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `branch_id=eq.${branchId}`,
        },
        () => loadBookings(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, supabase, loadBookings]);

  const updateStatus = async (bookingId: string, status: BookingStatus) => {
    setUpdating(true);
    await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (note) {
      await supabase.from("booking_status_history").insert({
        booking_id: bookingId,
        status,
        note,
        changed_at: new Date().toISOString(),
      });
      setNote("");
    }
    setSelected((prev: any) => (prev ? { ...prev, status } : null));
    setUpdating(false);
    loadBookings();
  };

  const _d = new Date();
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

  const groupedBookings = bookings.filter((b) => {
    if (timeGroup === "today") return b.booking_date === todayStr;
    if (timeGroup === "upcoming") return b.booking_date > todayStr;
    if (timeGroup === "past") return b.booking_date < todayStr;
    return true;
  });

  const timeGroupCounts = {
    all: bookings.length,
    today: bookings.filter((b) => b.booking_date === todayStr).length,
    upcoming: bookings.filter((b) => b.booking_date > todayStr).length,
    past: bookings.filter((b) => b.booking_date < todayStr).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">{t("vendor.bookingsTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("vendor.bookingsSubtitle")}
        </p>
      </div>

      {/* Time-group tabs */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: "all", label: t("bookings.timeAll") },
            { key: "today", label: t("bookings.timeToday") },
            { key: "upcoming", label: t("bookings.timeUpcoming") },
            { key: "past", label: t("bookings.timePast") },
          ] as const
        ).map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={timeGroup === key ? "default" : "outline"}
            onClick={() => setTimeGroup(key)}
            className="gap-1.5"
          >
            {label}
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                timeGroup === key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {timeGroupCounts[key]}
            </span>
          </Button>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          {t("vendor.allFilter")}
        </Button>
        {ALL_DISPLAY_STATUSES.map((s) => (
          <Button
            key={s.value}
            size="sm"
            variant="outline"
            className={filter === s.value ? "border-primary text-primary" : ""}
            onClick={() => setFilter(s.value)}
          >
            {t(`vendor.statusLabels.${s.value}`)}
          </Button>
        ))}
      </div>

      <Card>
        {loading ? (
          <CardContent className="py-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        ) : bookings.length === 0 ? (
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarX className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">{t("vendor.noBookings")}</p>
          </CardContent>
        ) : groupedBookings.length === 0 ? (
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarX className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">
              {timeGroup === "today"
                ? t("bookings.noBookingsToday")
                : timeGroup === "upcoming"
                  ? t("bookings.noBookingsUpcoming")
                  : t("bookings.noBookingsPast")}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("vendor.customer")}</TableHead>
                  <TableHead>{t("vendor.service")}</TableHead>
                  <TableHead>{t("vendor.vehicle")}</TableHead>
                  <TableHead>{t("vendor.date")}</TableHead>
                  <TableHead>{t("vendor.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedBookings.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-semibold">
                        {b.user?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.user?.phone ?? b.user?.email ?? ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      {b.service_key
                        ? t(`home.services.${b.service_key}`) !==
                          `home.services.${b.service_key}`
                          ? t(`home.services.${b.service_key}`)
                          : b.service_key.replace(/-/g, " ")
                        : b.booking_type === "routine_maintenance"
                          ? t("vendor.routineMaintenance")
                          : b.booking_type === "inspection"
                            ? t("vendor.inspection")
                            : (b.booking_type ?? "—")}
                    </TableCell>
                    <TableCell>
                      {b.vehicle
                        ? `${b.vehicle.make} ${b.vehicle.model} ${b.vehicle.year}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {b.booking_date}
                      {b.booking_time && (
                        <span className="block text-xs text-muted-foreground">
                          {b.booking_time}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_VARIANT[b.status as BookingStatus]}
                      >
                        {t(`vendor.statusLabels.${b.status}`) ||
                          b.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs"
                          onClick={() => setViewBooking(b)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("vendor.viewDetails")}
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-primary p-0 h-auto"
                          onClick={() => setSelected(b)}
                        >
                          {t("vendor.edit")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* View Details Dialog */}
      <Dialog
        open={!!viewBooking}
        onOpenChange={(o) => !o && setViewBooking(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {t("vendor.bookingDetailTitle")}
            </DialogTitle>
          </DialogHeader>
          {viewBooking && (
            <div className="space-y-4 text-sm">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize border ${STATUS_VARIANT[viewBooking.status as BookingStatus]}`}
              >
                {t(`vendor.statusLabels.${viewBooking.status}`) ||
                  viewBooking.status.replace(/_/g, " ")}
              </div>

              {/* Customer */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {t("vendor.customer")}
                </p>
                <div className="space-y-1.5">
                  <p className="font-semibold">
                    {viewBooking.user?.full_name ?? "\u2014"}
                  </p>
                  {viewBooking.user?.phone ? (
                    <a
                      href={`tel:${viewBooking.user.phone}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {viewBooking.user.phone}
                    </a>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {t("vendor.noPhoneOnFile")}
                    </p>
                  )}
                  {viewBooking.user?.email && (
                    <a
                      href={`mailto:${viewBooking.user.email}`}
                      className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-primary hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {viewBooking.user.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Appointment */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {t("vendor.appointment")}
                </p>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {viewBooking.booking_date}
                    {viewBooking.booking_time
                      ? ` at ${viewBooking.booking_time.slice(0, 5)}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Wrench className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {viewBooking.service_key
                      ? t(`home.services.${viewBooking.service_key}`) !==
                        `home.services.${viewBooking.service_key}`
                        ? t(`home.services.${viewBooking.service_key}`)
                        : viewBooking.service_key.replace(/-/g, " ")
                      : viewBooking.booking_type === "routine_maintenance"
                        ? t("vendor.routineMaintenance")
                        : viewBooking.booking_type === "inspection"
                          ? t("vendor.inspection")
                          : (viewBooking.booking_type ?? "\u2014")}
                  </span>
                </div>
              </div>

              {/* Vehicle */}
              {viewBooking.vehicle ? (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    {t("admin.vehicle")}
                  </p>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Car className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>
                      {viewBooking.vehicle.year} {viewBooking.vehicle.make}{" "}
                      {viewBooking.vehicle.model}
                    </span>
                  </div>
                  {viewBooking.vehicle.color && (
                    <p className="text-xs text-muted-foreground pl-5">
                      {t("vendor.colorLabel")}: {viewBooking.vehicle.color}
                    </p>
                  )}
                  {viewBooking.vehicle.license_plate && (
                    <p className="text-xs text-muted-foreground pl-5">
                      {t("vendor.plateLabel")}:{" "}
                      {viewBooking.vehicle.license_plate}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs">
                    <Gauge className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {(viewBooking.mileage ?? viewBooking.vehicle?.mileage) !=
                    null ? (
                      <span className="font-medium">
                        {(
                          viewBooking.mileage ?? viewBooking.vehicle.mileage
                        ).toLocaleString()}{" "}
                        km
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        {t("vendor.mileageNotProvided")}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Notes */}
              {viewBooking.notes && (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {t("vendor.problemNotes")}
                  </p>
                  <p className="text-sm leading-relaxed">{viewBooking.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setViewBooking(null)}
                >
                  {t("vendor.close")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setSelected(viewBooking);
                    setViewBooking(null);
                  }}
                >
                  {t("vendor.edit")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.updateStatus")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {selected.user?.full_name} —{" "}
                {selected.service_key
                  ? t(`home.services.${selected.service_key}`) !==
                    `home.services.${selected.service_key}`
                    ? t(`home.services.${selected.service_key}`)
                    : selected.service_key.replace(/-/g, " ")
                  : selected.booking_type === "routine_maintenance"
                    ? t("vendor.routineMaintenance")
                    : selected.booking_type === "inspection"
                      ? t("vendor.inspection")
                      : (selected.booking_type ?? "")}{" "}
                · {selected.booking_date}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    disabled={updating}
                    variant="outline"
                    size="sm"
                    className={
                      selected.status === s.value
                        ? "border-primary text-primary bg-primary/5"
                        : ""
                    }
                    onClick={() => updateStatus(selected.id, s.value)}
                  >
                    {t(`vendor.statusLabels.${s.value}`)}
                  </Button>
                ))}
              </div>
              {!["completed", "cancelled", "no_show"].includes(
                selected.status,
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updating}
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => {
                    setNoShowConfirmId(selected.id);
                    setSelected(null);
                  }}
                >
                  {t("vendor.markNoShow")}
                </Button>
              )}
              <div className="space-y-1">
                <Label>{t("vendor.noteOptional")}</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("vendor.notePlaceholder")}
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelected(null)}
              >
                {t("vendor.cancel")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* No-Show confirmation overlay */}
      {noShowConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <p className="font-black text-base mb-2">
              {t("vendor.noShowTitle")}
            </p>
            <p className="text-sm text-slate-500 mb-6">
              {t("vendor.noShowDesc")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setNoShowConfirmId(null)}
              >
                {t("vendor.cancel")}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={updating}
                onClick={async () => {
                  setUpdating(true);
                  await supabase
                    .from("bookings")
                    .update({ status: "no_show", cancelled_by: "vendor" })
                    .eq("id", noShowConfirmId);
                  setUpdating(false);
                  setNoShowConfirmId(null);
                  loadBookings();
                }}
              >
                {t("vendor.confirmNoShow")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Calendar Tab  (mirrors vendor/calendar/page.tsx — branch variant)
// ══════════════════════════════════════════════════════════════════════════════

function CalendarTab({
  branchId,
  vendorId,
  supabase,
}: {
  branchId: string;
  vendorId: string;
  supabase: any;
}) {
  const { t, locale } = useLanguage();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [detailBooking, setDetailBooking] = useState<CalendarBooking | null>(
    null,
  );

  const [showWH, setShowWH] = useState(false);
  const [editHours, setEditHours] = useState<WorkingHours[]>(
    DEFAULT_WORKING_HOURS,
  );
  const [slotSettings, setSlotSettings] = useState<VendorSlotSettings>(
    DEFAULT_SLOT_SETTINGS,
  );
  const [savingHours, setSavingHours] = useState(false);

  const [blockDialog, setBlockDialog] = useState<{
    slot: TimeSlot;
    newBlocked: number;
  } | null>(null);

  // Load working hours for this branch
  useEffect(() => {
    getBranchWorkingHours(branchId).then(setEditHours);
    getVendorSlotSettings(vendorId).then(setSlotSettings);
  }, [branchId, vendorId]);

  // Load bookings for visible month
  const loadBookings = useCallback(async () => {
    setLoadingCal(true);
    const from = localDateStr(new Date(year, month, 1));
    const to = localDateStr(new Date(year, month + 1, 0));
    const { data } = await supabase
      .from("bookings")
      .select(
        "id,booking_date,booking_time,booking_type,service_key,status,notes,total_price," +
          "user:users!left(full_name,phone,email)," +
          "vehicle:vehicles!left(make,model,year)",
      )
      .eq("branch_id", branchId)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("booking_time");
    setBookings((data ?? []) as unknown as CalendarBooking[]);
    setLoadingCal(false);
  }, [branchId, year, month, supabase]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Load time slots for selected date
  const loadSlots = useCallback(
    async (date: string) => {
      setLoadingSlots(true);
      const slots = await getAvailableSlotsForBranch(branchId, date);
      setDaySlots(slots);
      setLoadingSlots(false);
    },
    [branchId],
  );

  useEffect(() => {
    if (selectedDate) {
      setSlotError(null);
      loadSlots(selectedDate);
    } else setDaySlots([]);
  }, [selectedDate, loadSlots]);

  // Toggle slot → open block dialog
  const handleToggleSlot = useCallback((slot: TimeSlot) => {
    if (slot.reason === "booked" || slot.reason === "past") return;
    const currentBlocked = slot.blockedSpots ?? 0;
    const cap = slot.capacity ?? 1;
    const booked = slot.bookedCount ?? 0;
    const maxBlockable = cap - booked;
    let startAt: number;
    if (cap === 1) {
      startAt = currentBlocked > 0 ? 0 : 1;
    } else {
      startAt = currentBlocked > 0 ? currentBlocked : Math.min(1, maxBlockable);
    }
    setBlockDialog({ slot, newBlocked: startAt });
  }, []);

  // Confirm block from dialog
  const handleConfirmBlock = useCallback(async () => {
    if (!blockDialog || !selectedDate) return;
    const { slot, newBlocked } = blockDialog;
    setBlockDialog(null);
    setTogglingSlot(slot.time);
    setSlotError(null);

    const result =
      newBlocked === 0
        ? await removeBranchSlotOverride(branchId, selectedDate, slot.time)
        : await blockBranchSlots(
            branchId,
            selectedDate,
            [slot.time],
            "Blocked by manager",
            newBlocked,
          );

    if (result.error) setSlotError(result.error);
    await loadSlots(selectedDate);
    setTogglingSlot(null);
  }, [blockDialog, selectedDate, branchId, loadSlots]);

  // Save working hours + slot settings
  const handleSaveHours = useCallback(async () => {
    setSavingHours(true);
    await Promise.all([
      saveBranchWorkingHours(branchId, editHours),
      saveVendorSlotSettings(vendorId, slotSettings),
    ]);
    setSavingHours(false);
    setShowWH(false);
    if (selectedDate) await loadSlots(selectedDate);
  }, [branchId, vendorId, editHours, slotSettings, selectedDate, loadSlots]);

  const bookedCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings)
      map[b.booking_date] = (map[b.booking_date] ?? 0) + 1;
    return map;
  }, [bookings]);

  const grid = buildMonthGrid(year, month);
  const todayStr = localDateStr(now);
  const byDate = (d: Date) =>
    bookings.filter((b) => b.booking_date === localDateStr(d));
  const dateBookings = selectedDate
    ? bookings.filter((b) => b.booking_date === selectedDate)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {t("vendor.calendarTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {MONTH_NAMES[month]} {year} — {t("vendor.calendarSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowWH(true)}
          >
            <Settings2 className="h-4 w-4" /> {t("vendor.workingHours")}
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
        {/* Calendar grid */}
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
                              STATUS_CLS_CAL[b.status] ??
                                "bg-muted text-foreground border-border",
                            )}
                          >
                            {b.booking_time
                              ? b.booking_time.slice(0, 5) + " "
                              : ""}
                            {b.user?.full_name?.split(" ")[0] ??
                              (b.service_key
                                ? t(`home.services.${b.service_key}`) !==
                                  `home.services.${b.service_key}`
                                  ? t(`home.services.${b.service_key}`)
                                  : b.service_key.replace(/-/g, " ")
                                : (b.booking_type?.replace(/_/g, " ") ?? "—"))}
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

        {/* Day detail panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    locale === "ar" ? "ar-EG" : "en",
                    { weekday: "long", month: "long", day: "numeric" },
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
                {/* Slot grid */}
                <section>
                  <p className="text-xs font-semibold mb-2">
                    {t("vendor.timeSlots")}
                  </p>

                  {slotError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 mb-2">
                      <strong>Could not save.</strong> {slotError}
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
                            slot.reason !== "booked" && slot.reason !== "past";
                          const cap = slot.capacity ?? 1;
                          const used =
                            (slot.bookedCount ?? 0) + (slot.blockedSpots ?? 0);
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
                        {t("vendor.available")}
                        &middot;{" "}
                        {
                          daySlots.filter((s) => s.reason === "booked").length
                        }{" "}
                        {t("vendor.booked")} &middot;{" "}
                        {daySlots.filter((s) => s.reason === "blocked").length}{" "}
                        {t("vendor.blocked")}
                        {(slotSettings.cars_per_slot ?? 1) > 1 && (
                          <span className="ml-2 text-primary font-medium">
                            · {slotSettings.cars_per_slot} cars/slot
                          </span>
                        )}
                      </p>
                    </>
                  )}
                </section>

                {/* Bookings list */}
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
                              STATUS_CLS_CAL[b.status] ?? "",
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
                                {b.service_key
                                  ? t(`home.services.${b.service_key}`) !==
                                    `home.services.${b.service_key}`
                                    ? t(`home.services.${b.service_key}`)
                                    : b.service_key.replace(/-/g, " ")
                                  : (b.booking_type?.replace(/_/g, " ") ??
                                    t("vendor.service"))}
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

      {/* Booking detail dialog */}
      <Dialog
        open={!!detailBooking}
        onOpenChange={(o) => !o && setDetailBooking(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.bookingDetails")}</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-4">
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm font-semibold capitalize",
                  STATUS_CLS_CAL[detailBooking.status] ?? "",
                )}
              >
                {detailBooking.status.replace(/_/g, " ")}
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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDetailBooking(null)}
              >
                {t("vendor.close")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Slot dialog */}
      <Dialog
        open={!!blockDialog}
        onOpenChange={(o) => !o && setBlockDialog(null)}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              {t("vendor.blockSlot")} — {blockDialog?.slot.time}
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
                        {booked} booked
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
                        {blockDialog.newBlocked} blocked
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-green-200 inline-block" />
                        {free} available
                      </span>
                    </div>
                  </div>

                  {/* Counter — only for multi-cap */}
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
                      {t("vendor.cancel")}
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
                        ? t("vendor.unblockSlot")
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

      {/* Working Hours dialog */}
      <Dialog
        open={showWH}
        onOpenChange={(o) => {
          if (!o) setShowWH(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> {t("vendor.workingHours")}
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

          {/* Slot Settings */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-bold">{t("vendor.slotSettings")}</p>
            <div className="grid grid-cols-2 gap-3">
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
              {t("vendor.cancel")}
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
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Services Tab  (mirrors vendor/services/page.tsx)
// ══════════════════════════════════════════════════════════════════════════════

function ServicesTab({
  branchId,
  vendorId,
  supabase,
}: {
  branchId: string;
  vendorId: string;
  supabase: any;
}) {
  const { t, locale } = useLanguage();

  const [services, setServices] = useState<DbService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyService);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });
    setServices((data ?? []) as unknown as DbService[]);
    setLoading(false);
  }, [branchId, vendorId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof emptyService, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  function openNew() {
    setForm(emptyService);
    setEditId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(s: DbService) {
    const allSlugs = SERVICE_CATEGORIES.flatMap((c) => c.services);
    const matched =
      allSlugs.find(
        (slug) =>
          t(`home.services.${slug}`) === s.name ||
          t(`home.services.${slug}`) === s.name_ar,
      ) ?? "";
    setForm({
      serviceKey: matched,
      description: s.description ?? "",
      duration_minutes: String(s.duration_minutes ?? 60),
      active: s.active,
    });
    setEditId(s.id);
    setShowForm(true);
    setError(null);
  }

  async function save() {
    if (!form.serviceKey) {
      setError("Please select a service.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: resolveMsg("en", `home.services.${form.serviceKey}`),
      name_ar: resolveMsg("ar", `home.services.${form.serviceKey}`),
      description: form.description || null,
      duration_minutes: form.duration_minutes
        ? parseInt(form.duration_minutes)
        : null,
      active: form.active,
      vendor_id: vendorId,
      branch_id: branchId,
    };
    let err: { message: string } | null = null;
    if (editId) {
      const { error: e } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editId);
      err = e;
    } else {
      const { error: e } = await supabase.from("services").insert(payload);
      err = e;
    }
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    setShowForm(false);
    load();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this service?")) return;
    await supabase.from("services").delete().eq("id", id);
    load();
  }

  const filtered = services.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.name_ar ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {t("vendor.servicesTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} {t("vendor.servicesAt")}
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <PlusCircle className="h-4 w-4" /> {t("vendor.addService")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: t("vendor.totalStat"), value: filtered.length },
          {
            label: t("vendor.activeStat"),
            value: filtered.filter((s) => s.active).length,
          },
          {
            label: t("vendor.inactiveStat"),
            value: filtered.filter((s) => !s.active).length,
          },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-black mt-0.5">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("vendor.searchServices")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">{t("vendor.noServices")}</p>
              <Button className="mt-4" onClick={openNew}>
                {t("vendor.addFirstService")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("vendor.service")}</TableHead>
                  <TableHead>{t("vendor.duration")}</TableHead>
                  <TableHead>{t("vendor.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-semibold text-sm">
                        {locale === "ar" && s.name_ar ? s.name_ar : s.name}
                      </p>
                      {s.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {s.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.duration_minutes ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {s.duration_minutes >= 60
                            ? `${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60 ? `${s.duration_minutes % 60}m` : ""}`
                            : `${s.duration_minutes}m`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.active ? "outline" : "secondary"}
                        className={
                          s.active
                            ? "border-green-200 text-green-700 bg-green-50"
                            : ""
                        }
                      >
                        {s.active ? t("vendor.active") : t("vendor.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => remove(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? t("vendor.editService") : t("vendor.addService")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("vendor.serviceName")} *</Label>
              <select
                value={form.serviceKey}
                onChange={(e) => set("serviceKey", e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">— Select service —</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <optgroup
                    key={cat.key}
                    label={t(`home.serviceCategories.${cat.key}`)}
                  >
                    {cat.services.map((slug) => (
                      <option key={slug} value={slug}>
                        {t(`home.services.${slug}`)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("vendor.durationMinutes")}</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("vendor.description")}</Label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="What's included…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => set("active", v)}
                id="svc-active"
              />
              <Label htmlFor="svc-active">{t("vendor.activeForBooking")}</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                {t("vendor.cancel")}
              </Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving
                  ? t("vendor.saving")
                  : editId
                    ? t("vendor.saveChanges")
                    : t("vendor.addService")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Customers Tab
// ══════════════════════════════════════════════════════════════════════════════

function CustomersTab({
  branchId,
  supabase,
}: {
  branchId: string;
  supabase: any;
}) {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [loadingBks, setLoadingBks] = useState(false);

  useEffect(() => {
    supabase
      .from("bookings")
      .select("user_id, booking_date, user:users!left(full_name, email, phone)")
      .eq("branch_id", branchId)
      .not("user_id", "is", null)
      .order("booking_date", { ascending: false })
      .then(
        ({
          data,
        }: {
          data: Array<{
            user_id: string;
            booking_date: string;
            user: {
              full_name: string | null;
              email: string | null;
              phone: string | null;
            } | null;
          }> | null;
          error: unknown;
        }) => {
          if (!data) {
            setLoading(false);
            return;
          }
          const map = new Map<string, Customer>();
          for (const row of data) {
            if (!row.user_id) continue;
            if (map.has(row.user_id)) {
              map.get(row.user_id)!.booking_count++;
            } else {
              map.set(row.user_id, {
                user_id: row.user_id,
                full_name: row.user?.full_name ?? null,
                email: row.user?.email ?? null,
                phone: row.user?.phone ?? null,
                booking_count: 1,
                last_booking: row.booking_date,
              });
            }
          }
          setCustomers(Array.from(map.values()));
          setLoading(false);
        },
      );
  }, [branchId, supabase]);

  const openCustomer = async (c: Customer) => {
    setSelected(c);
    setLoadingBks(true);
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, booking_date, booking_time, status, service_key, booking_type, vehicle:vehicles!left(make,model,year)",
      )
      .eq("branch_id", branchId)
      .eq("user_id", c.user_id)
      .order("booking_date", { ascending: false });
    setCustomerBookings(data ?? []);
    setLoadingBks(false);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">{t("vendor.customersTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {customers.length} {t("vendor.uniqueCustomersAt")}
        </p>
      </div>

      <Input
        placeholder={t("vendor.searchByPhone")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        {loading ? (
          <CardContent className="py-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">
              {search ? t("vendor.noCustomersSearch") : t("vendor.noCustomers")}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("vendor.name")}</TableHead>
                  <TableHead>{t("vendor.contact")}</TableHead>
                  <TableHead>{t("admin.bookingsCount")}</TableHead>
                  <TableHead>{t("vendor.lastVisit")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-sm">
                          {c.full_name ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{c.phone ?? "—"}</p>
                      {c.email && (
                        <p className="text-xs text-muted-foreground">
                          {c.email}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary">
                        {c.booking_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.last_booking}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-primary p-0 h-auto"
                        onClick={() => openCustomer(c)}
                      >
                        {t("vendor.manage")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Customer detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-4 h-4" /> {selected?.full_name ?? "Customer"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm flex-wrap">
                {selected.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {t("vendor.phone")}
                    </p>
                    <p className="font-semibold">{selected.phone}</p>
                  </div>
                )}
                {selected.email && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {t("vendor.email")}
                    </p>
                    <p className="font-semibold">{selected.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {t("admin.totalBookings")}
                  </p>
                  <p className="font-semibold">{selected.booking_count}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="font-semibold text-sm mb-2">
                  {t("vendor.bookingHistory")}
                </p>
                {loadingBks ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {customerBookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {(b.service_key ??
                            b.booking_type === "routine_maintenance")
                              ? t("vendor.routineMaintenance")
                              : b.booking_type === "inspection"
                                ? t("vendor.inspection")
                                : (b.booking_type ?? "—")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.booking_date}
                            {b.booking_time ? ` · ${b.booking_time}` : ""}
                            {b.vehicle
                              ? ` · ${b.vehicle.make} ${b.vehicle.model}`
                              : ""}
                          </p>
                        </div>
                        <Badge
                          className={`shrink-0 text-xs ${STATUS_VARIANT[b.status as BookingStatus] ?? ""}`}
                        >
                          {t(`vendor.statusLabels.${b.status}`) ||
                            b.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
