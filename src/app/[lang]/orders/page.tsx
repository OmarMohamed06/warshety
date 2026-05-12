"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  failed_delivery: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: "hourglass_empty",
  paid: "payments",
  processing: "inventory_2",
  shipped: "local_shipping",
  completed: "check_circle",
  cancelled: "cancel",
  failed_delivery: "report",
};

const BOSTA_STATE_LABELS: Record<number, string> = {
  10: "Order Created",
  20: "Route Assigned",
  21: "Picked Up",
  22: "Received at Warehouse",
  23: "In-Hub Scanning",
  24: "In-Hub",
  25: "Transferred to Hub",
  30: "In Transit",
  40: "On Hold",
  41: "Out for Delivery",
  45: "Delivered",
  46: "Returned to Business",
  47: "Delivery Exception",
  48: "Terminated",
  49: "Cancelled",
  100: "Lost",
  101: "Damaged",
};

function bostaStateLabel(code: number): string {
  return BOSTA_STATE_LABELS[code] ?? `State ${code}`;
}

export default function MyOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const supabase = createClient();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("customer-orders")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadOrders(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, loadOrders]);

  if (authLoading)
    return (
      <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF4B19]/20 border-t-[#FF4B19] rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-black">{t("orders.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("orders.subtitle")}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">
            {t("orders.loading")}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              shopping_bag
            </span>
            <p className="font-black text-lg mb-2">{t("orders.noOrders")}</p>
            <p className="text-slate-500 text-sm mb-6">
              {t("orders.noOrdersDesc")}
            </p>
            <Link
              href="/parts"
              className="bg-[#FF4B19] text-white font-black px-6 py-3 rounded-xl hover:bg-[#e03d10] transition"
            >
              {t("orders.shopParts")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-sm">
                      Order #{String(order.display_id).padStart(3, "0")}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("en-EG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-black text-[#FF4B19]">
                      EGP {order.total_amount?.toLocaleString()}
                    </p>
                    <span
                      className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status as OrderStatus]}`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {STATUS_ICONS[order.status as OrderStatus]}
                      </span>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {order.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="px-5 py-3 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {item.name}
                        </p>
                        {item.sku && (
                          <p className="text-xs text-slate-400">
                            SKU: {item.sku}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold">×{item.quantity}</p>
                        <p className="text-xs text-slate-500">
                          EGP {item.unit_price?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery */}
                {order.delivery_address && (
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      local_shipping
                    </span>
                    {order.delivery_name} — {order.delivery_address},{" "}
                    {order.delivery_city}
                  </div>
                )}

                {/* Bosta tracking */}
                {order.tracking_number && (
                  <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-900/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-400">
                      <span className="material-symbols-outlined text-[14px]">
                        package_2
                      </span>
                      Bosta Tracking
                    </div>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {order.tracking_number}
                      </span>
                      {order.bosta_state_code && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300">
                          {bostaStateLabel(Number(order.bosta_state_code))}
                        </span>
                      )}
                    </div>
                    {order.shipped_at && (
                      <p className="text-slate-500 dark:text-slate-400">
                        Shipped: {new Date(order.shipped_at).toLocaleString()}
                      </p>
                    )}
                    {order.delivered_at && (
                      <p className="text-green-700 dark:text-green-400 font-semibold">
                        Delivered:{" "}
                        {new Date(order.delivered_at).toLocaleString()}
                      </p>
                    )}
                    <a
                      href={`https://tracking.bosta.co/shipments/track/${order.tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Track shipment →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
