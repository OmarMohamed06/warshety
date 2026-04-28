"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type VehicleFormRow } from "@/types/vendor-products";
import { Plus, Trash2, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

interface VehicleFitmentFormProps {
  vehicles: VehicleFormRow[];
  onChange: (vehicles: VehicleFormRow[]) => void;
}

function emptyVehicle(): VehicleFormRow {
  return {
    _key: crypto.randomUUID(),
    make: "",
    model: "",
    engine: "",
    fuel_type: "",
    power_hp: "",
    year_from: "",
    year_to: "",
  };
}

export function VehicleFitmentForm({
  vehicles,
  onChange,
}: VehicleFitmentFormProps) {
  const { t } = useLanguage();
  const [newRow, setNewRow] = useState<VehicleFormRow>(emptyVehicle);
  const [makeModelMap, setMakeModelMap] = useState<Record<string, string[]>>(
    {},
  );
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("car_makes")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .limit(1000),
      supabase
        .from("car_models")
        .select("make_id, name")
        .order("name")
        .limit(10000),
    ]).then(([{ data: makesData }, { data: modelsData }]) => {
      if (!makesData || !modelsData) return;
      const map: Record<string, string[]> = {};
      for (const mk of makesData) {
        const names = modelsData
          .filter((m) => m.make_id === mk.id)
          .map((m) => m.name);
        if (map[mk.name]) {
          map[mk.name] = [...new Set([...map[mk.name], ...names])];
        } else {
          map[mk.name] = [...new Set(names)];
        }
      }
      setMakeModelMap(map);
      setMakes([...new Set(makesData.map((m) => m.name))]);
    });
  }, []);

  useEffect(() => {
    const raw = newRow.make ? (makeModelMap[newRow.make] ?? []) : [];
    setModels([...new Set(raw)]);
  }, [newRow.make, makeModelMap]);

  function setField(field: keyof VehicleFormRow, value: string) {
    setNewRow((r) => ({
      ...r,
      [field]: value,
      ...(field === "make" ? { model: "" } : {}),
    }));
  }

  function addVehicle() {
    if (!newRow.make || !newRow.model) return;
    onChange([...vehicles, { ...newRow, _key: crypto.randomUUID() }]);
    setNewRow(emptyVehicle());
  }

  function removeVehicle(key: string) {
    onChange(vehicles.filter((v) => v._key !== key));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t("vendor.wpVehiclesTitle")}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {t("vendor.wpVehiclesSubtitle")}
        </p>
      </div>

      {/* Existing vehicles table */}
      {vehicles.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {[
                  t("vendor.wpMakeHeader"),
                  t("vendor.wpModelHeader"),
                  t("vendor.wpYearsHeader"),
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v._key} className="bg-white hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 font-medium text-slate-800">
                    {v.make}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{v.model}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {v.year_from && v.year_to
                      ? `${v.year_from}–${v.year_to}`
                      : v.year_from || v.year_to || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeVehicle(v._key)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
          <Car className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("vendor.wpNoVehicles")}</p>
        </div>
      )}

      {/* Add vehicle form */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">
          {t("vendor.wpAddVehicleTitle")}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Make dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {t("vendor.wpMakeLabel")} *
            </label>
            <select
              value={newRow.make}
              onChange={(e) => setField("make", e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("vendor.wpSelectMake")}</option>
              {makes.map((mk) => (
                <option key={mk} value={mk}>
                  {mk}
                </option>
              ))}
            </select>
          </div>
          {/* Model dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {t("vendor.wpModelLabel")} *
            </label>
            <select
              value={newRow.model}
              onChange={(e) => setField("model", e.target.value)}
              disabled={!newRow.make || models.length === 0}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{t("vendor.wpSelectModel")}</option>
              {models.map((m, i) => (
                <option key={`${m}-${i}`} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {t("vendor.wpYearFrom")}
            </label>
            <Input
              type="number"
              value={newRow.year_from}
              onChange={(e) => setField("year_from", e.target.value)}
              placeholder="2018"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {t("vendor.wpYearTo")}
            </label>
            <Input
              type="number"
              value={newRow.year_to}
              onChange={(e) => setField("year_to", e.target.value)}
              placeholder="2023"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addVehicle}
          disabled={!newRow.make || !newRow.model}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("vendor.wpAddVehicleBtn")}
        </Button>
      </div>

      {vehicles.length > 0 && (
        <p className="text-xs text-slate-400">
          {t("vendor.wpVehiclesCount", { count: vehicles.length })}
        </p>
      )}
    </div>
  );
}
