"use client";

import { useEffect, useState, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { DbProduct } from "@/types/database";

const CATEGORIES = [
  "Brakes",
  "Engine",
  "Filters",
  "Suspension",
  "Electrical",
  "Exhaust",
  "Transmission",
  "Cooling",
  "Body Parts",
  "Other",
];

const CONDITIONS = ["new", "used", "refurbished"] as const;

const emptyForm = {
  name: "",
  description: "",
  price: "",
  original_price: "",
  category: "Brakes",
  subcategory: "",
  sku: "",
  oem_number: "",
  brand: "",
  condition: "new" as "new" | "used" | "refurbished",
  stock: "",
  image_url: "",
  active: true,
};

export default function VendorProductsPage() {
  const { vendor, vendorType } = useAuth();
  const supabase = createClient();

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false });
    setProducts((data ?? []) as DbProduct[]);
    setLoading(false);
  }, [vendor, supabase]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (p: DbProduct) => {
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      original_price: p.original_price ? String(p.original_price) : "",
      category: p.category,
      subcategory: p.subcategory ?? "",
      sku: p.sku ?? "",
      oem_number: p.oem_number ?? "",
      brand: p.brand ?? "",
      condition: p.condition,
      stock: String(p.stock),
      image_url: p.image_url ?? "",
      active: p.active,
    });
    setEditId(p.id);
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!vendor) return;
    if (!form.name || !form.price || !form.stock) {
      setError("Name, price, and stock are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      vendor_id: vendor.id,
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      original_price: form.original_price
        ? parseFloat(form.original_price)
        : null,
      category: form.category,
      subcategory: form.subcategory || null,
      sku: form.sku || null,
      oem_number: form.oem_number || null,
      brand: form.brand || null,
      condition: form.condition,
      stock: parseInt(form.stock),
      image_url: form.image_url || null,
      active: form.active,
    };

    let err;
    if (editId) {
      const { error: e } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editId);
      err = e;
    } else {
      const { error: e } = await supabase.from("products").insert(payload);
      err = e;
    }

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowForm(false);
    loadProducts();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("products").update({ active }).eq("id", id);
    loadProducts();
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
            Product management is only available for Parts Sellers.
          </p>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Products</h1>
            <p className="text-slate-500 text-sm mt-1">
              Add, edit, and manage your parts inventory.
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-[#FF4B19] hover:bg-[#e03d10] text-white font-black px-5 py-2.5 rounded-xl transition shadow-lg shadow-[#FF4B19]/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Product
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            Loading products…
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              inventory_2
            </span>
            <p className="font-black text-lg mb-2">No products yet</p>
            <p className="text-slate-500 text-sm mb-6">
              Start adding spare parts to your store.
            </p>
            <button
              onClick={openNew}
              className="bg-[#FF4B19] text-white font-black px-6 py-3 rounded-xl hover:bg-[#e03d10] transition"
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Product
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Category
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Price
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Stock
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-400 text-[18px]">
                                settings
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-slate-400">
                              {p.brand ?? ""} {p.sku ? `· SKU: ${p.sku}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                        <span>{p.category}</span>
                        {p.condition !== "new" && (
                          <span className="ml-2 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            {p.condition}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-bold">
                        EGP {p.price.toLocaleString()}
                        {p.original_price && (
                          <span className="block text-xs line-through text-slate-400 font-normal">
                            EGP {p.original_price.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`font-bold ${p.stock === 0 ? "text-red-500" : p.stock < 5 ? "text-amber-500" : "text-green-600"}`}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleActive(p.id, !p.active)}
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-opacity ${p.active ? "bg-green-100 text-green-700 hover:opacity-70" : "bg-slate-100 text-slate-500 hover:opacity-70"}`}
                        >
                          {p.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-[#FF4B19] text-xs font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 z-10 my-4">
            <h3 className="font-black text-xl mb-6">
              {editId ? "Edit Product" : "Add New Product"}
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm mt-0.5">
                  error
                </span>
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Product Name *" colSpan>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="e.g. Bosch Brake Pads"
                />
              </Field>
              <Field label="Brand">
                <input
                  value={form.brand}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, brand: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="Bosch, Brembo…"
                />
              </Field>
              <Field label="Price (EGP) *">
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Original Price (EGP)">
                <input
                  type="number"
                  min="0"
                  value={form.original_price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, original_price: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Category *">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Condition">
                <select
                  value={form.condition}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, condition: e.target.value as any }))
                  }
                  className={inputCls}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Stock Quantity *">
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, stock: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="0"
                />
              </Field>
              <Field label="SKU">
                <input
                  value={form.sku}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sku: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="Optional"
                />
              </Field>
              <Field label="OEM Number">
                <input
                  value={form.oem_number}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, oem_number: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Image URL">
                <input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, image_url: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Description" colSpan>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className={`${inputCls} resize-none`}
                  placeholder="Describe the product…"
                />
              </Field>
              <Field label="Active" colSpan>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() =>
                      setForm((p) => ({ ...p, active: !p.active }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative ${form.active ? "bg-[#FF4B19]" : "bg-slate-300"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {form.active ? "Visible to customers" : "Hidden"}
                  </span>
                </label>
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#FF4B19] hover:bg-[#e03d10] text-white font-black py-3 rounded-xl transition disabled:opacity-60"
              >
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Product"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold py-3 rounded-xl transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30";

function Field({
  label,
  children,
  colSpan,
}: {
  label: string;
  children: React.ReactNode;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "sm:col-span-2" : ""}>
      <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
