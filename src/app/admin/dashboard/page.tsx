"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { VendorStatus } from "@/types/database";

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

interface Stats {
  totalUsers: number;
  totalVendors: number;
  pendingApplications: number;
  totalOrders: number;
  totalBookings: number;
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

export default function AdminDashboardPage() {
  const { role, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalVendors: 0,
    pendingApplications: 0,
    totalOrders: 0,
    totalBookings: 0,
  });
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Guard: admin only
  useEffect(() => {
    if (!isLoading && role && role !== "admin") {
      router.replace("/");
    }
  }, [isLoading, role, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [usersRes, vendorsRes, appsRes, ordersRes, bookingsRes] =
      await Promise.all([
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
      ]);

    setStats({
      totalUsers: usersRes.count ?? 0,
      totalVendors: vendorsRes.count ?? 0,
      pendingApplications: appsRes.data?.length ?? 0,
      totalOrders: ordersRes.count ?? 0,
      totalBookings: bookingsRes.count ?? 0,
    });
    setApplications((appsRes.data ?? []) as VendorApplication[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function updateApplicationStatus(id: string, status: VendorStatus) {
    setUpdatingId(id);
    await supabase
      .from("vendor_applications")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setUpdatingId(null);
    await loadData();
  }

  if (isLoading || (role && role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span
          className="material-symbols-outlined animate-spin text-[#FF4B19]"
          style={{ fontSize: "36px" }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* Top bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img
                src="/motorlogo.png"
                alt="Garage Egypt"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <span className="text-xs font-bold px-2 py-1 bg-[#FF4B19] text-white rounded-lg">
              ADMIN
            </span>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-[#FF4B19] transition-colors flex items-center gap-1"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              home
            </span>
            Back to site
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Platform overview and vendor management
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            {
              label: "Total Users",
              value: stats.totalUsers,
              icon: "group",
              color: "text-blue-600",
            },
            {
              label: "Active Vendors",
              value: stats.totalVendors,
              icon: "storefront",
              color: "text-purple-600",
            },
            {
              label: "Pending Reviews",
              value: stats.pendingApplications,
              icon: "pending_actions",
              color: "text-amber-600",
            },
            {
              label: "Total Orders",
              value: stats.totalOrders,
              icon: "shopping_bag",
              color: "text-emerald-600",
            },
            {
              label: "Total Bookings",
              value: stats.totalBookings,
              icon: "calendar_month",
              color: "text-rose-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`material-symbols-outlined ${s.color}`}
                  style={{ fontSize: "22px" }}
                >
                  {s.icon}
                </span>
              </div>
              <p className="text-2xl font-black">{loading ? "…" : s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pending vendor applications */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-black">Pending Vendor Applications</h2>
            <button
              onClick={loadData}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#FF4B19] transition-colors"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px" }}
              >
                refresh
              </span>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <span
                className="material-symbols-outlined animate-spin mr-2"
                style={{ fontSize: "24px" }}
              >
                progress_activity
              </span>
              Loading…
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span
                className="material-symbols-outlined block mx-auto mb-2"
                style={{ fontSize: "40px" }}
              >
                task_alt
              </span>
              No pending applications — all caught up!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    {[
                      "Business",
                      "Owner",
                      "Type",
                      "City",
                      "Submitted",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
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
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold">{app.business_name}</p>
                        <p className="text-xs text-slate-400">{app.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        <p>{app.owner_name}</p>
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
                          className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize ${STATUS_BADGE[app.status]}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateApplicationStatus(app.id, "approved")
                            }
                            disabled={updatingId === app.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-1"
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: "14px" }}
                            >
                              check
                            </span>
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              updateApplicationStatus(app.id, "rejected")
                            }
                            disabled={updatingId === app.id}
                            className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-60 transition-colors flex items-center gap-1"
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: "14px" }}
                            >
                              close
                            </span>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "All Users", icon: "group", href: "#" },
            { label: "All Vendors", icon: "storefront", href: "#" },
            { label: "All Orders", icon: "shopping_bag", href: "#" },
            { label: "All Bookings", icon: "calendar_month", href: "#" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:border-[#FF4B19] transition-colors group"
            >
              <span
                className="material-symbols-outlined text-slate-400 group-hover:text-[#FF4B19] transition-colors"
                style={{ fontSize: "24px" }}
              >
                {l.icon}
              </span>
              <span className="font-bold text-sm">{l.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
