"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

interface Make {
  id: string;
  name: string;
  country_of_origin: string | null;
  is_active: boolean;
}
interface Model {
  id: string;
  make_id: string;
  name: string;
  year_from: number | null;
  year_to: number | null;
  is_active: boolean;
}

export default function VehiclesPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Makes state
  const [makes, setMakes] = useState<Make[]>([]);
  const [selectedMake, setSelectedMake] = useState<Make | null>(null);
  const [newMakeName, setNewMakeName] = useState("");
  const [newMakeOrigin, setNewMakeOrigin] = useState("");
  const [addingMake, setAddingMake] = useState(false);

  // Models state
  const [models, setModels] = useState<Model[]>([]);
  const [newModelName, setNewModelName] = useState("");
  const [newModelYearFrom, setNewModelYearFrom] = useState("");
  const [newModelYearTo, setNewModelYearTo] = useState("");
  const [addingModel, setAddingModel] = useState(false);

  const [loading, setLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function showMsg(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }

  const loadMakes = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("car_makes")
      .select("*")
      .order("name")
      .limit(1000);
    setMakes((data ?? []) as Make[]);
    setLoading(false);
  }, [supabase]);

  const loadModels = useCallback(
    async (makeId: string) => {
      setModelsLoading(true);
      const { data } = await db
        .from("car_models")
        .select("*")
        .eq("make_id", makeId)
        .order("name")
        .limit(10000);
      setModels((data ?? []) as Model[]);
      setModelsLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    loadMakes();
  }, [loadMakes]);
  useEffect(() => {
    if (selectedMake) loadModels(selectedMake.id);
    else setModels([]);
  }, [selectedMake, loadModels]);

  async function addMake() {
    if (!newMakeName.trim()) return;
    setAddingMake(true);
    const { error } = await db.from("car_makes").insert({
      name: newMakeName.trim(),
      country_of_origin: newMakeOrigin.trim() || null,
      is_active: true,
    });
    if (error) showMsg(`Error: ${error.message}`, false);
    else {
      showMsg(`${newMakeName} added.`, true);
      setNewMakeName("");
      setNewMakeOrigin("");
      loadMakes();
    }
    setAddingMake(false);
  }

  async function toggleMake(make: Make) {
    const { error } = await db
      .from("car_makes")
      .update({ is_active: !make.is_active })
      .eq("id", make.id);
    if (!error) loadMakes();
  }

  async function deleteMake(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its models?`)) return;
    await db.from("car_models").delete().eq("make_id", id);
    await db.from("car_makes").delete().eq("id", id);
    if (selectedMake?.id === id) setSelectedMake(null);
    loadMakes();
    showMsg(`${name} deleted.`, true);
  }

  async function addModel() {
    if (!newModelName.trim() || !selectedMake) return;
    setAddingModel(true);
    const { error } = await db.from("car_models").insert({
      make_id: selectedMake.id,
      name: newModelName.trim(),
      year_from: newModelYearFrom ? parseInt(newModelYearFrom) : null,
      year_to: newModelYearTo ? parseInt(newModelYearTo) : null,
      is_active: true,
    });
    if (error) showMsg(`Error: ${error.message}`, false);
    else {
      showMsg(`${newModelName} added.`, true);
      setNewModelName("");
      setNewModelYearFrom("");
      setNewModelYearTo("");
      loadModels(selectedMake.id);
    }
    setAddingModel(false);
  }

  async function toggleModel(model: Model) {
    const { error } = await db
      .from("car_models")
      .update({ is_active: !model.is_active })
      .eq("id", model.id);
    if (!error) loadModels(model.make_id);
  }

  async function deleteModel(model: Model) {
    if (!confirm(`Delete "${model.name}"?`)) return;
    await db.from("car_models").delete().eq("id", model.id);
    loadModels(model.make_id);
    showMsg(`${model.name} deleted.`, true);
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-3xl font-black">{t("admin.vehiclesTitle")}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {t("admin.vehiclesSubtitle")}
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Makes panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-black">
              {t("admin.carMakes")}{" "}
              <span className="text-slate-400 font-normal text-sm">
                ({makes.length})
              </span>
            </h2>
          </div>

          {/* Add make form */}
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                value={newMakeName}
                onChange={(e) => setNewMakeName(e.target.value)}
                placeholder={t("admin.makeName")}
                onKeyDown={(e) => e.key === "Enter" && addMake()}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
              />
              <input
                value={newMakeOrigin}
                onChange={(e) => setNewMakeOrigin(e.target.value)}
                placeholder={t("admin.country")}
                className="w-24 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
              />
              <button
                onClick={addMake}
                disabled={addingMake || !newMakeName.trim()}
                className="px-3 py-2 bg-[#FF4B19] text-white text-xs font-bold rounded-xl hover:bg-[#e04416] disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16 }}
                >
                  add
                </span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span
                className="material-symbols-outlined animate-spin text-slate-400"
                style={{ fontSize: 30 }}
              >
                progress_activity
              </span>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-[520px] overflow-y-auto">
              {makes.map((m) => (
                <div
                  key={m.id}
                  onClick={() =>
                    setSelectedMake(m.id === selectedMake?.id ? null : m)
                  }
                  className={cn(
                    "flex items-center justify-between px-5 py-3 cursor-pointer transition-colors",
                    selectedMake?.id === m.id
                      ? "bg-[#FF4B19]/5 border-l-2 border-[#FF4B19]"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/30",
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{m.name}</span>
                      {!m.is_active && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-md">
                          {t("admin.inactive")}
                        </span>
                      )}
                    </div>
                    {m.country_of_origin && (
                      <p className="text-xs text-slate-400">
                        {m.country_of_origin}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => toggleMake(m)}
                      className={cn(
                        "p-1.5 rounded-lg text-xs transition-colors",
                        m.is_active
                          ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
                      )}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        {m.is_active ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteMake(m.id, m.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Models panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-black">
              {selectedMake ? (
                <span>
                  {t("admin.modelsFor")}{" "}
                  <span className="text-[#FF4B19]">{selectedMake.name}</span>{" "}
                  <span className="text-slate-400 font-normal text-sm">
                    ({models.length})
                  </span>
                </span>
              ) : (
                `${t("admin.selectMake")} →`
              )}
            </h2>
          </div>

          {selectedMake && (
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder={t("admin.modelName")}
                  onKeyDown={(e) => e.key === "Enter" && addModel()}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                />
                <input
                  value={newModelYearFrom}
                  onChange={(e) => setNewModelYearFrom(e.target.value)}
                  placeholder={t("admin.yearFrom")}
                  type="number"
                  min={1950}
                  max={2030}
                  className="w-20 px-2 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                />
                <input
                  value={newModelYearTo}
                  onChange={(e) => setNewModelYearTo(e.target.value)}
                  placeholder={t("admin.yearTo")}
                  type="number"
                  min={1950}
                  max={2030}
                  className="w-20 px-2 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                />
                <button
                  onClick={addModel}
                  disabled={addingModel || !newModelName.trim()}
                  className="px-3 py-2 bg-[#FF4B19] text-white text-xs font-bold rounded-xl hover:bg-[#e04416] disabled:opacity-50 transition-colors"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16 }}
                  >
                    add
                  </span>
                </button>
              </div>
            </div>
          )}

          {!selectedMake ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span
                className="material-symbols-outlined mb-2"
                style={{ fontSize: 40 }}
              >
                directions_car
              </span>
              <p className="text-sm">{t("admin.selectCarMake")}</p>
            </div>
          ) : modelsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span
                className="material-symbols-outlined animate-spin text-slate-400"
                style={{ fontSize: 30 }}
              >
                progress_activity
              </span>
            </div>
          ) : models.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span
                className="material-symbols-outlined mb-2"
                style={{ fontSize: 36 }}
              >
                add_circle
              </span>
              <p className="text-sm">{t("admin.noModels")}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-[520px] overflow-y-auto">
              {models.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{m.name}</span>
                      {!m.is_active && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-md">
                          {t("admin.inactive")}
                        </span>
                      )}
                    </div>
                    {(m.year_from || m.year_to) && (
                      <p className="text-xs text-slate-400">
                        {m.year_from ?? "?"} – {m.year_to ?? "present"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleModel(m)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        m.is_active
                          ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
                      )}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        {m.is_active ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteModel(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
