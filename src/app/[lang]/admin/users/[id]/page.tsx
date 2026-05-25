"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLanguage();
  const supabase = createClient();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [profileRes, vehiclesRes, bookingsRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", id).single(),
        supabase
          .from("vehicles")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select(
            "id, booking_date, status, booking_type, vendors(business_name), services(name), total_price",
          )
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setUser(profileRes.data as UserProfile);
      setVehicles((vehiclesRes.data ?? []) as Record<string, unknown>[]);
      setBookings((bookingsRes.data ?? []) as Record<string, unknown>[]);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function handleRoleChange(newRole: "customer" | "vendor" | "admin") {
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", id);
    setMsg(error ? `Error: ${error.message}` : `Role updated to ${newRole}.`);
    setTimeout(() => setMsg(null), 4000);
    if (!error && user) setUser({ ...user, role: newRole });
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

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-slate-500">{t("admin.userNotFound")}</p>
        <Link href="/admin/users" className="text-[#FF4B19] font-bold">
          ← {t("admin.backToUsers")}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="text-slate-400 hover:text-[#FF4B19] transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            arrow_back
          </span>
        </Link>
        <h1 className="text-2xl font-black">{t("admin.userProfile")}</h1>
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF4B19] to-orange-400 flex items-center justify-center shrink-0">
            <span className="text-white text-2xl font-black">
              {(user.full_name ?? user.email).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black">
              {user.full_name ?? t("admin.noName")}
            </h2>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <div>
                <span className="text-slate-400 text-xs">
                  {t("admin.phone")}
                </span>
                <p className="font-semibold">{user.phone ?? "—"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">
                  {t("admin.role")}
                </span>
                <p className="font-semibold capitalize">{user.role}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">
                  {t("admin.joined")}
                </span>
                <p className="font-semibold">
                  {new Date(user.created_at).toLocaleDateString("en-EG", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Role actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <p className="text-xs text-slate-400 font-semibold">
              {t("admin.changeRole")}
            </p>
            {(["customer", "vendor", "admin"] as const).map((r) => (
              <button
                key={r}
                disabled={user.role === r}
                onClick={() => handleRoleChange(r)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors",
                  user.role === r
                    ? "bg-[#FF4B19] text-white cursor-default"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Vehicles */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-black flex items-center gap-2">
              <span
                className="material-symbols-outlined text-blue-500"
                style={{ fontSize: 20 }}
              >
                directions_car
              </span>
              {t("admin.vehiclesTitle")} ({vehicles.length})
            </h3>
          </div>
          {vehicles.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">
              {t("admin.noVehiclesAdded")}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {vehicles.map((v) => (
                <div key={String(v.id)} className="px-5 py-3.5">
                  <p className="font-bold text-sm">
                    {String(v.year)} {String(v.make)} {String(v.model)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {v.trim ? String(v.trim) : ""}{" "}
                    {v.plate_number ? `· ${String(v.plate_number)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-black flex items-center gap-2">
              <span
                className="material-symbols-outlined text-amber-500"
                style={{ fontSize: 20 }}
              >
                calendar_month
              </span>
              {t("admin.recentBookings")} ({bookings.length})
            </h3>
          </div>
          {bookings.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">
              {t("admin.noBookingsYet")}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {bookings.map((b) => {
                const vendor = b.vendors as Record<string, unknown> | null;
                const service = b.services as Record<string, unknown> | null;
                return (
                  <div key={String(b.id)} className="px-5 py-3">
                    <p className="font-bold text-sm">
                      {String(vendor?.business_name ?? "—")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {String(service?.name ?? b.booking_type)} ·{" "}
                      {String(b.booking_date)} · {String(b.status)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
