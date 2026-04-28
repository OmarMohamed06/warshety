"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BroadcastTarget = "all_users" | "all_vendors" | "specific_users";

interface Broadcast {
  id: string;
  title: string;
  body: string;
  target: BroadcastTarget;
  created_at: string;
  sent_at: string | null;
  sent_by: string | null;
}

const TARGET_BADGE: Record<BroadcastTarget, string> = {
  all_users: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  all_vendors:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  specific_users:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const TARGET_LABEL: Record<BroadcastTarget, string> = {
  all_users: "All Users",
  all_vendors: "All Vendors",
  specific_users: "Specific Users",
};

export default function NotificationsPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<BroadcastTarget>("all_users");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("admin_broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setBroadcasts((data ?? []) as Broadcast[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    const { error } = await db.from("admin_broadcasts").insert({
      title: title.trim(),
      body: body.trim(),
      target,
      sent_at: new Date().toISOString(),
    });
    setMsg(
      error
        ? { text: `Error: ${error.message}`, ok: false }
        : { text: "Broadcast sent successfully!", ok: true },
    );
    setTimeout(() => setMsg(null), 4000);
    if (!error) {
      setTitle("");
      setBody("");
      setTarget("all_users");
    }
    setSending(false);
    load();
  }

  async function deleteBroadcast(id: string) {
    if (!confirm("Delete this broadcast?")) return;
    await db.from("admin_broadcasts").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-3xl font-black">{t("admin.notificationsTitle")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {t("admin.broadcastSubtitle")}
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

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Compose form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-4 sticky top-6">
            <h2 className="font-black text-lg flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[#FF4B19]"
                style={{ fontSize: 22 }}
              >
                campaign
              </span>
              {t("admin.newBroadcast")}
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                {t("admin.targetAudience")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    "all_users",
                    "all_vendors",
                    "specific_users",
                  ] as BroadcastTarget[]
                ).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={cn(
                      "py-2 text-xs font-bold rounded-xl border-2 transition-colors",
                      target === t
                        ? "border-[#FF4B19] bg-[#FF4B19]/5 text-[#FF4B19]"
                        : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#FF4B19]/40",
                    )}
                  >
                    {TARGET_LABEL[t]
                      .replace(" Users", "")
                      .replace(" Vendors", "")}
                    <br />
                    {t === "all_users"
                      ? "Users"
                      : t === "all_vendors"
                        ? "Vendors"
                        : "Specific"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                {t("admin.notifTitle")}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title…"
                maxLength={100}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
              />
              <p className="text-xs text-slate-400 text-right mt-0.5">
                {title.length}/100
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                {t("admin.messageBody")}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Write your message here…"
                maxLength={500}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 resize-none"
              />
              <p className="text-xs text-slate-400 text-right mt-0.5">
                {body.length}/500
              </p>
            </div>

            {/* Preview card */}
            {(title || body) && (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-400 mb-2">
                  {t("admin.preview")}
                </p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FF4B19] flex items-center justify-center shrink-0">
                    <span
                      className="material-symbols-outlined text-white"
                      style={{ fontSize: 16 }}
                    >
                      notifications
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{title || "Title…"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {body || "Body…"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={send}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full py-3 bg-[#FF4B19] text-white font-black rounded-xl hover:bg-[#e04416] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                send
              </span>
              {sending
                ? t("admin.sending")
                : `${t("admin.sendTo")} ${TARGET_LABEL[target]}`}
            </button>
          </div>
        </div>

        {/* Broadcast history */}
        <div className="lg:col-span-3">
          <h2 className="font-black mb-4">{t("admin.broadcastHistory")}</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span
                className="material-symbols-outlined animate-spin text-slate-400"
                style={{ fontSize: 36 }}
              >
                progress_activity
              </span>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <span
                className="material-symbols-outlined block mx-auto mb-2"
                style={{ fontSize: 40 }}
              >
                inbox
              </span>
              <p className="text-sm">{t("admin.noBroadcasts")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 text-xs font-bold rounded-full",
                            TARGET_BADGE[b.target],
                          )}
                        >
                          {TARGET_LABEL[b.target]}
                        </span>
                        <span className="text-xs text-slate-400">
                          {b.sent_at
                            ? new Date(b.sent_at).toLocaleDateString("en-EG", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Draft"}
                        </span>
                      </div>
                      <p className="font-black">{b.title}</p>
                      <p className="text-sm text-slate-500 mt-1">{b.body}</p>
                    </div>
                    <button
                      onClick={() => deleteBroadcast(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
