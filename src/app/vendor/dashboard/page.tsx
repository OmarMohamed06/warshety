"use client";

import { useEffect, useState, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color = "bg-[#FF4B19]",
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 flex items-start gap-4">
      <div
        className={`${color} w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0`}
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col items-center gap-2 hover:border-[#FF4B19] hover:shadow-lg hover:shadow-[#FF4B19]/10 transition-all group"
    >
      <span className="material-symbols-outlined text-[28px] text-slate-400 group-hover:text-[#FF4B19] transition-colors">
        {icon}
      </span>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-center">
        {label}
      </span>
    </a>
  );
}

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting_parts: "bg-orange-100 text-orange-700",
  ready_for_pickup: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VendorDashboardPage() {
  const { vendor, vendorType } = useAuth();
  const supabase = createClient();

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todayBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    activeProducts: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);

    if (vendorType === "service_center") {
      const today = new Date().toISOString().split("T")[0];
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          "*, vehicle:vehicles(*), service:services(*), user:users(full_name,email)",
        )
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(6);

      const todayCount =
        bookings?.filter((b: any) => b.booking_date === today).length ?? 0;
      const pendingCount =
        bookings?.filter((b: any) =>
          ["booked", "confirmed", "checked_in", "in_progress"].includes(
            b.status,
          ),
        ).length ?? 0;
      const revenue =
        bookings
          ?.filter((b: any) => b.status === "completed")
          .reduce((s: number, b: any) => s + (b.total_price ?? 0), 0) ?? 0;

      setRecentBookings(bookings ?? []);
      setStats((p) => ({
        ...p,
        todayBookings: todayCount,
        pendingBookings: pendingCount,
        totalRevenue: revenue,
      }));
    } else if (vendorType === "parts_seller") {
      const { count: productCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendor.id)
        .eq("active", true);

      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*, order:orders(status)")
        .eq("vendor_id", vendor.id)
        .limit(50);

      const pendingOrders =
        orderItems?.filter((oi: any) => oi.order?.status === "pending")
          .length ?? 0;
      setStats((p) => ({
        ...p,
        activeProducts: productCount ?? 0,
        pendingOrders,
      }));
    }
    setLoading(false);
  }, [vendor, vendorType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <VendorLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-black">
            Good morning, {vendor?.business_name?.split(" ")[0] ?? "Vendor"} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here&apos;s what&apos;s happening with your{" "}
            {vendorType === "service_center" ? "workshop" : "store"} today.
          </p>
        </div>

        {/* Stats */}
        {vendorType === "service_center" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              icon="today"
              label="Today's Bookings"
              value={loading ? "…" : stats.todayBookings}
              color="bg-blue-500"
            />
            <StatCard
              icon="pending_actions"
              label="Active Jobs"
              value={loading ? "…" : stats.pendingBookings}
              color="bg-amber-500"
            />
            <StatCard
              icon="payments"
              label="Revenue (completed)"
              value={
                loading ? "…" : `EGP ${stats.totalRevenue.toLocaleString()}`
              }
              color="bg-green-500"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              icon="inventory_2"
              label="Active Products"
              value={loading ? "…" : stats.activeProducts}
              color="bg-[#FF4B19]"
            />
            <StatCard
              icon="shopping_cart"
              label="Pending Orders"
              value={loading ? "…" : stats.pendingOrders}
              color="bg-amber-500"
            />
            <StatCard
              icon="star"
              label="Rating"
              value={vendor?.rating ? `${vendor.rating} / 5` : "—"}
              color="bg-purple-500"
            />
          </div>
        )}

        {/* Recent bookings — service center */}
        {vendorType === "service_center" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-black">Recent Bookings</h2>
              <a
                href="/vendor/bookings"
                className="text-sm text-[#FF4B19] hover:underline"
              >
                View all →
              </a>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading…</div>
            ) : recentBookings.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No bookings yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentBookings.map((b: any) => (
                  <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {b.user?.full_name ?? "Customer"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {b.service?.name ?? "Service"} ·{" "}
                        {b.vehicle
                          ? `${b.vehicle.make} ${b.vehicle.model} ${b.vehicle.year}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{b.booking_date}</p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {vendorType === "service_center" ? (
            <>
              <QuickAction
                href="/vendor/bookings"
                icon="calendar_month"
                label="Manage Bookings"
              />
              <QuickAction
                href="/vendor/services"
                icon="home_repair_service"
                label="Edit Services"
              />
              <QuickAction
                href="/vendor/calendar"
                icon="event"
                label="Calendar"
              />
              <QuickAction
                href="/vendor/settings"
                icon="settings"
                label="Settings"
              />
            </>
          ) : (
            <>
              <QuickAction
                href="/vendor/products"
                icon="add_box"
                label="Add Product"
              />
              <QuickAction
                href="/vendor/orders"
                icon="shopping_cart"
                label="Orders"
              />
              <QuickAction
                href="/vendor/inventory"
                icon="warehouse"
                label="Inventory"
              />
              <QuickAction
                href="/vendor/settings"
                icon="settings"
                label="Settings"
              />
            </>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
