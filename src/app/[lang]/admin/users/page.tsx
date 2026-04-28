"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type UserRole = "customer" | "vendor" | "admin";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  vehicles_count?: number;
  bookings_count?: number;
}

const ROLE_BADGE: Record<UserRole, string> = {
  customer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  vendor:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-[#FF4B19]/10 text-[#FF4B19]",
};

export default function AdminUsersPage() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [page, setPage] = useState(0);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("users")
      .select("id, email, full_name, phone, role, created_at", {
        count: "exact",
      });

    if (roleFilter !== "all") q = q.eq("role", roleFilter);
    if (search.trim())
      q = q.or(
        `email.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`,
      );

    q = q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await q;
    setUsers((data ?? []) as UserRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [supabase, search, roleFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSuspend(userId: string, current: UserRole) {
    if (current === "admin") return;
    const newRole: UserRole = current === "customer" ? "vendor" : "customer"; // simple toggle for demo
    // In production: set a suspended_at flag. Here we use role change as illustrative.
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);
    setActionMsg(error ? `Error: ${error.message}` : "User updated.");
    setTimeout(() => setActionMsg(null), 3000);
    load();
  }

  async function handleMakeAdmin(userId: string) {
    const { error } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", userId);
    setActionMsg(error ? `Error: ${error.message}` : "User promoted to admin.");
    setTimeout(() => setActionMsg(null), 3000);
    load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">{t("admin.usersTitle")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total.toLocaleString()} {t("admin.registeredUsers")}
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 rounded-xl text-sm font-semibold">
          {actionMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            style={{ fontSize: 18 }}
          >
            search
          </span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search name, email, phone…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 focus:border-[#FF4B19]"
          />
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
          {(["all", "customer", "vendor", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                setPage(0);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors",
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

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {[
                  t("admin.user"),
                  t("admin.phone"),
                  t("admin.role"),
                  t("admin.joined"),
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
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <span
                      className="material-symbols-outlined animate-spin text-slate-400"
                      style={{ fontSize: 28 }}
                    >
                      progress_activity
                    </span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-slate-400 text-sm"
                  >
                    {t("admin.noUsers")}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF4B19] to-orange-400 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-black">
                            {(u.full_name ?? u.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold">
                            {u.full_name ?? (
                              <span className="text-slate-400 italic">
                                No name
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 text-sm">
                      {u.phone ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                          ROLE_BADGE[u.role],
                        )}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString("en-EG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1"
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 14 }}
                          >
                            visibility
                          </span>
                          {t("admin.view")}
                        </Link>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleMakeAdmin(u.id)}
                            className="px-3 py-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-200 transition-colors"
                          >
                            {t("admin.makeAdmin")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500">
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                ← {t("admin.prev")}
              </button>
              <span className="text-xs text-slate-500">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {t("admin.next")} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
