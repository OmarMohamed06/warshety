"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useVehicle } from "@/hooks";

export interface FilterState {
  condition: string;
  priceMin: string;
  priceMax: string;
  inStockOnly: boolean;
  minRating: number;
  /** When true, only parts compatible with the active vehicle are shown */
  compatibleOnly: boolean;
}

export default function FilterSidebar({
  onFilterChange,
}: {
  onFilterChange?: (f: FilterState) => void;
}) {
  const { activeVehicle, hasActiveVehicle, compatibilityString } = useVehicle();

  const [filters, setFilters] = useState<FilterState>({
    condition: "all",
    priceMin: "",
    priceMax: "",
    inStockOnly: false,
    minRating: 0,
    compatibleOnly: hasActiveVehicle, // on by default when a vehicle is active
  });

  const update = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    onFilterChange?.(next);
  };

  const handleClearAll = () => {
    const reset: FilterState = {
      condition: "all",
      priceMin: "",
      priceMax: "",
      inStockOnly: false,
      minRating: 0,
      compatibleOnly: false,
    };
    setFilters(reset);
    onFilterChange?.(reset);
  };

  return (
    <aside className="w-full space-y-6">
      {/* ── Vehicle Compatibility ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
        <h4 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[#FF4B19]"
            style={{ fontSize: "18px" }}
          >
            directions_car
          </span>
          Filter by Vehicle
        </h4>

        {hasActiveVehicle && activeVehicle ? (
          /* Active vehicle chip */
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-[#FF4B19]/6 border border-[#FF4B19]/20 rounded-xl p-3">
              <span
                className="material-symbols-outlined text-[#FF4B19] mt-0.5 shrink-0"
                style={{ fontSize: "18px" }}
              >
                check_circle
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[#FF4B19] leading-tight">
                  {activeVehicle.year} {activeVehicle.brand}{" "}
                  {activeVehicle.model}
                </p>
                {activeVehicle.trim && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {activeVehicle.trim}
                  </p>
                )}
                {activeVehicle.engineCode && (
                  <p className="text-[11px] text-slate-500">
                    Engine: {activeVehicle.engineCode}
                  </p>
                )}
              </div>
            </div>

            {/* Compatible only toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() =>
                  update({ compatibleOnly: !filters.compatibleOnly })
                }
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                  filters.compatibleOnly
                    ? "bg-[#FF4B19]"
                    : "bg-slate-200 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    filters.compatibleOnly ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                  Compatible parts only
                </p>
                <p className="text-[10px] text-slate-400">
                  {filters.compatibleOnly
                    ? `Showing parts for ${compatibilityString}`
                    : "Showing all parts"}
                </p>
              </div>
            </label>

            <Link
              href="/garage"
              className="text-xs font-bold text-slate-400 hover:text-[#FF4B19] transition-colors flex items-center gap-1"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "14px" }}
              >
                swap_horiz
              </span>
              Change vehicle
            </Link>
          </div>
        ) : (
          /* No active vehicle — prompt to set one */
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3">
              <span
                className="material-symbols-outlined text-amber-500 shrink-0"
                style={{ fontSize: "18px" }}
              >
                info
              </span>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Select a vehicle to filter compatible parts only
              </p>
            </div>
            <Link
              href="/garage"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:border-[#FF4B19] hover:text-[#FF4B19] transition-all"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                add
              </span>
              Add my vehicle
            </Link>
          </div>
        )}
      </div>

      {/* ── Condition ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
        <h4 className="font-bold text-sm uppercase tracking-wider mb-4">
          Condition
        </h4>
        <div className="space-y-2">
          {[
            { value: "all", label: "All" },
            { value: "new", label: "New" },
            { value: "used", label: "Used" },
            { value: "refurbished", label: "Refurbished" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="condition"
                value={opt.value}
                checked={filters.condition === opt.value}
                onChange={() => update({ condition: opt.value })}
                className="accent-[#FF4B19]"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Price range ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
        <h4 className="font-bold text-sm uppercase tracking-wider mb-4">
          Price Range (EGP)
        </h4>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceMin}
            onChange={(e) => update({ priceMin: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.priceMax}
            onChange={(e) => update({ priceMax: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
          />
        </div>
      </div>

      {/* ── Rating ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
        <h4 className="font-bold text-sm uppercase tracking-wider mb-4">
          Min Rating
        </h4>
        <div className="space-y-2">
          {[4, 3, 2, 0].map((r) => (
            <label key={r} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={filters.minRating === r}
                onChange={() => update({ minRating: r })}
                className="accent-[#FF4B19]"
              />
              <span className="text-sm flex items-center gap-1">
                {r > 0 ? (
                  <>
                    {r}+{" "}
                    <span
                      className="material-symbols-outlined text-[#FF4B19] text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </>
                ) : (
                  "All ratings"
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── In stock ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => update({ inStockOnly: e.target.checked })}
            className="accent-[#FF4B19] w-4 h-4"
          />
          <span className="text-sm font-semibold">In Stock Only</span>
        </label>
      </div>

      <button
        onClick={handleClearAll}
        className="w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-bold hover:border-[#FF4B19] hover:text-[#FF4B19] transition-all"
      >
        Clear All Filters
      </button>
    </aside>
  );
}
