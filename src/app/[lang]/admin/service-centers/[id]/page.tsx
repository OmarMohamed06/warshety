"use client";

import { use, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  approveVendorApplication,
  rejectVendorApplication,
} from "@/app/actions/adminActions";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Status = "pending" | "approved" | "suspended" | "rejected";

const STATUS_BADGE: Record<Status, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  suspended:
    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function ServiceCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLanguage();
  const supabase = createClient();

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [services, setServices] = useState<Record<string, unknown>[]>([]);
  const [reviews, setReviews] = useState<Record<string, unknown>[]>([]);
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplication, setIsApplication] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  // points_per_booking inline edit at vendor level
  const [vendorPtsDraft, setVendorPtsDraft] = useState<string>("0");
  const [savingVendorPts, setSavingVendorPts] = useState(false);
  const pointsToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function saveVendorPoints() {
    const pts = Number(vendorPtsDraft);
    if (isNaN(pts) || pts < 0) return;
    setSavingVendorPts(true);
    const { error } = await (supabase as any)
      .from("vendors")
      .update({ points_per_booking: pts })
      .eq("id", id);
    setSavingVendorPts(false);
    if (!error) {
      setData((prev) => (prev ? { ...prev, points_per_booking: pts } : prev));
      if (pointsToastTimer.current) clearTimeout(pointsToastTimer.current);
      setMsg(`Points per booking updated to ${pts} pts ✓`);
      pointsToastTimer.current = setTimeout(() => setMsg(null), 3000);
    } else {
      setMsg(`Error: ${error.message}`);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Try vendors first, then applications
      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (vendor) {
        setData(vendor);
        setVendorPtsDraft(
          String((vendor as Record<string, unknown>).points_per_booking ?? 0),
        );
        setIsApplication(false);
        const [svcRes, revRes, bkRes] = await Promise.all([
          supabase
            .from("services")
            .select("*")
            .eq("vendor_id", id)
            .order("created_at", { ascending: false }),
          supabase
            .from("reviews")
            .select("*, users(full_name)")
            .eq("vendor_id", id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("bookings")
            .select("id, booking_date, status, users(full_name), total_price")
            .eq("vendor_id", id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
        setServices((svcRes.data ?? []) as Record<string, unknown>[]);
        setReviews((revRes.data ?? []) as Record<string, unknown>[]);
        setBookings((bkRes.data ?? []) as Record<string, unknown>[]);
      } else {
        const { data: app } = await supabase
          .from("vendor_applications")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (app) {
          setData(app);
          setIsApplication(true);
        }
      }
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function handleApprove() {
    setActionLoading(true);
    const { error } = await approveVendorApplication(id);
    setMsg(error ? `Error: ${error}` : "Application approved & invite sent ✓");
    setActionLoading(false);
    if (!error && data) setData({ ...data, status: "approved" });
  }

  async function handleReject() {
    setActionLoading(true);
    const { error } = await rejectVendorApplication(id);
    setMsg(error ? `Error: ${error}` : "Application rejected.");
    setActionLoading(false);
    if (!error && data) setData({ ...data, status: "rejected" });
  }

  async function handleStatusChange(status: Status) {
    const { error } = await supabase
      .from("vendors")
      .update({ status })
      .eq("id", id);
    setMsg(error ? `Error: ${error.message}` : `Status changed to ${status}.`);
    if (!error && data) setData({ ...data, status });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span
          className="material-symbols-outlined animate-spin text-[#FF4B19]"
          style={{ fontSize: 36 }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-slate-500 mb-2">{t("admin.recordNotFound")}</p>
        <Link
          href="/admin/service-centers"
          className="text-[#FF4B19] font-bold"
        >
          ← Back
        </Link>
      </div>
    );
  }

  const status = String(data.status ?? "pending") as Status;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/service-centers"
          className="text-slate-400 hover:text-[#FF4B19] transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            arrow_back
          </span>
        </Link>
        <h1 className="text-2xl font-black">
          {String(data.business_name ?? data.business_name)}
        </h1>
        {isApplication && (
          <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
            {t("admin.applicationBadge")}
          </span>
        )}
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Main info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex px-3 py-1 text-sm font-bold rounded-full capitalize",
                  STATUS_BADGE[status],
                )}
              >
                {status}
              </span>
              <span className="text-sm text-slate-500 capitalize">
                {String(data.vendor_type ?? "").replace(/_/g, " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {isApplication ? (
                <>
                  <div>
                    <p className="text-slate-400 text-xs">{t("admin.owner")}</p>
                    <p className="font-bold">
                      {String(data.owner_name ?? "—")}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">{t("admin.email")}</p>
                    <p className="font-bold">{String(data.email ?? "—")}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">{t("admin.phone")}</p>
                    <p className="font-bold">{String(data.phone ?? "—")}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Governorate</p>
                    <p className="font-bold">
                      {String(data.governorate ?? "—")}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Area / District</p>
                    <p className="font-bold">{String(data.city ?? "—")}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">
                      {t("admin.commercialReg")}
                    </p>
                    <p className="font-bold">
                      {String(data.commercial_reg_no ?? "—")}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">
                      {t("admin.submitted")}
                    </p>
                    <p className="font-bold">
                      {new Date(String(data.created_at)).toLocaleDateString(
                        "en-EG",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  </div>
                  {data.national_id_url && (
                    <div>
                      <p className="text-slate-400 text-xs">National ID</p>
                      <a
                        href={String(data.national_id_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#FF4B19] underline underline-offset-2 text-sm"
                      >
                        View Document ↗
                      </a>
                    </div>
                  )}
                  {data.address && (
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-slate-400 text-xs">Address</p>
                      <p className="font-bold">{String(data.address)}</p>
                    </div>
                  )}
                  {data.maps_link && (
                    <div>
                      <p className="text-slate-400 text-xs">Maps</p>
                      <a
                        href={String(data.maps_link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#FF4B19] underline underline-offset-2 text-sm"
                      >
                        Open in Maps ↗
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-slate-400 text-xs">{t("admin.email")}</p>
                    <p className="font-bold">{String(data.email ?? "—")}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">{t("admin.phone")}</p>
                    <p className="font-bold">{String(data.phone ?? "—")}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">{t("admin.city")}</p>
                    <p className="font-bold">{String(data.city ?? "—")}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">
                      {t("admin.rating")}
                    </p>
                    <p className="font-bold flex items-center gap-1">
                      <span
                        className="material-symbols-outlined text-amber-400"
                        style={{ fontSize: 14 }}
                      >
                        star
                      </span>
                      {Number(data.rating).toFixed(1)} (
                      {Number(data.total_reviews)} reviews)
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">
                      {t("admin.completedBookings")}
                    </p>
                    <p className="font-bold">
                      {Number(data.completed_bookings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">
                      {t("admin.joined")}
                    </p>
                    <p className="font-bold">
                      {new Date(String(data.created_at)).toLocaleDateString(
                        "en-EG",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
            {!!data.description && (
              <p className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                {data.description as string}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {isApplication && status === "pending" ? (
              <>
                <button
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-2"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    send
                  </span>
                  {t("admin.approveInvite")}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleReject}
                  className="px-5 py-2.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold rounded-xl hover:bg-red-200 disabled:opacity-60 transition-colors flex items-center gap-2"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    close
                  </span>
                  {t("admin.reject")}
                </button>
              </>
            ) : !isApplication ? (
              <>
                {status === "approved" && (
                  <button
                    onClick={() => handleStatusChange("suspended")}
                    className="px-5 py-2.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold rounded-xl hover:bg-red-200 transition-colors"
                  >
                    {t("admin.suspend")}
                  </button>
                )}
                {status === "suspended" && (
                  <button
                    onClick={() => handleStatusChange("approved")}
                    className="px-5 py-2.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold rounded-xl hover:bg-emerald-200 transition-colors"
                  >
                    {t("admin.reinstate")}
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Operations info — shown for applications */}
      {isApplication && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-5">
          <h2 className="font-black">Operations Details</h2>

          {/* Service center fields */}
          {String(data.vendor_type ?? "") === "service_center" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              {Array.isArray(data.working_days) &&
                (data.working_days as string[]).length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Working Days</p>
                    <div className="flex flex-wrap gap-1">
                      {(data.working_days as string[]).map((d) => (
                        <span
                          key={d}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {!!(data.open_time || data.close_time) && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">Working Hours</p>
                  <p className="font-bold">
                    {String(data.open_time ?? "—")} –{" "}
                    {String(data.close_time ?? "—")}
                  </p>
                </div>
              )}
              {Array.isArray(data.specializations) &&
                (data.specializations as string[]).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-slate-400 text-xs mb-1">
                      Specializations
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(data.specializations as string[]).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {Array.isArray(data.supported_makes) &&
                (data.supported_makes as string[]).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-slate-400 text-xs mb-1">
                      Supported Car Makes
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(data.supported_makes as string[]).map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Parts seller fields */}
          {String(data.vendor_type ?? "") === "parts_seller" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              {Array.isArray(data.delivery_options) &&
                (data.delivery_options as string[]).length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs mb-1">
                      Delivery Options
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(data.delivery_options as string[]).map((d) => (
                        <span
                          key={d}
                          className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium capitalize"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {!!data.return_policy && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">Return Policy</p>
                  <p className="font-bold">{String(data.return_policy)}</p>
                </div>
              )}
            </div>
          )}

          {!!(
            data.bank_name ||
            data.account_name ||
            data.account_number ||
            data.iban
          ) && (
            <div>
              <p className="text-slate-400 text-xs mb-2">Bank Details</p>
              <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                {!!data.bank_name && (
                  <div>
                    <span className="text-slate-400 text-xs block">Bank</span>
                    <span className="font-bold">{String(data.bank_name)}</span>
                  </div>
                )}
                {!!data.account_name && (
                  <div>
                    <span className="text-slate-400 text-xs block">
                      Account Name
                    </span>
                    <span className="font-bold">
                      {String(data.account_name)}
                    </span>
                  </div>
                )}
                {!!data.account_number && (
                  <div>
                    <span className="text-slate-400 text-xs block">
                      Account Number
                    </span>
                    <span className="font-bold">
                      {String(data.account_number)}
                    </span>
                  </div>
                )}
                {!!data.iban && (
                  <div>
                    <span className="text-slate-400 text-xs block">IBAN</span>
                    <span className="font-bold">{String(data.iban)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shop photos — shown for applications */}
      {isApplication &&
        Array.isArray(data.shop_photos) &&
        (data.shop_photos as string[]).filter(Boolean).length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
            <h2 className="font-black mb-4">Shop Photos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(data.shop_photos as string[]).filter(Boolean).map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 hover:ring-2 hover:ring-[#FF4B19] transition-all">
                    <Image
                      src={url}
                      alt={`Shop photo ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      {/* Points per booking — vendor-level */}
      {!isApplication && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="font-black mb-1">Loyalty Points per Booking</h2>
          <p className="text-xs text-slate-400 mb-4">
            Automatically awarded to the customer when any booking at this
            service center is marked completed.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={vendorPtsDraft}
              onChange={(e) => setVendorPtsDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  Number(vendorPtsDraft) !==
                    Number(data?.points_per_booking ?? 0)
                )
                  saveVendorPoints();
              }}
              className="w-28 px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
            />
            <span className="text-sm text-slate-400">pts</span>
            {Number(vendorPtsDraft) !==
              Number(data?.points_per_booking ?? 0) && (
              <button
                onClick={saveVendorPoints}
                disabled={savingVendorPts}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-[#FF4B19] text-white hover:bg-[#e04316] disabled:opacity-50 transition-colors"
              >
                {savingVendorPts ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Services */}
      {!isApplication && services.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-black">
              {t("admin.servicesOffered")} ({services.length})
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {services.map((s) => {
              const sid = String(s.id);
              return (
                <div
                  key={sid}
                  className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2"
                >
                  <p className="font-bold text-sm">{String(s.name)}</p>
                  <p className="text-[#FF4B19] font-black text-lg">
                    EGP {Number(s.price).toLocaleString()}
                  </p>
                  {!!s.duration_minutes && (
                    <p className="text-xs text-slate-400">
                      {Number(s.duration_minutes as number)} min
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent bookings */}
      {!isApplication && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black">{t("admin.recentBookings")}</h3>
            </div>
            {bookings.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">
                {t("admin.noBookingsYet")}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {bookings.map((b) => {
                  const user = b.users as Record<string, unknown> | null;
                  return (
                    <div
                      key={String(b.id)}
                      className="px-5 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-sm">
                          {String(user?.full_name ?? "Customer")}
                        </p>
                        <p className="text-xs text-slate-400">
                          {String(b.booking_date)} · {String(b.status)}
                        </p>
                      </div>
                      {!!b.total_price && (
                        <p className="font-black text-sm">
                          EGP {Number(b.total_price as number).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black">{t("admin.recentReviews")}</h3>
            </div>
            {reviews.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">
                {t("admin.noReviewsYet")}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {reviews.map((r) => {
                  const user = r.users as Record<string, unknown> | null;
                  return (
                    <div key={String(r.id)} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm">
                          {String(user?.full_name ?? "Customer")}
                        </p>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                "material-symbols-outlined",
                                i < Number(r.rating)
                                  ? "text-amber-400"
                                  : "text-slate-200 dark:text-slate-700",
                              )}
                              style={{ fontSize: 12 }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      {!!r.comment && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {r.comment as string}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
