"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

const SETTING_GROUPS: Record<string, string[]> = {
  "Booking & Cancellation": [
    "cancellation_hours",
    "max_advance_booking_days",
    "booking_reminder_hours",
  ],
  "Platform Commerce": ["platform_commission_pct", "min_payout_amount"],
  "System Behaviour": ["maintenance_mode", "max_images_per_listing"],
  "Payment & Banking": [
    "bank_transfer_bank",
    "bank_transfer_account_name",
    "bank_transfer_account_number",
    "bank_transfer_iban",
  ],
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [settings, setSettings] = useState<Setting[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from("system_settings").select("*").order("key");
    setSettings((data ?? []) as Setting[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: string) {
    const newVal = edited[key];
    if (newVal === undefined) return;
    setSaving(key);
    const { error } = await db
      .from("system_settings")
      .update({ value: newVal })
      .eq("key", key);
    if (error) {
      setMsg({ text: `Error saving ${key}: ${error.message}`, ok: false });
    } else {
      setMsg({ text: `"${key}" updated successfully.`, ok: true });
      setEdited((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      load();
    }
    setSaving(null);
    setTimeout(() => setMsg(null), 3000);
  }

  const grouped: Record<string, Setting[]> = {};
  const ungrouped: Setting[] = [];

  for (const s of settings) {
    const groupName = Object.entries(SETTING_GROUPS).find(([, keys]) =>
      keys.includes(s.key),
    )?.[0];
    if (groupName) {
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push(s);
    } else {
      ungrouped.push(s);
    }
  }

  const allGroups = {
    ...grouped,
    ...(ungrouped.length ? { "Other Settings": ungrouped } : {}),
  };

  function renderValue(s: Setting) {
    const val = edited[s.key] ?? s.value;
    const isBool = s.value === "true" || s.value === "false";
    const forceText = s.key.startsWith("bank_transfer_");
    const isNumber =
      !isBool && !forceText && s.value.trim() !== "" && !isNaN(Number(s.value));

    if (isBool) {
      const checked = val === "true";
      return (
        <button
          onClick={() =>
            setEdited((prev) => ({
              ...prev,
              [s.key]: checked ? "false" : "true",
            }))
          }
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            checked ? "bg-[#FF4B19]" : "bg-slate-200 dark:bg-slate-700",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
              checked ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <input
          type={isNumber ? "number" : "text"}
          value={val}
          onChange={(e) =>
            setEdited((prev) => ({ ...prev, [s.key]: e.target.value }))
          }
          className={`px-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 font-mono ${forceText ? "w-64" : "w-36 text-right"}`}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-3xl font-black">{t("admin.systemSettings")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {t("admin.configPlatform")}
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span
            className="material-symbols-outlined animate-spin text-slate-400"
            style={{ fontSize: 40 }}
          >
            progress_activity
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(allGroups).map(([group, items]) => (
            <div
              key={group}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="font-black">{group}</h2>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {items.map((s) => {
                  const isDirty =
                    edited[s.key] !== undefined && edited[s.key] !== s.value;
                  return (
                    <div
                      key={s.key}
                      className="flex items-center justify-between px-6 py-4 gap-6"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm font-mono text-[#FF4B19]">
                          {s.key}
                        </p>
                        {s.description && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {s.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">
                          {t("admin.lastUpdated")}:{" "}
                          {new Date(s.updated_at).toLocaleDateString("en-EG", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {renderValue(s)}
                        {isDirty && (
                          <button
                            onClick={() => save(s.key)}
                            disabled={saving === s.key}
                            className="px-3 py-1.5 bg-[#FF4B19] text-white text-xs font-bold rounded-lg hover:bg-[#e04416] disabled:opacity-60 transition-colors flex items-center gap-1"
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 14 }}
                            >
                              save
                            </span>
                            {saving === s.key ? "…" : t("admin.save")}
                          </button>
                        )}
                        {!isDirty &&
                          (s.value === "true" || s.value === "false") &&
                          edited[s.key] !== undefined && (
                            <button
                              onClick={() => save(s.key)}
                              disabled={saving === s.key}
                              className="px-3 py-1.5 bg-[#FF4B19] text-white text-xs font-bold rounded-lg hover:bg-[#e04416] disabled:opacity-60 transition-colors flex items-center gap-1"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 14 }}
                              >
                                save
                              </span>
                              {saving === s.key ? "…" : t("admin.save")}
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
