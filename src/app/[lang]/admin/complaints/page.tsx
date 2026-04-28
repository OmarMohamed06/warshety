"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type ComplaintStatus = "open" | "investigating" | "resolved" | "closed";

interface Complaint {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  users: { full_name: string | null; email: string } | null;
  vendors: { business_name: string } | null;
  bookings: { booking_date: string; status: string } | null;
}

const STATUS_BADGE: Record<ComplaintStatus, string> = {
  open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  investigating:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const PAGE_SIZE = 15;

export default function ComplaintsPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = db
      .from("complaints")
      .select(
        "id, type, subject, description, status, admin_notes, created_at, resolved_at, users(full_name, email), vendors(business_name), bookings(booking_date, status)",
        { count: "exact" },
      );

    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    q = q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await q;
    setComplaints((data ?? []) as unknown as Complaint[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [supabase, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: ComplaintStatus) {
    setUpdating(true);
    const updates: Record<string, unknown> = {
      status,
      admin_notes: adminNote || null,
    };
    if (status === "resolved" || status === "closed")
      updates.resolved_at = new Date().toISOString();

    const { error } = await db.from("complaints").update(updates).eq("id", id);
    setMsg(
      error ? `Error: ${error.message}` : `Complaint marked as ${status}.`,
    );
    setTimeout(() => setMsg(null), 3000);
    setUpdating(false);
    setSelected(null);
    setAdminNote("");
    load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-black">{t("admin.complaintsTitle")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {total.toLocaleString()} {t("admin.totalComplaints")}
        </p>
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 rounded-xl text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 w-fit">
        {(["open", "investigating", "resolved", "closed", "all"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(0);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors",
                statusFilter === s
                  ? "bg-[#FF4B19] text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
            >
              {s}
            </button>
          ),
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Complaints list */}
        <div className="lg:col-span-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span
                className="material-symbols-outlined animate-spin text-slate-400"
                style={{ fontSize: 36 }}
              >
                progress_activity
              </span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <span
                className="material-symbols-outlined block mx-auto mb-2"
                style={{ fontSize: 40 }}
              >
                check_circle
              </span>
              <p className="text-sm">{t("admin.noComplaints")}</p>
            </div>
          ) : (
            complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelected(c);
                  setAdminNote(c.admin_notes ?? "");
                }}
                className={cn(
                  "bg-white dark:bg-slate-800 rounded-2xl border transition-all cursor-pointer p-5",
                  selected?.id === c.id
                    ? "border-[#FF4B19] ring-2 ring-[#FF4B19]/20"
                    : "border-slate-100 dark:border-slate-700 hover:border-[#FF4B19]/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                          STATUS_BADGE[c.status],
                        )}
                      >
                        {c.status}
                      </span>
                      <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                        {c.type}
                      </span>
                    </div>
                    <p className="font-black text-sm">{c.subject}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {c.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 12 }}
                        >
                          person
                        </span>
                        {c.users?.full_name ?? c.users?.email ?? "—"}
                      </span>
                      {c.vendors && (
                        <span className="flex items-center gap-1">
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 12 }}
                          >
                            storefront
                          </span>
                          {c.vendors.business_name}
                        </span>
                      )}
                      <span>
                        {new Date(c.created_at).toLocaleDateString("en-EG", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <span
                    className="material-symbols-outlined text-slate-300 shrink-0"
                    style={{ fontSize: 18 }}
                  >
                    chevron_right
                  </span>
                </div>
              </div>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  ← {t("admin.prev")}
                </button>
                <span className="text-xs text-slate-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  {t("admin.next")} →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center py-20 text-slate-400">
              <span
                className="material-symbols-outlined mb-2"
                style={{ fontSize: 40 }}
              >
                report
              </span>
              <p className="text-sm">{t("admin.selectComplaint")}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black">{t("admin.complaintDetails")}</h3>
                <button onClick={() => setSelected(null)}>
                  <span
                    className="material-symbols-outlined text-slate-400"
                    style={{ fontSize: 18 }}
                  >
                    close
                  </span>
                </button>
              </div>

              <div>
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 text-xs font-bold rounded-full capitalize",
                    STATUS_BADGE[selected.status],
                  )}
                >
                  {selected.status}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">
                  {t("admin.subject")}
                </p>
                <p className="font-black">{selected.subject}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">
                  {t("admin.description")}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                  {selected.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">
                    {t("admin.customer")}
                  </p>
                  <p className="font-bold text-sm">
                    {selected.users?.full_name ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selected.users?.email ?? ""}
                  </p>
                </div>
                {selected.vendors && (
                  <div>
                    <p className="text-xs text-slate-400">
                      {t("admin.vendor")}
                    </p>
                    <p className="font-bold text-sm">
                      {selected.vendors.business_name}
                    </p>
                  </div>
                )}
                {selected.bookings && (
                  <div>
                    <p className="text-xs text-slate-400">
                      {t("admin.relatedBooking")}
                    </p>
                    <p className="font-bold text-sm">
                      {selected.bookings.booking_date}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">
                      {selected.bookings.status.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400">{t("admin.filed")}</p>
                  <p className="font-bold text-sm">
                    {new Date(selected.created_at).toLocaleDateString("en-EG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Admin notes */}
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  {t("admin.adminNotes")}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Add internal notes about resolution…"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                {selected.status === "open" && (
                  <button
                    onClick={() => updateStatus(selected.id, "investigating")}
                    disabled={updating}
                    className="w-full px-4 py-2.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-sm font-bold rounded-xl hover:bg-amber-200 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      manage_search
                    </span>
                    {t("admin.startInvestigation")}
                  </button>
                )}
                {(selected.status === "open" ||
                  selected.status === "investigating") && (
                  <button
                    onClick={() => updateStatus(selected.id, "resolved")}
                    disabled={updating}
                    className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      check_circle
                    </span>
                    {t("admin.markResolved")}
                  </button>
                )}
                {selected.status !== "closed" && (
                  <button
                    onClick={() => updateStatus(selected.id, "closed")}
                    disabled={updating}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-200 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      lock
                    </span>
                    {t("admin.closeComplaint")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
