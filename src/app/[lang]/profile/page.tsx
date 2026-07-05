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
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { createClient } from "@/lib/supabase/client";
import { ProfileAppBanner } from "@/components/app-download/ProfileAppBanner";

export default function ProfilePage() {
  const {
    user,
    isAuthenticated,
    isLoading,
    refreshProfile,
    managedBranchId,
    role,
  } = useAuth();
  const router = useRouter();
  const { t, localePath } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Stats
  const [bookingCount, setBookingCount] = useState<number | null>(null);

  // Referral
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [linkCopied, setLinkCopied] = useState(false);

  // Always re-fetch profile on mount to pick up role/branch changes
  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate form from user profile
  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? "");
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

    // Load referral code + how many friends have been referred
    (supabase as any)
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: { referral_code?: string } | null }) =>
        setReferralCode(data?.referral_code ?? null),
      );

    (supabase as any)
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", user.id)
      .then(({ count }: { count: number | null }) =>
        setReferralCount(count ?? 0),
      );
  }, [user]);

  // Redirect guests to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(localePath("/auth/login?next=/profile"));
    }
  }, [isLoading, isAuthenticated, router, localePath]);

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
          <p className="text-sm text-slate-500">{t("profile.loading")}</p>
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
            <h1 className="text-2xl font-black">
              {fullName || t("profile.title")}
            </h1>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 bg-[#FF4B19]/10 text-[#FF4B19] rounded-full">
              {user.role}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            {
              icon: "calendar_month",
              label: t("profile.bookings"),
              value: bookingCount ?? "—",
              href: "/bookings",
            },
            {
              icon: "directions_car",
              label: t("profile.vehicles"),
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
          <h2 className="text-xl font-black mb-6">
            {t("profile.personalInfo")}
          </h2>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("profile.fullName")}
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
                {t("profile.email")}
              </label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                {t("profile.emailNote")}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("profile.avatarUrl")}
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
                  {t("profile.saving")}
                </>
              ) : saved ? (
                <>
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  {t("profile.saved")}
                </>
              ) : (
                t("profile.saveChanges")
              )}
            </button>
          </div>
        </div>

        {/* App download banner */}
        <ProfileAppBanner
          locale={
            user.role === "customer"
              ? t("nav.language") === "العربية"
                ? "ar"
                : "en"
              : "en"
          }
        />

        {/* Referral — App download */}
        {referralCode &&
          (() => {
            const appUrl =
              typeof window !== "undefined"
                ? `${window.location.origin}/download?ref=${referralCode}`
                : `https://warshety.com/download?ref=${referralCode}`;
            return (
              <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-amber-500">
                      smartphone
                    </span>
                  </div>
                  <div>
                    <h2 className="font-black text-base">
                      {t("profile.referralTitle")}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t("profile.referralDesc")}
                    </p>
                  </div>
                </div>

                {/* Rewards grid */}
                <div className="grid grid-cols-3 gap-3 text-center mb-5">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
                    <p className="text-xl font-black">{referralCount}</p>
                    <p className="text-xs text-slate-400">
                      {t("profile.referralFriends")}
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
                    <p className="text-xl font-black text-amber-600">+500</p>
                    <p className="text-xs text-slate-400">
                      {t("profile.referralYourBonus")}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3">
                    <p className="text-xl font-black text-green-600">+250</p>
                    <p className="text-xs text-slate-400">
                      {t("profile.referralFriendBonus")}
                    </p>
                  </div>
                </div>

                {/* Share link */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    {t("profile.referralShareLink")}
                  </p>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                    <span className="flex-1 text-xs text-slate-500 truncate font-mono select-all">
                      {appUrl}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard
                          .writeText(appUrl)
                          .then(() => {
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          })
                          .catch(() => {});
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-[#FF4B19] text-white hover:opacity-90 transition shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {linkCopied ? "check" : "content_copy"}
                      </span>
                      {linkCopied
                        ? t("profile.referralCopied")
                        : t("profile.referralCopy")}
                    </button>
                  </div>

                  {/* App store buttons */}
                  <div className="flex gap-2 pt-1">
                    <a
                      href={`https://apps.apple.com/app/warshety`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-xs font-bold rounded-xl py-3 hover:opacity-80 transition"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                      {t("profile.referralAppStore")}
                    </a>
                    <a
                      href={`https://play.google.com/store/apps/details?id=com.warshety.app`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold rounded-xl py-3 hover:opacity-80 transition"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M3.18 23.76A1 1 0 0 1 3 23.1V.9A1 1 0 0 1 3.18.24l11.27 11.76zm1.87-.9 10.14-5.76-2.27-2.37zm10.14-14.76L5.05 2.14l7.87 8.21zM16.82 7.1 13.6 12l3.22 4.9 4.1-2.34a1 1 0 0 0 0-1.72z" />
                      </svg>
                      {t("profile.referralPlayStore")}
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: "/garage",
              icon: "directions_car",
              label: t("profile.myGarage"),
              desc: t("profile.manageVehicles"),
            },
            {
              href: "/bookings",
              icon: "calendar_month",
              label: t("profile.myBookings"),
              desc: t("profile.trackService"),
            },
            {
              href: "/orders",
              icon: "package_2",
              label: t("profile.myOrders"),
              desc: t("profile.partsHistory"),
            },
            {
              href: "/rewards",
              icon: "card_giftcard",
              label: "My Rewards",
              desc: "Points, vouchers & perks",
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

        {/* Branch manager shortcut */}
        {role === "manager" && (
          <div className="mt-4">
            {managedBranchId ? (
              <Link
                href={`/branch/${managedBranchId}`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-[#FF4B19]/30 flex items-center gap-4 hover:border-[#FF4B19] hover:shadow-md transition-all w-full"
              >
                <div className="w-10 h-10 bg-[#FF4B19] rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white">
                    store
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm">Branch Management</p>
                  <p className="text-xs text-slate-400">
                    Manage bookings, schedule &amp; services for your branch
                  </p>
                </div>
                <span className="material-symbols-outlined text-[#FF4B19] ml-auto">
                  chevron_right
                </span>
              </Link>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-700 flex items-center gap-4 w-full opacity-60">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-slate-400">
                    store
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm">Branch Management</p>
                  <p className="text-xs text-slate-400">Loading branch info…</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
