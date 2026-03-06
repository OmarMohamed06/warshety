"use client";

import { useEffect, useState, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface InventoryRow {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  brand: string | null;
  condition: string;
  stock: number;
  price: number;
  active: boolean;
}

const LOW_STOCK_THRESHOLD = 5;

export default function VendorInventoryPage() {
  const { vendor, vendorType, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});

  // Guard: parts_seller only
  useEffect(() => {
    if (!isLoading && vendorType && vendorType !== "parts_seller") {
      router.replace("/vendor/dashboard");
    }
  }, [isLoading, vendorType, router]);

  const loadInventory = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, name, sku, category, brand, condition, stock, price, active")
      .eq("vendor_id", vendor.id)
      .order("stock", { ascending: true });
    setRows((data ?? []) as InventoryRow[]);
    setLoading(false);
  }, [vendor, supabase]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  async function saveStock(productId: string) {
    const rawValue = stockEdits[productId];
    const newStock = parseInt(rawValue, 10);
    if (isNaN(newStock) || newStock < 0) return;

    setUpdating(productId);
    await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", productId);
    setUpdating(null);
    setStockEdits((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    await loadInventory();
  }

  const filtered = rows.filter((r) => {
    if (filter === "low") return r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD;
    if (filter === "out") return r.stock === 0;
    return true;
  });

  const totalValue = rows.reduce((s, r) => s + r.price * r.stock, 0);
  const lowCount = rows.filter(
    (r) => r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD,
  ).length;
  const outCount = rows.filter((r) => r.stock === 0).length;

  const stockBadge = (stock: number) => {
    if (stock === 0)
      return (
        <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Out of Stock
        </span>
      );
    if (stock <= LOW_STOCK_THRESHOLD)
      return (
        <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Low Stock
        </span>
      );
    return (
      <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        In Stock
      </span>
    );
  };

  return (
    <VendorLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Inventory Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor and update your product stock levels
            </p>
          </div>
          <button
            onClick={loadInventory}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              refresh
            </span>
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Products",
              value: rows.length,
              icon: "inventory_2",
              color: "text-blue-600",
            },
            {
              label: "Low Stock",
              value: lowCount,
              icon: "warning",
              color: "text-amber-600",
            },
            {
              label: "Out of Stock",
              value: outCount,
              icon: "remove_shopping_cart",
              color: "text-red-600",
            },
            {
              label: "Inventory Value",
              value: `EGP ${totalValue.toLocaleString("en-EG")}`,
              icon: "payments",
              color: "text-emerald-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`material-symbols-outlined ${s.color}`}
                  style={{ fontSize: "20px" }}
                >
                  {s.icon}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {s.label}
                </span>
              </div>
              <p className="text-xl font-black">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "low", "out"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === f
                  ? "bg-[#FF4B19] text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#FF4B19]"
              }`}
            >
              {f === "all"
                ? "All Products"
                : f === "low"
                  ? `Low Stock (${lowCount})`
                  : `Out of Stock (${outCount})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <span
                className="material-symbols-outlined animate-spin mr-2"
                style={{ fontSize: "24px" }}
              >
                progress_activity
              </span>
              Loading inventory…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span
                className="material-symbols-outlined block mx-auto mb-2"
                style={{ fontSize: "40px" }}
              >
                inventory_2
              </span>
              No products found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    {[
                      "Product",
                      "SKU",
                      "Category",
                      "Condition",
                      "Price",
                      "Stock",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map((row) => {
                    const isEditing = row.id in stockEdits;
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">{row.name}</p>
                          {row.brand && (
                            <p className="text-xs text-slate-400">
                              {row.brand}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {row.sku ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {row.category}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">
                          {row.condition}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          EGP {row.price.toLocaleString("en-EG")}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              className="w-20 border border-[#FF4B19] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                              value={stockEdits[row.id]}
                              onChange={(e) =>
                                setStockEdits((prev) => ({
                                  ...prev,
                                  [row.id]: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <span
                              className={`font-bold ${
                                row.stock === 0
                                  ? "text-red-500"
                                  : row.stock <= LOW_STOCK_THRESHOLD
                                    ? "text-amber-500"
                                    : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {row.stock}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{stockBadge(row.stock)}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => saveStock(row.id)}
                                disabled={updating === row.id}
                                className="px-3 py-1 bg-[#FF4B19] text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-all"
                              >
                                {updating === row.id ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() =>
                                  setStockEdits((prev) => {
                                    const next = { ...prev };
                                    delete next[row.id];
                                    return next;
                                  })
                                }
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setStockEdits((prev) => ({
                                  ...prev,
                                  [row.id]: String(row.stock),
                                }))
                              }
                              className="flex items-center gap-1 text-xs font-bold text-[#FF4B19] hover:underline"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "14px" }}
                              >
                                edit
                              </span>
                              Update
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
