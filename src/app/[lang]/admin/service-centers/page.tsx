"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type VendorStatus = "pending" | "approved" | "suspended" | "rejected";
type VendorType = "service_center" | "parts_seller";

interface Vendor {
  id: string;
  display_id: number;
  business_name: string;
  vendor_type: VendorType;
  status: VendorStatus;
  city: string | null;
  rating: number;
  total_reviews: number;
  completed_bookings: number;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface Application {
  id: string;
  display_id: number;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  vendor_type: string;
  city: string | null;
  status: VendorStatus;
  created_at: string;
  commercial_reg_no: string | null;
  description: string | null;
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

export default function ServiceCentersPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  const [tab, setTab] = useState<"vendors" | "applications">("applications");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VendorStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | VendorType>("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [vendorsRes, appsRes] = await Promise.all([
      (() => {
        let q = supabase
          .from("vendors")
          .select(
            "id, display_id, business_name, vendor_type, status, city, rating, total_reviews, completed_bookings, email, phone, created_at",
          );
        if (statusFilter !== "all") q = q.eq("status", statusFilter);
        if (typeFilter !== "all")
          q = q.eq("vendor_type", typeFilter as "service_center");
        if (search.trim()) q = q.ilike("business_name", `%${search}%`);
        return q.order("created_at", { ascending: false });
      })(),
      supabase
        .from("vendor_applications")
        .select(
          "id, display_id, business_name, owner_name, email, phone, vendor_type, city, status, created_at, commercial_reg_no, description",
        )
        .order("created_at", { ascending: false }),
    ]);
    setVendors((vendorsRes.data ?? []) as Vendor[]);
    setApps((appsRes.data ?? []) as Application[]);
    setLoading(false);
  }, [supabase, search, statusFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateVendorStatus(id: string, status: VendorStatus) {
    const { error } = await supabase
      .from("vendors")
      .update({ status })
      .eq("id", id);
    setMsg(
      error ? `Error: ${error.message}` : `Vendor status set to ${status}.`,
    );
    setTimeout(() => setMsg(null), 3000);
    load();
  }

  const pendingApps = apps.filter((a) => a.status === "pending");
  const otherApps = apps.filter((a) => a.status !== "pending");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">
            {t("admin.serviceCentersTitle")}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {t("admin.serviceCentersSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
          <button
            onClick={() => setTab("applications")}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5",
              tab === "applications"
                ? "bg-[#FF4B19] text-white"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            {t("admin.applications")}
            {pendingApps.length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 bg-white text-[#FF4B19] text-[9px] font-black rounded-full">
                {pendingApps.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("vendors")}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
              tab === "vendors"
                ? "bg-[#FF4B19] text-white"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            {t("admin.activeVendors")}
          </button>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 rounded-xl text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* ── Applications tab ────────────────────────────────────── */}
      {tab === "applications" && (
        <div className="space-y-4">
          {/* Pending */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <h2 className="font-black text-base">
                {t("admin.pendingApplications")}
              </h2>
              <span className="w-5 h-5 rounded-full bg-[#FF4B19] text-white text-[10px] font-black flex items-center justify-center">
                {pendingApps.length}
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span
                  className="material-symbols-outlined animate-spin text-slate-400"
                  style={{ fontSize: 28 }}
                >
                  progress_activity
                </span>
              </div>
            ) : pendingApps.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-sm">
                {t("admin.noPendingApplications")}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {pendingApps.map((app) => (
                  <div key={app.id}>
                    <div className="px-6 py-4 flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-base">
                            {app.business_name}
                          </p>
                          <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                            {app.vendor_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1">
                            <span
                              className="material-symbols-outlined text-slate-400"
                              style={{ fontSize: 14 }}
                            >
                              person
                            </span>
                            {app.owner_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <span
                              className="material-symbols-outlined text-slate-400"
                              style={{ fontSize: 14 }}
                            >
                              mail
                            </span>
                            {app.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <span
                              className="material-symbols-outlined text-slate-400"
                              style={{ fontSize: 14 }}
                            >
                              phone
                            </span>
                            {app.phone}
                          </span>
                          {app.city && (
                            <span className="flex items-center gap-1">
                              <span
                                className="material-symbols-outlined text-slate-400"
                                style={{ fontSize: 14 }}
                              >
                                location_on
                              </span>
                              {app.city}
                            </span>
                          )}
                        </div>
                        {expandedApp === app.id && (
                          <div className="mt-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 space-y-2 text-sm">
                            {app.commercial_reg_no && (
                              <p className="text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-400 text-xs uppercase tracking-wide mr-2">
                                  {t("admin.regNo")}
                                </span>
                                {app.commercial_reg_no}
                              </p>
                            )}
                            {app.description ? (
                              <p className="text-slate-500">
                                <span className="font-bold text-slate-400 text-xs uppercase tracking-wide mr-2">
                                  {t("admin.about")}
                                </span>
                                {app.description}
                              </p>
                            ) : (
                              <p className="text-slate-400 text-xs italic">
                                {t("admin.noDescription")}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                              {t("admin.applicationId")}:{" "}
                              <span className="font-mono font-bold">
                                #{String(app.display_id).padStart(3, "0")}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p className="text-xs text-slate-400">
                          {new Date(app.created_at).toLocaleDateString(
                            "en-EG",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedApp(
                                expandedApp === app.id ? null : app.id,
                              )
                            }
                            className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            {expandedApp === app.id
                              ? t("admin.less")
                              : t("admin.details")}
                          </button>
                          <Link
                            href={`/admin/service-centers/${app.id}`}
                            className="px-3 py-1.5 text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 14 }}
                            >
                              open_in_new
                            </span>
                            {t("admin.fullReview")}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other (approved / rejected) */}
          {otherApps.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="font-black text-base text-slate-500">
                  {t("admin.previousApplications")}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      {[
                        t("admin.business"),
                        t("admin.type"),
                        t("admin.city"),
                        t("admin.submitted"),
                        t("admin.status"),
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {otherApps.map((a) => (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-5 py-3 font-bold">
                          {a.business_name}
                        </td>
                        <td className="px-5 py-3 text-slate-500 capitalize">
                          {a.vendor_type.replace(/_/g, " ")}
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {a.city ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {new Date(a.created_at).toLocaleDateString("en-EG", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                              STATUS_BADGE[a.status],
                            )}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Active Vendors tab ──────────────────────────────────── */}
      {tab === "vendors" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                style={{ fontSize: 18 }}
              >
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("vendor.searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | VendorStatus)
              }
              className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
            >
              <option value="all">{t("admin.allStatuses")}</option>
              <option value="approved">
                {t("vendor.approved") || "Approved"}
              </option>
              <option value="pending">
                {t("vendor.statusLabels.pending")}
              </option>
              <option value="suspended">{t("admin.suspend")}</option>
              <option value="rejected">
                {t("vendor.rejected") || "Rejected"}
              </option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "all" | VendorType)
              }
              className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
            >
              <option value="all">{t("admin.allTypes")}</option>
              <option value="service_center">
                {t("vendor.serviceCenterType")}
              </option>
              <option value="parts_seller">
                {t("vendor.partsSellerType")}
              </option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    {[
                      t("admin.vendor"),
                      t("admin.type"),
                      t("admin.city"),
                      t("admin.rating"),
                      t("admin.bookingsCount"),
                      t("admin.status"),
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
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <span
                          className="material-symbols-outlined animate-spin text-slate-400"
                          style={{ fontSize: 28 }}
                        >
                          progress_activity
                        </span>
                      </td>
                    </tr>
                  ) : vendors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center text-slate-400 text-sm"
                      >
                        {t("admin.noVendors")}
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold">{v.business_name}</p>
                          <p className="text-xs text-slate-400">
                            {v.email ?? "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                            {v.vendor_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {v.city ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <span
                              className="material-symbols-outlined text-amber-400"
                              style={{ fontSize: 14 }}
                            >
                              star
                            </span>
                            <span className="font-bold text-sm">
                              {Number(v.rating).toFixed(1)}
                            </span>
                            <span className="text-xs text-slate-400">
                              ({v.total_reviews})
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {v.completed_bookings}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                              STATUS_BADGE[v.status],
                            )}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/service-centers/${v.id}`}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              {t("admin.view")}
                            </Link>
                            {v.status === "approved" ? (
                              <button
                                onClick={() =>
                                  updateVendorStatus(v.id, "suspended")
                                }
                                className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors"
                              >
                                {t("admin.suspend")}
                              </button>
                            ) : v.status === "suspended" ? (
                              <button
                                onClick={() =>
                                  updateVendorStatus(v.id, "approved")
                                }
                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors"
                              >
                                {t("admin.reinstate")}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
