"use client";

import { useState } from "react";
import Link from "next/link";
import { useGarage, vehicleLabel } from "@/context/GarageContext";
import { Select } from "@/components/ui";

const BRANDS = [
  "Toyota",
  "Hyundai",
  "Kia",
  "Chevrolet",
  "Nissan",
  "Honda",
  "Mitsubishi",
  "Ford",
  "BMW",
  "Mercedes-Benz",
  "Volkswagen",
  "Skoda",
  "Peugeot",
  "Renault",
  "Fiat",
  "Opel",
];
const BRAND_MODELS: Record<string, string[]> = {
  Toyota: [
    "Corolla",
    "Camry",
    "Yaris",
    "Fortuner",
    "Land Cruiser",
    "RAV4",
    "Hilux",
  ],
  Hyundai: [
    "Elantra",
    "Tucson",
    "Sonata",
    "Santa Fe",
    "i10",
    "i20",
    "i30",
    "Creta",
  ],
  Kia: ["Cerato", "Sportage", "Sorento", "Picanto", "Stonic"],
  Chevrolet: ["Spark", "Optra", "Cruze", "Captiva", "Aveo"],
};

const BRAND_COLORS: Record<string, string> = {
  Toyota: "bg-red-500",
  Hyundai: "bg-blue-500",
  Kia: "bg-orange-500",
  Chevrolet: "bg-yellow-500",
  Nissan: "bg-purple-500",
  Honda: "bg-rose-500",
  BMW: "bg-blue-700",
  "Mercedes-Benz": "bg-slate-700",
};

