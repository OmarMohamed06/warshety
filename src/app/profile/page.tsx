"use client";

/**
 * /profile — Customer profile management page.
 *
 * Allows authenticated users to:
 * - Edit name, phone, avatar URL
 * - See their booking and order counts
 * - Navigate to My Garage, Bookings, Orders
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Stats
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);

  // Hydrate form from user profile
  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? "");
      setPhone(user.phone ?? "");
      setAvatarUrl(user.avatar_url ?? "");
    }
  }, [user]);

  // Load stats
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setBookingCount(count ?? 0));

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setOrderCount(count ?? 0));
  }, [user]);

  // Redirect guests to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login?next=/profile");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSaved(false);

    const supabase = createClient();
    const { error: err } = await supabase
      .from("users")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (err) {
      setError("Failed to save changes. Please try again.");
    } else {
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] dark:bg-[#111621]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#FF4B19]/30 border-t-[#FF4B19] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials =
    fullName
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("") || user.email[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          {/* Avatar */}
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || "Profile"}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-slate-800 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF4B19] to-orange-400 flex items-center justify-center text-white font-black text-2xl shadow-lg border-4 border-white dark:border-slate-800">
                {initials}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black">{fullName || "My Profile"}</h1>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 bg-[#FF4B19]/10 text-[#FF4B19] rounded-full">
              {user.role}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: "calendar_month",
              label: "Bookings",
              value: bookingCount ?? "—",
              href: "/bookings",
            },
            {
              icon: "package_2",
              label: "Orders",
              value: orderCount ?? "—",
              href: "/orders",
            },
            {
              icon: "directions_car",
              label: "Vehicles",
              value: "—",
              href: "/garage",
            },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-2 text-center hover:border-[#FF4B19]/30 hover:shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[#FF4B19] text-2xl">
                {stat.icon}
              </span>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Edit form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-black mb-6">Personal Information</h2>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmed Hassan"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Email cannot be changed here.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 100 123 4567"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Avatar URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-red-500 text-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3.5 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#FF4B19]/20"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  Saved!
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: "/garage",
              icon: "directions_car",
              label: "My Garage",
              desc: "Manage your vehicles",
            },
            {
              href: "/bookings",
              icon: "calendar_month",
              label: "My Bookings",
              desc: "Track service status",
            },
            {
              href: "/orders",
              icon: "package_2",
              label: "My Orders",
              desc: "Parts order history",
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:border-[#FF4B19]/30 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-[#FF4B19]/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#FF4B19]">
                  {link.icon}
                </span>
              </div>
              <div>
                <p className="font-bold text-sm">{link.label}</p>
                <p className="text-xs text-slate-400">{link.desc}</p>
              </div>
              <span className="material-symbols-outlined text-slate-300 ml-auto">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
