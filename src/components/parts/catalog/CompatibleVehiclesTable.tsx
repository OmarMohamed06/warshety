"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DbCompatibleVehicle } from "@/types/database";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  vehicles: DbCompatibleVehicle[];
  productLabel?: string; // e.g. "Timing belt kits"
}

// ─── Group types ─────────────────────────────────────────────────────────────

interface ModelGroup {
  key: string;
  label: string;
  vehicles: DbCompatibleVehicle[];
}

interface MakeGroup {
  make: string;
  modelGroups: ModelGroup[];
}

// ─────────────────────────────────────────────────────────────────────────────

export function CompatibleVehiclesTable({ vehicles, productLabel }: Props) {
  const { t, locale } = useLanguage();
  const isAr = locale === "ar";
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [openMakes, setOpenMakes] = useState<Set<string>>(new Set());
  const [openModels, setOpenModels] = useState<Set<string>>(new Set());

  const uniqueMakes = useMemo(
    () => [...new Set(vehicles.map((v) => v.make))].sort(),
    [vehicles],
  );

  const filtered = useMemo(
    () =>
      vehicles.filter((v) => {
        if (makeFilter && v.make !== makeFilter) return false;
        if (
          modelFilter &&
          !v.model.toLowerCase().includes(modelFilter.toLowerCase())
        )
          return false;
        return true;
      }),
    [vehicles, makeFilter, modelFilter],
  );

  const groups = useMemo(() => buildGroups(filtered), [filtered]);

  const toggleMake = (make: string) =>
    setOpenMakes((prev) => {
      const next = new Set(prev);
      next.has(make) ? next.delete(make) : next.add(make);
      return next;
    });

  const toggleModel = (key: string) =>
    setOpenModels((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const reset = () => {
    setMakeFilter("");
    setModelFilter("");
  };

  if (vehicles.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-5">
        {productLabel
          ? isAr
            ? `${productLabel} لهذه المركبات:`
            : `${productLabel} for these vehicles:`
          : isAr
            ? "المركبات المتوافقة"
            : "Compatible Vehicles"}
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <select
            value={makeFilter}
            onChange={(e) => {
              setMakeFilter(e.target.value);
              setModelFilter("");
            }}
            className="h-10 pl-3 pr-9 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 appearance-none min-w-[160px] cursor-pointer"
          >
            <option value="">{t("home.make")}</option>
            {uniqueMakes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <input
          type="text"
          placeholder={isAr ? "الموديل" : "Model"}
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-[200px]"
        />

        {(makeFilter || modelFilter) && (
          <button
            onClick={reset}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isAr ? "إعادة تعيين" : "Reset"}
          </button>
        )}
      </div>

      {/* Accordion */}
      {groups.length === 0 ? (
        <div className="border border-slate-200 rounded-lg px-4 py-8 text-center text-sm text-slate-400">
          {isAr
            ? "لا توجد مركبات تطابق الفلتر."
            : "No vehicles match your filter."}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
          {groups.map((makeGroup) => {
            const makeOpen = openMakes.has(makeGroup.make);
            const groupTotal = makeGroup.modelGroups.reduce(
              (s, mg) => s + mg.vehicles.length,
              0,
            );

            return (
              <div key={makeGroup.make}>
                {/* Level 1 — Make */}
                <button
                  onClick={() => toggleMake(makeGroup.make)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left select-none"
                >
                  {makeOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                    {makeGroup.make}
                  </span>
                  <span className="ml-auto text-xs text-slate-400 tabular-nums">
                    {groupTotal}
                  </span>
                </button>

                {/* Level 2 — Model groups */}
                {makeOpen && (
                  <div className="bg-slate-50/60 border-t border-slate-100">
                    {makeGroup.modelGroups.map((modelGroup) => {
                      const modelOpen = openModels.has(modelGroup.key);
                      return (
                        <div
                          key={modelGroup.key}
                          className="border-t border-slate-100 first:border-t-0"
                        >
                          <button
                            onClick={() => toggleModel(modelGroup.key)}
                            className="w-full flex items-center gap-2 px-4 py-3 pl-10 hover:bg-slate-100 transition-colors text-left select-none"
                          >
                            {modelOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="text-sm text-slate-700 font-medium">
                              {modelGroup.label}
                            </span>
                          </button>

                          {/* Level 3 — Engine rows */}
                          {modelOpen && (
                            <div className="ml-10 mr-4 mb-2 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                              {modelGroup.vehicles.map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                  <span className="text-sm text-slate-600 leading-snug">
                                    {buildVehicleLabel(v)}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 ml-4 transition-colors" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400 text-right">
        {isAr
          ? `${filtered.length} تطبيق`
          : `${filtered.length} application${filtered.length !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGroups(vehicles: DbCompatibleVehicle[]): MakeGroup[] {
  const makeMap = new Map<string, DbCompatibleVehicle[]>();
  for (const v of vehicles) {
    if (!makeMap.has(v.make)) makeMap.set(v.make, []);
    makeMap.get(v.make)!.push(v);
  }

  const result: MakeGroup[] = [];
  for (const [make, makeVehicles] of makeMap) {
    const modelMap = new Map<string, DbCompatibleVehicle[]>();
    for (const v of makeVehicles) {
      const key = [make, v.model, v.generation ?? "", v.body_type ?? ""].join(
        "||",
      );
      if (!modelMap.has(key)) modelMap.set(key, []);
      modelMap.get(key)!.push(v);
    }

    const modelGroups: ModelGroup[] = [];
    for (const [key, mvs] of modelMap) {
      const first = mvs[0];
      const body = first.body_type ? ` ${first.body_type}` : "";
      const gen = first.generation ? ` (${first.generation})` : "";
      const label = `${make.toUpperCase()} / ${first.model}${body}${gen}`;
      modelGroups.push({ key, label, vehicles: mvs });
    }
    result.push({ make, modelGroups });
  }

  return result.sort((a, b) => a.make.localeCompare(b.make));
}

/** "1.9 JTDM (939A2000), Diesel, 110kW/150HP 1910ccm, 2005–2011" */
function buildVehicleLabel(v: DbCompatibleVehicle): string {
  const parts: string[] = [];

  if (v.engine) {
    parts.push(v.engine_code ? `${v.engine} (${v.engine_code})` : v.engine);
  } else if (v.engine_code) {
    parts.push(v.engine_code);
  }

  if (v.fuel_type) parts.push(v.fuel_type);

  const pw: string[] = [];
  if (v.power_kw != null) pw.push(`${v.power_kw}kW`);
  if (v.power_hp != null) pw.push(`${v.power_hp}HP`);
  const disp =
    v.engine_displacement_cc != null ? ` ${v.engine_displacement_cc}ccm` : "";
  if (pw.length) parts.push(pw.join("/") + disp);
  else if (disp) parts.push(disp.trim());

  if (v.year_from != null || v.year_to != null) {
    parts.push(`${v.year_from ?? "?"}–${v.year_to ?? "present"}`);
  }

  return parts.join(", ");
}
