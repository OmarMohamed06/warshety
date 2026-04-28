"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  approveVendorApplication,
  rejectVendorApplication,
} from "@/app/actions/adminActions";
import type { VendorStatus } from "@/types/database";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface Stats {
  totalUsers: number;
  totalVendors: number;
  pendingApplications: number;
  totalOrders: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: number;
  openComplaints: number;
}

interface VendorApplication {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  vendor_type: string;
  city: string | null;
  status: VendorStatus;
  created_at: string;
}

interface Activity {
  id: string;
  type: string;
  label: string;
  sub: string;
  time: string;
  icon: string;
  color: string;
  bg: string;
}

const STATUS_BADGE: Record<VendorStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  suspended:
    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
  loading,
  href,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bg: string;
  loading?: boolean;
  href?: string;
}) {
  const inner = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19]/40 transition-all group cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            bg,
          )}
        >
          <span
            className={cn("material-symbols-outlined", color)}
            style={{ fontSize: 22 }}
          >
            {icon}
          </span>
        </div>
        {href && (
          <span
            className="material-symbols-outlined text-slate-300 group-hover:text-[#FF4B19] transition-colors"
            style={{ fontSize: 16 }}
          >
            arrow_forward
          </span>
        )}
      </div>
      <p className="text-2xl font-black">{loading ? "…" : value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalVendors: 0,
    pendingApplications: 0,
    totalOrders: 0,
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    openComplaints: 0,
  });
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [alerts, setAlerts] = useState<
    { id: string; level: string; icon: string; message: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    id: string;
    error: string | null;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      usersRes,
      vendorsRes,
      appsRes,
      ordersRes,
      bookingsRes,
      activeRes,
      completedRes,
      revenueRes,
      complaintsRes,
      recentBookings,
      recentOrders,
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("vendors").select("id", { count: "exact", head: true }),
      supabase
        .from("vendor_applications")
        .select(
          "id, business_name, owner_name, email, phone, vendor_type, city, status, created_at",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("status", ["booked", "confirmed", "checked_in", "in_progress"]),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase.from("orders").select("total_amount").eq("status", "completed"),
      (supabase as any)
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("bookings")
        .select(
          "id, created_at, status, users(full_name), vendors(business_name)",
        )
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("id, created_at, status, total_amount, users(full_name)")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const totalRevenue = (revenueRes.data ?? []).reduce(
      (s, o) => s + (Number(o.total_amount) || 0),
      0,
    );

    setStats({
      totalUsers: usersRes.count ?? 0,
      totalVendors: vendorsRes.count ?? 0,
      pendingApplications: appsRes.data?.length ?? 0,
      totalOrders: ordersRes.count ?? 0,
      totalBookings: bookingsRes.count ?? 0,
      activeBookings: activeRes.count ?? 0,
      completedBookings: completedRes.count ?? 0,
      totalRevenue,
      openComplaints: complaintsRes.count ?? 0,
    });

    setApplications((appsRes.data ?? []) as VendorApplication[]);

    const feed: Activity[] = [];
    (recentBookings.data ?? []).forEach((b: Record<string, unknown>) => {
      const user = b.users as Record<string, unknown> | null;
      const vendor = b.vendors as Record<string, unknown> | null;
      feed.push({
        id: `b-${b.id}`,
        type: "booking",
        label: `Booking at ${String(vendor?.business_name ?? "center")}`,
        sub: `by ${String(user?.full_name ?? "customer")} · ${String(b.status)}`,
        time: new Date(String(b.created_at)).toLocaleString("en-EG", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        icon: "calendar_month",
        color: "text-blue-600",
        bg: "bg-blue-100 dark:bg-blue-900/30",
      });
    });
    (recentOrders.data ?? []).forEach((o: Record<string, unknown>) => {
      const user = o.users as Record<string, unknown> | null;
      feed.push({
        id: `o-${o.id}`,
        type: "order",
        label: `Order EGP ${Number(o.total_amount).toLocaleString()}`,
        sub: `by ${String(user?.full_name ?? "customer")} · ${String(o.status)}`,
        time: new Date(String(o.created_at)).toLocaleString("en-EG", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        icon: "shopping_bag",
        color: "text-emerald-600",
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
      });
    });
    setActivity(feed.slice(0, 8));

    const al = [];
    if ((appsRes.data?.length ?? 0) > 0)
      al.push({
        id: "apps",
        level: "warning",
        icon: "pending_actions",
        message: `${appsRes.data?.length} vendor application(s) awaiting review`,
      });
    if ((complaintsRes.count ?? 0) > 0)
      al.push({
        id: "complaints",
        level: "error",
        icon: "report",
        message: `${complaintsRes.count} open complaint(s) need attention`,
      });
    setAlerts(al);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApprove(id: string) {
    setUpdatingId(id);
    setActionResult(null);
    const { error } = await approveVendorApplication(id);
    setActionResult({ id, error });
    setUpdatingId(null);
    if (!error) loadData();
  }

  async function handleReject(id: string) {
    setUpdatingId(id);
    setActionResult(null);
    const { error } = await rejectVendorApplication(id);
    setActionResult({ id, error });
    setUpdatingId(null);
    if (!error) loadData();
  }

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">{t("admin.dashboard")}</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {t("admin.platformOverview")}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#FF4B19] transition-colors font-semibold"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            refresh
          </span>
          {t("admin.refresh")}
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border",
                a.level === "error"
                  ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                  : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400",
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                {a.icon}
              </span>
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label={t("admin.totalUsers")}
          value={stats.totalUsers}
          icon="group"
          color="text-blue-600"
          bg="bg-blue-100 dark:bg-blue-900/30"
          loading={loading}
          href="/admin/users"
        />
        <StatCard
          label={t("admin.activeVendors")}
          value={stats.totalVendors}
          icon="storefront"
          color="text-purple-600"
          bg="bg-purple-100 dark:bg-purple-900/30"
          loading={loading}
          href="/admin/service-centers"
        />
        <StatCard
          label={t("admin.activeBookings")}
          value={stats.activeBookings}
          icon="calendar_month"
          color="text-amber-600"
          bg="bg-amber-100 dark:bg-amber-900/30"
          loading={loading}
          href="/admin/bookings"
        />
        <StatCard
          label={t("admin.totalOrders")}
          value={stats.totalOrders}
          icon="shopping_bag"
          color="text-emerald-600"
          bg="bg-emerald-100 dark:bg-emerald-900/30"
          loading={loading}
          href="/admin/payments"
        />
        <StatCard
          label={t("admin.openComplaints")}
          value={stats.openComplaints}
          icon="report"
          color="text-red-600"
          bg="bg-red-100 dark:bg-red-900/30"
          loading={loading}
          href="/admin/complaints"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label={t("admin.completedBookings")}
          value={stats.completedBookings}
          icon="task_alt"
          color="text-emerald-600"
          bg="bg-emerald-100 dark:bg-emerald-900/30"
          loading={loading}
        />
        <StatCard
          label={t("admin.platformRevenue")}
          value={`EGP ${stats.totalRevenue.toLocaleString()}`}
          icon="payments"
          color="text-green-600"
          bg="bg-green-100 dark:bg-green-900/30"
          loading={loading}
        />
        <StatCard
          label={t("admin.totalBookings")}
          value={stats.totalBookings}
          icon="event"
          color="text-indigo-600"
          bg="bg-indigo-100 dark:bg-indigo-900/30"
          loading={loading}
        />
        <StatCard
          label={t("admin.pendingReviews")}
          value={stats.pendingApplications}
          icon="pending_actions"
          color="text-orange-600"
          bg="bg-orange-100 dark:bg-orange-900/30"
          loading={loading}
        />
      </div>

      {/* Activity + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-base font-black">
              {t("admin.recentActivity")}
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <span
                className="material-symbols-outlined animate-spin mr-2"
                style={{ fontSize: 22 }}
              >
                progress_activity
              </span>
              {t("vendor.loading")}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-sm">
              {t("admin.noRecentActivity")}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      a.bg,
                    )}
                  >
                    <span
                      className={cn("material-symbols-outlined", a.color)}
                      style={{ fontSize: 16 }}
                    >
                      {a.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{a.label}</p>
                    <p className="text-xs text-slate-400 truncate">{a.sub}</p>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    {a.time}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          <h2 className="text-base font-black px-1">
            {t("admin.quickActions")}
          </h2>
          {[
            {
              label: t("admin.manageUsers"),
              icon: "group",
              href: "/admin/users",
              color: "text-blue-600",
              bg: "bg-blue-100 dark:bg-blue-900/30",
            },
            {
              label: t("admin.reviewApplications"),
              icon: "pending_actions",
              href: "/admin/service-centers",
              color: "text-amber-600",
              bg: "bg-amber-100 dark:bg-amber-900/30",
            },
            {
              label: t("admin.allBookings"),
              icon: "calendar_month",
              href: "/admin/bookings",
              color: "text-indigo-600",
              bg: "bg-indigo-100 dark:bg-indigo-900/30",
            },
            {
              label: t("admin.paymentsRefunds"),
              icon: "payments",
              href: "/admin/payments",
              color: "text-emerald-600",
              bg: "bg-emerald-100 dark:bg-emerald-900/30",
            },
            {
              label: t("admin.complaintsQueue"),
              icon: "report",
              href: "/admin/complaints",
              color: "text-red-600",
              bg: "bg-red-100 dark:bg-red-900/30",
            },
            {
              label: t("admin.sendNotification"),
              icon: "notifications",
              href: "/admin/notifications",
              color: "text-purple-600",
              bg: "bg-purple-100 dark:bg-purple-900/30",
            },
            {
              label: t("admin.settings"),
              icon: "settings",
              href: "/admin/settings",
              color: "text-slate-600",
              bg: "bg-slate-100 dark:bg-slate-800",
            },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19]/40 transition-all group"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  q.bg,
                )}
              >
                <span
                  className={cn("material-symbols-outlined", q.color)}
                  style={{ fontSize: 18 }}
                >
                  {q.icon}
                </span>
              </div>
              <span className="font-semibold text-sm flex-1">{q.label}</span>
              <span
                className="material-symbols-outlined text-slate-300 group-hover:text-[#FF4B19] transition-colors"
                style={{ fontSize: 16 }}
              >
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending applications */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black">
              {t("admin.pendingVendorApplications")}
            </h2>
            {applications.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 bg-[#FF4B19] text-white text-[10px] font-black rounded-full">
                {applications.length}
              </span>
            )}
          </div>
          <Link
            href="/admin/service-centers"
            className="text-xs text-[#FF4B19] font-bold hover:underline"
          >
            {t("admin.viewAll")}
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <span
              className="material-symbols-outlined animate-spin mr-2"
              style={{ fontSize: 22 }}
            >
              progress_activity
            </span>
            Loading…
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <span
              className="material-symbols-outlined block mx-auto mb-2"
              style={{ fontSize: 36 }}
            >
              task_alt
            </span>
            <p className="text-sm">{t("admin.allCaughtUp")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  {[
                    t("admin.business"),
                    t("admin.owner"),
                    t("admin.type"),
                    t("admin.city"),
                    t("admin.submitted"),
                    t("admin.status"),
                    "",
                    t("admin.actions"),
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold">{app.business_name}</p>
                      <p className="text-xs text-slate-400">{app.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-700 dark:text-slate-300">
                        {app.owner_name}
                      </p>
                      <p className="text-xs text-slate-400">{app.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                        {app.vendor_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {app.city ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(app.created_at).toLocaleDateString("en-EG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                          STATUS_BADGE[app.status],
                        )}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/service-centers/${app.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 13 }}
                        >
                          open_in_new
                        </span>
                        {t("admin.view")}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        {actionResult?.id === app.id && (
                          <p
                            className={cn(
                              "text-xs font-semibold",
                              actionResult.error
                                ? "text-red-600"
                                : "text-emerald-600",
                            )}
                          >
                            {actionResult.error
                              ? `Error: ${actionResult.error}`
                              : t("admin.inviteSent")}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={updatingId === app.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-1"
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 14 }}
                            >
                              send
                            </span>
                            {t("admin.approve")}
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            disabled={updatingId === app.id}
                            className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-200 disabled:opacity-60 transition-colors flex items-center gap-1"
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 14 }}
                            >
                              close
                            </span>
                            {t("admin.reject")}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
