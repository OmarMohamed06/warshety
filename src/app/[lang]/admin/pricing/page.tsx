"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

interface Setting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

/** Billing rate keys — shown in a separate dedicated section */
const BILLING_RATE_KEYS = [
  {
    key: "service_center_booking_fee",
    label: "Service Center Booking Fee",
    unit: "EGP",
    type: "fixed" as const,
    description:
      "Fixed fee charged to a service center per booking. Monthly bill = bookings × this fee.",
  },
];

const OTHER_PRICING_KEYS = [
  "cancellation_fee_pct",
  "inspection_fee",
  "platform_vat_pct",
];

interface RevenueSnap {
  total_revenue: number;
  total_orders: number;
}

export default function PricingPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [snap, setSnap] = useState<RevenueSnap | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const keys = [
      ...BILLING_RATE_KEYS.map((p) => p.key),
      ...OTHER_PRICING_KEYS,
    ];
    const { data } = await db
      .from("system_settings")
      .select("*")
      .in("key", keys);
    const map: Record<string, Setting> = {};
    for (const s of data ?? []) map[s.key] = s as Setting;
    setSettings(map);

    // Revenue snapshot from paid service-center billing records
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: billing } = await (supabase as any)
      .from("service_center_billing")
      .select("total_fees_due, payment_status")
      .gte("created_at", since);

    const paid = (billing ?? []).filter(
      (b: any) => b.payment_status === "paid",
    );
    const total = paid.reduce(
      (s: number, b: any) => s + Number(b.total_fees_due ?? 0),
      0,
    );
    setSnap({
      total_revenue: total,
      total_orders: paid.length,
    });

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: string) {
    const newVal = edited[key];
    if (newVal === undefined) return;
    setSaving(key);
    // Use upsert so the row is created if it doesn't exist yet
    // (billing keys may not be seeded until billing_schema.sql is run)
    const { error } = await db
      .from("system_settings")
      .upsert(
        { key, value: newVal, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    setMsg(
      error
        ? { text: `Error: ${error.message}`, ok: false }
        : { text: `"${key}" saved.`, ok: true },
    );
    setTimeout(() => setMsg(null), 3000);
    if (!error) {
      setEdited((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      load();
    }
    setSaving(null);
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-3xl font-black">{t("admin.pricingTitle")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {t("admin.pricingSubtitle")}
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

      {/* Revenue snapshot */}
      {snap && (
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: t("admin.revenue30d"),
              value: `EGP ${snap.total_revenue.toLocaleString("en-EG", { maximumFractionDigits: 0 })}`,
              icon: "trending_up",
              color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
            },
            {
              label: t("admin.paidOrders30d"),
              value: snap.total_orders.toLocaleString(),
              icon: "receipt_long",
              color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">
                  {k.label}
                </span>
                <span
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center material-symbols-outlined",
                    k.color,
                  )}
                  style={{ fontSize: 18 }}
                >
                  {k.icon}
                </span>
              </div>
              <p className="text-2xl font-black">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span
            className="material-symbols-outlined animate-spin text-slate-400"
            style={{ fontSize: 36 }}
          >
            progress_activity
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Billing rates — service centers */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[#FF4B19]"
                style={{ fontSize: 20 }}
              >
                receipt_long
              </span>
              <h2 className="font-black">Billing Rates</h2>
              <span className="ml-2 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                Platform defaults — can be overridden per-vendor in Billing →
                Settings
              </span>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {BILLING_RATE_KEYS.map(
                ({ key, label, unit, type, description }) => {
                  const s = settings[key];
                  const current = edited[key] ?? s?.value ?? "";
                  const isDirty =
                    edited[key] !== undefined && edited[key] !== s?.value;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between px-6 py-5 gap-6"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              type === "fixed"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            }`}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 10 }}
                            >
                              {type === "fixed" ? "event_note" : "percent"}
                            </span>
                            {type === "fixed" ? "Fixed Fee" : "Commission %"}
                          </span>
                          <p className="font-black">{label}</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {description}
                        </p>
                        {s?.updated_at && (
                          <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">
                            {t("admin.lastUpdated")}:{" "}
                            {new Date(s.updated_at).toLocaleDateString(
                              "en-EG",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            value={current}
                            min={0}
                            step={unit === "%" ? 0.5 : 1}
                            onChange={(e) =>
                              setEdited((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-28 pr-12 pl-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 text-right font-bold"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                            {unit}
                          </span>
                        </div>
                        {isDirty && (
                          <button
                            onClick={() => save(key)}
                            disabled={saving === key}
                            className="px-3 py-2 bg-[#FF4B19] text-white text-xs font-bold rounded-xl hover:bg-[#e04416] disabled:opacity-60 transition-colors flex items-center gap-1"
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 14 }}
                            >
                              save
                            </span>
                            {saving === key ? "…" : t("admin.save")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
            {/* Formula preview */}
            <div className="mx-6 mb-5 mt-1 grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
                <p className="font-bold mb-0.5">
                  ℹ️ Service Center monthly bill
                </p>
                <p className="font-mono">
                  Bill = bookings × EGP{" "}
                  <strong>
                    {settings["service_center_booking_fee"]?.value ??
                      edited["service_center_booking_fee"] ??
                      "75"}
                  </strong>
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-3 text-xs text-orange-700 dark:text-orange-400">
                <p className="font-bold mb-0.5">ℹ️ Parts seller per order</p>
                <p className="font-mono">
                  Platform share = order ×{" "}
                  <strong>
                    {settings["parts_seller_commission_pct"]?.value ??
                      edited["parts_seller_commission_pct"] ??
                      "15"}
                    %
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* Billing model info */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
            <div className="flex gap-3">
              <span
                className="material-symbols-outlined text-slate-500 shrink-0"
                style={{ fontSize: 20 }}
              >
                info
              </span>
              <p className="font-black text-sm text-slate-700 dark:text-slate-300">
                How vendor billing works
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-1 text-blue-700 dark:text-blue-400">
                <p className="font-bold flex items-center gap-1">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14 }}
                  >
                    event_note
                  </span>
                  Service Centers — Fixed Fee per Booking
                </p>
                <p>
                  Each booking (non-cancelled) accrues a fixed EGP fee. At month
                  end the admin generates a bill:
                </p>
                <p className="font-mono bg-blue-100 dark:bg-blue-900/30 rounded-lg px-2 py-1 mt-1">
                  Monthly bill = bookings × booking fee
                </p>
                <p className="mt-1">
                  The service center pays the invoice. No commission % is
                  applied.
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-1 text-orange-700 dark:text-orange-400">
                <p className="font-bold flex items-center gap-1">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14 }}
                  >
                    percent
                  </span>
                  Parts Sellers — Commission % per Order
                </p>
                <p>
                  Each order creates a transaction record. The platform takes a
                  percentage of the final order value:
                </p>
                <p className="font-mono bg-orange-100 dark:bg-orange-900/30 rounded-lg px-2 py-1 mt-1">
                  Platform share = order × commission%
                </p>
                <p className="mt-1">
                  Vendor receives the remainder. Settled monthly. No fixed
                  booking fee applies.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
