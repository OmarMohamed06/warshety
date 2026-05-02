"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/types/database";
import { notifyBookingCancelled } from "@/services/notificationService";
import { notifyVendorCancelledBookingAction } from "@/app/actions/bookingActions";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarX,
  Eye,
  Car,
  Gauge,
  FileText,
  Phone,
  Mail,
  CalendarDays,
  MapPin,
  Wrench,
} from "lucide-react";

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUSES: { value: BookingStatus; label: string; variant: string }[] = [
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
  // NOTE: 'cancelled' is intentionally excluded — vendors cannot cancel bookings.
  // 'no_show' is handled separately with its own confirm flow.
];

// All statuses for display / filter (includes cancelled + no_show from DB)
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

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function VendorBookingsPage() {
  const { vendor, vendorType, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [timeGroup, setTimeGroup] = useState<
    "today" | "upcoming" | "past" | "all"
  >("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState("");
  const [noShowConfirmId, setNoShowConfirmId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [viewBooking, setViewBooking] = useState<any | null>(null);

  const loadBookings = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      const q = supabase
        .from("bookings")
        .select(
          "*, user:users!left(full_name,email,phone), vehicle:vehicles!left(*), branch:vendor_branches!left(name,name_ar,city)",
        )
        .eq("vendor_id", vendor.id)
        .order("booking_date", { ascending: false });

      const { data } =
        filter === "all" ? await q : await q.eq("status", filter);
      setBookings(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [vendor, filter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!authLoading && !vendor) setLoading(false);
  }, [authLoading, vendor]);

  useEffect(() => {
    if (!vendor) return;
    const channel = supabase
      .channel("vendor-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `vendor_id=eq.${vendor.id}`,
        },
        () => loadBookings(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor, loadBookings]);

  const updateStatus = async (bookingId: string, status: BookingStatus) => {
    setUpdating(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (error) {
      toast.error(`Failed to update status: ${error.message}`);
      setUpdating(false);
      return;
    }
    if (note) {
      await supabase.from("booking_status_history").insert({
        booking_id: bookingId,
        status,
        note,
        changed_at: new Date().toISOString(),
      });
      setNote("");
    }
    toast.success(t("vendor.statusUpdated") || "Status updated");
    setSelected((prev: any) => (prev ? { ...prev, status } : null));
    setUpdating(false);
    loadBookings();

    // Fire-and-forget: notify customer when car is ready for pickup
    if (status === "ready_for_pickup") {
      fetch("/api/bookings/notify-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      }).catch(() => {
        /* non-fatal */
      });
    }
  };

  const vendorCancelBooking = async (bookingId: string) => {
    setUpdating(true);
    const reason = cancelReason.trim() || undefined;
    await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", bookingId);
    await supabase.from("booking_status_history").insert({
      booking_id: bookingId,
      status: "cancelled",
      note: reason ?? "Cancelled by vendor",
      changed_at: new Date().toISOString(),
    });
    // In-app notification to customer
    if (selected?.user_id) {
      await notifyBookingCancelled(
        selected.user_id,
        bookingId,
        vendor?.business_name ?? "the service center",
      );
    }
    // Outbound SMS via server action (uses service role)
    await notifyVendorCancelledBookingAction(bookingId, reason);
    setUpdating(false);
    setCancelConfirmId(null);
    setCancelReason("");
    setSelected(null);
    loadBookings();
  };

  if (vendorType && vendorType !== "service_center") {
    return (
      <VendorLayout>
        <div className="text-center py-20 text-muted-foreground">
          <CalendarX className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">
            {t("vendor.bookingsTitle")} — {t("vendor.settingsSubtitle")}
          </p>
        </div>
      </VendorLayout>
    );
  }
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
    <VendorLayout>
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
            {t("vendor.allOrders")}
          </Button>
          {ALL_DISPLAY_STATUSES.map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant="outline"
              className={
                filter === s.value ? "border-primary text-primary" : ""
              }
              onClick={() => setFilter(s.value)}
            >
              {t(`vendor.statusLabels.${s.value}`) || s.label}
            </Button>
          ))}
        </div>

        {/* Table */}
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
                    <TableHead>{t("vendor.branch") || "Branch"}</TableHead>
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
                        <span className="text-sm">{b.branch?.name ?? "—"}</span>
                        {b.branch?.city && (
                          <span className="block text-xs text-muted-foreground">
                            {b.branch.city}
                          </span>
                        )}
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
      </div>

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
              {/* Status badge */}
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
                    {viewBooking.user?.full_name ?? "—"}
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
                {viewBooking.branch && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">
                      {viewBooking.branch.name}
                      {viewBooking.branch.city
                        ? ` · ${viewBooking.branch.city}`
                        : ""}
                    </span>
                  </div>
                )}
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
                          : (viewBooking.booking_type ?? "—")}
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
              ) : viewBooking.mileage != null ? (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    {t("admin.mileage")}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">
                      {viewBooking.mileage.toLocaleString()} km
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Inspection / Problem Description */}
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
            <DialogTitle>{t("vendor.status")}</DialogTitle>
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
                {selected.booking_date}
              </p>

              {/* Status buttons — vendors can move bookings forward, but not confirm (auto) */}
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
                    {t(`vendor.statusLabels.${s.value}`) || s.label}
                  </Button>
                ))}
              </div>

              {/* No Show — separate red button with confirm */}
              {![
                "completed",
                "cancelled",
                "no_show",
                "in_progress",
                "waiting_parts",
              ].includes(selected.status) && (
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

              {/* Cancel Booking — vendor can cancel confirmed/checked_in bookings */}
              {![
                "completed",
                "cancelled",
                "no_show",
                "in_progress",
                "waiting_parts",
                "ready_for_pickup",
              ].includes(selected.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updating}
                  className="w-full border-red-500 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold"
                  onClick={() => {
                    setCancelConfirmId(selected.id);
                    setSelected(null);
                  }}
                >
                  {t("vendor.cancelBookingBtn") === "Confirm Cancel"
                    ? t("bookings.cancelBooking")
                    : t("vendor.cancelBookingTitle").replace("?", "")}
                </Button>
              )}

              <div className="space-y-1">
                <Label>{t("admin.notes")}</Label>
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
                {t("garage.cancel")}
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
              {t("vendor.markNoShow")}
            </p>
            <p className="text-sm text-slate-500 mb-6">
              {t("vendor.noShowConfirm")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setNoShowConfirmId(null)}
              >
                {t("garage.cancel")}
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
                {t("vendor.markNoShow")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking confirmation overlay */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <p className="font-black text-base">
              {t("vendor.cancelBookingTitle")}
            </p>
            <p className="text-sm text-slate-500">
              {t("vendor.cancelBookingDesc")}
            </p>
            <div className="space-y-1">
              <Label>{t("vendor.cancelReason")}</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("vendor.cancelReasonPlaceholder")}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCancelConfirmId(null);
                  setCancelReason("");
                }}
              >
                {t("vendor.cancel")}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={updating}
                onClick={() => vendorCancelBooking(cancelConfirmId)}
              >
                {t("vendor.cancelBookingBtn")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
