"use client";

import { useEffect, useState, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";

const ORDER_STATUSES: { value: OrderStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-700" },
  { value: "paid", label: "Paid", color: "bg-blue-100 text-blue-700" },
  {
    value: "shipped",
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-green-100 text-green-700",
  },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

const STATUS_COLOR: Record<OrderStatus, string> = Object.fromEntries(
  ORDER_STATUSES.map((s) => [s.value, s.color]),
) as Record<OrderStatus, string>;

export default function VendorOrdersPage() {
  const { vendor, vendorType } = useAuth();
  const supabase = createClient();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const loadOrders = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);

    // Fetch order items that belong to this vendor, then group by order
    const q = supabase
      .from("order_items")
      .select("*, order:orders(*, user:users(full_name,email,phone))")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false });

    const { data } = await q;

    // Group items by order id
    const orderMap = new Map<string, any>();
    (data ?? []).forEach((item: any) => {
      const oid = item.order_id;
      if (!orderMap.has(oid)) {
        orderMap.set(oid, { ...item.order, items: [] });
      }
      orderMap.get(oid).items.push(item);
    });

    let grouped = Array.from(orderMap.values());
    if (filter !== "all") grouped = grouped.filter((o) => o.status === filter);
    setOrders(grouped);
    setLoading(false);
  }, [vendor, filter, supabase]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    loadOrders();
  };

  // Guard
  if (vendorType && vendorType !== "parts_seller") {
    return (
      <VendorLayout>
        <div className="text-center py-20 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-4 block">
            block
          </span>
          <p className="font-semibold">
            Orders are only available for Parts Sellers.
          </p>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">
            View and manage customer orders for your products.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === "all" ? "bg-[#FF4B19] text-white" : "bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
          >
            All
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === s.value ? "bg-[#FF4B19] text-white" : `${s.color} hover:opacity-80`}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              shopping_cart
            </span>
            <p className="font-black text-lg">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
              >
                {/* Order header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-black text-sm">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString(
                          "en-EG",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-semibold">
                        {order.user?.full_name ?? "Customer"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {order.user?.phone ?? order.user?.email ?? ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-black text-[#FF4B19] hidden sm:block">
                      EGP {order.total_amount?.toLocaleString()}
                    </p>
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value as OrderStatus,
                        )
                      }
                      className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 ${STATUS_COLOR[order.status as OrderStatus]}`}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Order items */}
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {order.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="px-6 py-3 flex items-center gap-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{item.name}</p>
                        {item.sku && (
                          <p className="text-xs text-slate-400">
                            SKU: {item.sku}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">×{item.quantity}</p>
                        <p className="text-xs text-slate-500">
                          EGP {item.unit_price?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery info */}
                {order.delivery_address && (
                  <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      local_shipping
                    </span>
                    {order.delivery_name} — {order.delivery_address},{" "}
                    {order.delivery_city}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
