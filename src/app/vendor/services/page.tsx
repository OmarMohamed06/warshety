"use client";

import { useEffect, useState, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { DbService } from "@/types/database";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "",
  active: true,
};

export default function VendorServicesPage() {
  const { vendor, vendorType } = useAuth();
  const supabase = createClient();

  const [services, setServices] = useState<DbService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at");
    setServices((data ?? []) as DbService[]);
    setLoading(false);
  }, [vendor, supabase]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
    setError(null);
  };
  const openEdit = (s: DbService) => {
    setForm({
      name: s.name,
      description: s.description ?? "",
      price: String(s.price),
      duration_minutes: s.duration_minutes ? String(s.duration_minutes) : "",
      active: s.active,
    });
    setEditId(s.id);
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!vendor) return;
    if (!form.name || !form.price) {
      setError("Name and price are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      vendor_id: vendor.id,
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      duration_minutes: form.duration_minutes
        ? parseInt(form.duration_minutes)
        : null,
      active: form.active,
    };
    let err;
    if (editId) {
      const { error: e } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editId);
      err = e;
    } else {
      const { error: e } = await supabase.from("services").insert(payload);
      err = e;
    }
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowForm(false);
    loadServices();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("services").update({ active }).eq("id", id);
    loadServices();
  };

  const deleteService = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    await supabase.from("services").delete().eq("id", id);
    loadServices();
  };

  if (vendorType && vendorType !== "service_center") {
    return (
      <VendorLayout>
        <div className="text-center py-20 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-4 block">
            block
          </span>
          <p className="font-semibold">
            Service management is only for Service Centers.
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
            <h1 className="text-2xl font-black">Services</h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage the services your workshop offers.
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-[#FF4B19] hover:bg-[#e03d10] text-white font-black px-5 py-2.5 rounded-xl transition shadow-lg shadow-[#FF4B19]/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Service
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading…</div>
        ) : services.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              home_repair_service
            </span>
            <p className="font-black text-lg mb-2">No services yet</p>
            <p className="text-slate-500 text-sm mb-6">
              Add the services your workshop provides.
            </p>
            <button
              onClick={openNew}
              className="bg-[#FF4B19] text-white font-black px-6 py-3 rounded-xl hover:bg-[#e03d10] transition"
            >
              Add First Service
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <div
                key={s.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border ${s.active ? "border-slate-100 dark:border-slate-800" : "border-slate-200 dark:border-slate-700 opacity-60"} p-5`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-[#FF4B19]/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#FF4B19] text-[20px]">
                      home_repair_service
                    </span>
                  </div>
                  <button
                    onClick={() => toggleActive(s.id, !s.active)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${s.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {s.active ? "Active" : "Inactive"}
                  </button>
                </div>
                <h3 className="font-black mb-1">{s.name}</h3>
                {s.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                    {s.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-[#FF4B19]">
                      EGP {s.price.toLocaleString()}
                    </p>
                    {s.duration_minutes && (
                      <p className="text-xs text-slate-400">
                        {s.duration_minutes} min
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs text-slate-500 hover:text-[#FF4B19] transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => deleteService(s.id)}
                      className="text-xs text-slate-500 hover:text-red-500 transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10">
            <h3 className="font-black text-xl mb-6">
              {editId ? "Edit Service" : "Add New Service"}
            </h3>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <Field label="Service Name *">
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className={inp}
                  placeholder="e.g. Full Oil Change & Filter"
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className={`${inp} resize-none`}
                  placeholder="What's included…"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (EGP) *">
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, price: e.target.value }))
                    }
                    className={inp}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Duration (min)">
                  <input
                    type="number"
                    min="0"
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        duration_minutes: e.target.value,
                      }))
                    }
                    className={inp}
                    placeholder="60"
                  />
                </Field>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm((p) => ({ ...p, active: !p.active }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? "bg-[#FF4B19]" : "bg-slate-300"}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </div>
                <span className="text-sm">
                  {form.active ? "Active — visible to customers" : "Hidden"}
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#FF4B19] hover:bg-[#e03d10] text-white font-black py-3 rounded-xl transition disabled:opacity-60"
              >
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Service"}
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

const inp =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30";
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
