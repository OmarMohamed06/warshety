"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type UserRole = "customer" | "vendor" | "admin";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLE_BADGE: Record<UserRole, string> = {
  admin: "bg-[#FF4B19]/10 text-[#FF4B19]",
  vendor:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  customer: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const PERMISSIONS: Record<
  string,
  { label: string; icon: string; roles: UserRole[] }[]
> = {
  "User & Vendor Management": [
    { label: "View all users", icon: "group", roles: ["admin"] },
    { label: "Suspend / reactivate users", icon: "block", roles: ["admin"] },
    {
      label: "Approve vendor applications",
      icon: "verified",
      roles: ["admin"],
    },
    { label: "Reject vendor applications", icon: "cancel", roles: ["admin"] },
  ],
  "Commerce & Payments": [
    { label: "View all orders", icon: "receipt_long", roles: ["admin"] },
    { label: "View all bookings", icon: "calendar_month", roles: ["admin"] },
    { label: "Force cancel bookings", icon: "event_busy", roles: ["admin"] },
    { label: "View payment transactions", icon: "payments", roles: ["admin"] },
    {
      label: "Manage own bookings/orders",
      icon: "storefront",
      roles: ["vendor"],
    },
  ],
  "Platform Configuration": [
    { label: "Edit system settings", icon: "settings", roles: ["admin"] },
    { label: "Edit pricing / commission", icon: "percent", roles: ["admin"] },
    {
      label: "Manage vehicle catalog",
      icon: "directions_car",
      roles: ["admin"],
    },
    {
      label: "Send broadcast notifications",
      icon: "campaign",
      roles: ["admin"],
    },
  ],
  "Reviews & Disputes": [
    { label: "Delete any review", icon: "delete", roles: ["admin"] },
    { label: "Manage complaints", icon: "report", roles: ["admin"] },
    { label: "Reply to own reviews", icon: "reply", roles: ["vendor"] },
  ],
};

const PAGE_SIZE = 20;

export default function RolesPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"admin" | "vendor" | "all">(
    "admin",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("users")
      .select("id, email, full_name, role, created_at", { count: "exact" });

    if (roleFilter !== "all") q = q.eq("role", roleFilter);
    else q = q.in("role", ["admin", "vendor"]);

    if (search.trim())
      q = q.or(
        `email.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`,
      );
    q = q
      .order("role")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await q;
    setUsers((data ?? []) as AdminUser[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [supabase, roleFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(userId: string, email: string, newRole: UserRole) {
    if (!confirm(`Change ${email} to "${newRole}"?`)) return;
    setUpdating(userId);
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);
    setMsg(
      error
        ? { text: `Error: ${error.message}`, ok: false }
        : { text: `${email} is now ${newRole}.`, ok: true },
    );
    setTimeout(() => setMsg(null), 3000);
    setUpdating(null);
    load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-3xl font-black">{t("admin.rolesTitle")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {t("admin.rolesSubtitle")}
        </p>
      </div>

      {msg && (
        <div
          className={cn(
            "px-4 py-3 rounded-xl text-sm font-semibold border",
            msg.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
          )}
        >
          {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: User role management */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-black">{t("admin.privilegedUsers")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("admin.adminVendorAccounts")}
              </p>
            </div>

            {/* Filters */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  style={{ fontSize: 14 }}
                >
                  search
                </span>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search by email or name…"
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 w-48"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                {(["admin", "vendor", "all"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRoleFilter(r);
                      setPage(0);
                    }}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-md capitalize transition-colors",
                      roleFilter === r
                        ? "bg-[#FF4B19] text-white"
                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span
                  className="material-symbols-outlined animate-spin text-slate-400"
                  style={{ fontSize: 30 }}
                >
                  progress_activity
                </span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">{t("admin.noUsers")}</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between px-5 py-4 gap-4"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF4B19] to-orange-400 flex items-center justify-center text-white font-black text-sm shrink-0">
                          {(u.full_name ?? u.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">
                            {u.full_name ?? u.email}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                            ROLE_BADGE[u.role],
                          )}
                        >
                          {u.role}
                        </span>
                        <div className="flex items-center gap-1">
                          {(["admin", "vendor", "customer"] as UserRole[])
                            .filter((r) => r !== u.role)
                            .map((r) => (
                              <button
                                key={r}
                                onClick={() => changeRole(u.id, u.email, r)}
                                disabled={updating === u.id}
                                className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#FF4B19]/40 hover:text-[#FF4B19] transition-colors disabled:opacity-50 capitalize"
                              >
                                → {r}
                              </button>
                            ))}
                        </div>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF4B19] hover:bg-[#FF4B19]/5 transition-colors"
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 16 }}
                          >
                            open_in_new
                          </span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500">
                      {page * PAGE_SIZE + 1}–
                      {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                      >
                        ←
                      </button>
                      <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Warning banner */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
            <span
              className="material-symbols-outlined text-amber-500 shrink-0"
              style={{ fontSize: 20 }}
            >
              warning
            </span>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Admin access is powerful.</strong> Only grant admin role
              to trusted team members. Admins have full read/write access to all
              platform data including payments, user accounts, and system
              settings.
            </p>
          </div>
        </div>

        {/* Right: Permissions matrix */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-black">{t("admin.permissionMatrix")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("admin.whatEachRoleCan")}
              </p>
            </div>
            <div className="p-4 space-y-5">
              {Object.entries(PERMISSIONS).map(([group, perms]) => (
                <div key={group}>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                    {group}
                  </p>
                  <div className="space-y-1.5">
                    {perms.map((p) => (
                      <div
                        key={p.label}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="material-symbols-outlined text-slate-400 shrink-0"
                            style={{ fontSize: 14 }}
                          >
                            {p.icon}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                            {p.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {p.roles.map((r) => (
                            <span
                              key={r}
                              className={cn(
                                "inline-flex px-1.5 py-0.5 text-xs font-bold rounded capitalize",
                                ROLE_BADGE[r],
                              )}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