export default function GaragePage() {
  const {
    vehicles,
    addVehicle,
    removeVehicle,
    updateVehicle,
    activeVehicle,
    setActiveVehicle,
  } = useGarage();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: "",
    trim: "",
    engine: "",
    color: "",
    plate: "",
    mileage: "",
  });

  const years = Array.from({ length: 31 }, (_, i) => 2026 - i);

  function handleDelete(id: string) {
    removeVehicle(id);
  }

  function handleEdit(v: (typeof vehicles)[0]) {
    setForm({
      brand: v.brand,
      model: v.model,
      year: String(v.year),
      trim: v.trim ?? "",
      engine: v.engine ?? "",
      color: v.color ?? "",
      plate: v.plate ?? "",
      mileage: String(v.mileage ?? ""),
    });
    setEditId(v.id);
    setShowForm(true);
  }

  function handleSave() {
    if (!form.brand || !form.model || !form.year) return;
    if (editId) {
      updateVehicle(editId, {
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        trim: form.trim || undefined,
        engine: form.engine || undefined,
        color: form.color || undefined,
        plate: form.plate || undefined,
        mileage: form.mileage ? Number(form.mileage) : undefined,
      });
    } else {
      addVehicle({
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        trim: form.trim || undefined,
        engine: form.engine || undefined,
        color: form.color || undefined,
        plate: form.plate || undefined,
        mileage: form.mileage ? Number(form.mileage) : undefined,
      });
    }
    setForm({
      brand: "",
      model: "",
      year: "",
      trim: "",
      engine: "",
      color: "",
      plate: "",
      mileage: "",
    });
    setShowForm(false);
    setEditId(null);
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black">My Garage</h1>
            <p className="text-slate-500 mt-1">
              Manage your vehicles and find compatible parts instantly.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditId(null);
              setForm({
                brand: "",
                model: "",
                year: "",
                trim: "",
                engine: "",
                color: "",
                plate: "",
                mileage: "",
              });
            }}
            className="px-5 py-3 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[#FF4B19]/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Vehicle
          </button>
        </div>

        {/* Active vehicle selector */}
        {vehicles.length > 0 && (
          <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-[#FF4B19]/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[#FF4B19]">
                  directions_car
                </span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Active Vehicle
                </p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {activeVehicle
                    ? vehicleLabel(activeVehicle)
                    : "None selected"}
                </p>
              </div>
            </div>
            <div className="sm:ml-auto w-full sm:w-72">
              <Select
                placeholder="Select a vehicle…"
                value={activeVehicle?.id ?? ""}
                onChange={(e) =>
                  e.target.value && setActiveVehicle(e.target.value)
                }
                options={vehicles.map((v) => ({
                  value: v.id,
                  label: vehicleLabel(v),
                }))}
              />
            </div>
          </div>
        )}

        {/* Vehicles grid */}
        {vehicles.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <span className="material-symbols-outlined text-6xl text-slate-200 block mb-4">
              directions_car
            </span>
            <p className="font-bold text-lg mb-1">No vehicles yet</p>
            <p className="text-slate-400 text-sm mb-6">
              Add your first vehicle to find compatible parts and services.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {vehicles.map((v) => {
              const colorClass = BRAND_COLORS[v.brand] ?? "bg-slate-500";
              const isActive = activeVehicle?.id === v.id;
              return (
                <div
                  key={v.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    isActive
                      ? "border-[#FF4B19]/40 ring-2 ring-[#FF4B19]/20"
                      : "border-slate-100 dark:border-slate-700"
                  }`}
                >
                  {/* Car color header */}
                  <div
                    className={`${colorClass} h-20 relative flex items-end p-4`}
                  >
                    <span className="material-symbols-outlined text-5xl text-white/30 absolute right-4 top-2">
                      directions_car
                    </span>
                    {isActive && (
                      <span className="absolute top-3 left-4 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span>
                        Active
                      </span>
                    )}
                    <div className="text-white">
                      <p className="font-black text-lg">
                        {v.year} {v.brand} {v.model}
                      </p>
                      <p className="text-xs text-white/70">
                        {v.trim} · {v.engine}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2">
                        <p className="text-xs text-slate-400">Plate</p>
                        <p className="text-sm font-bold">{v.plate || "—"}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2">
                        <p className="text-xs text-slate-400">Color</p>
                        <p className="text-sm font-bold">{v.color}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2">
                        <p className="text-xs text-slate-400">Km</p>
                        <p className="text-sm font-bold">
                          {v.mileage ? v.mileage.toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/parts?vehicle=${v.id}`}
                        className="py-2 text-center text-sm font-bold text-[#FF4B19] border border-[#FF4B19]/20 bg-[#FF4B19]/5 rounded-xl hover:bg-[#FF4B19]/10 transition-all flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">
                          settings
                        </span>
                        Find Parts
                      </Link>
                      <Link
                        href="/services"
                        className="py-2 text-center text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-400 transition-all flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">
                          build
                        </span>
                        Book Service
                      </Link>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => setActiveVehicle(v.id)}
                        className="w-full py-2 text-sm font-bold text-[#FF4B19] border border-[#FF4B19]/30 rounded-xl hover:bg-[#FF4B19]/5 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">
                          check_circle
                        </span>
                        Set as Active Vehicle
                      </button>
                    )}

                    <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => handleEdit(v)}
                        className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">
                          edit
                        </span>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="flex-1 py-2 text-xs font-bold text-red-400 hover:text-red-600 flex items-center justify-center gap-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick tips */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "filter_alt",
              title: "Smart Filtering",
              desc: "All parts auto-filter to match your saved vehicles.",
            },
            {
              icon: "history",
              title: "Service History",
              desc: "Track maintenance history for each vehicle.",
            },
            {
              icon: "notifications",
              title: "Recall Alerts",
              desc: "Get notified about recalls or service bulletins.",
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex items-start gap-4"
            >
              <div className="w-10 h-10 bg-[#FF4B19]/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#FF4B19]">
                  {tip.icon}
                </span>
              </div>
              <div>
                <p className="font-bold text-sm">{tip.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Vehicle Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-xl">
                {editId ? "Edit Vehicle" : "Add New Vehicle"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Brand *
                  </label>
                  <select
                    value={form.brand}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        brand: e.target.value,
                        model: "",
                      }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                  >
                    <option value="">Select brand</option>
                    {BRANDS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Model *
                  </label>
                  <select
                    value={form.model}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, model: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                  >
                    <option value="">Select model</option>
                    {(BRAND_MODELS[form.brand] ?? []).map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Year *
                  </label>
                  <select
                    value={form.year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, year: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                  >
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Trim
                  </label>
                  <input
                    value={form.trim}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trim: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                    placeholder="e.g. GLi"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Engine
                  </label>
                  <input
                    value={form.engine}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, engine: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                    placeholder="1.6L"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Color
                  </label>
                  <input
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                    placeholder="e.g. White"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Plate Number
                  </label>
                  <input
                    value={form.plate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, plate: e.target.value }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                    placeholder="أ ب ج 123"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Current Mileage (km)
                </label>
                <input
                  type="number"
                  value={form.mileage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mileage: e.target.value }))
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                  placeholder="e.g. 45000"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-slate-400 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-[#FF4B19] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
              >
                {editId ? "Save Changes" : "Add Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
