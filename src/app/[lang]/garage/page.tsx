"use client";

import { useState } from "react";
import { useGarage, vehicleLabel } from "@/context/GarageContext";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useCarMakes, useCarModels } from "@/hooks/useCarData";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Settings,
  Wrench,
  Filter,
  History,
  Bell,
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  Toyota: "from-red-500 to-red-700",
  Hyundai: "from-blue-500 to-blue-700",
  Kia: "from-orange-500 to-orange-700",
  Chevrolet: "from-yellow-500 to-yellow-700",
  Nissan: "from-purple-500 to-purple-700",
  Honda: "from-rose-500 to-rose-700",
  BMW: "from-blue-700 to-blue-900",
  "Mercedes-Benz": "from-slate-600 to-slate-800",
};

const QUICK_TIPS = [
  { icon: <Filter className="w-5 h-5" />, key: "smartFiltering" },
  { icon: <History className="w-5 h-5" />, key: "serviceHistory" },
  { icon: <Bell className="w-5 h-5" />, key: "recallAlerts" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GaragePage() {
  const {
    vehicles,
    addVehicle,
    removeVehicle,
    updateVehicle,
    activeVehicle,
    setActiveVehicle,
  } = useGarage();
  const { t, localePath } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    brand: "",
    brandMakeId: "",
    model: "",
    year: "",
    mileage: "",
  });

  // DB-driven makes & models
  const { makes, loading: makesLoading } = useCarMakes();
  const { models: dbModels, loading: modelsLoading } = useCarModels(
    form.brandMakeId || null,
  );

  const years = Array.from({ length: 31 }, (_, i) => String(2026 - i));

  function openAdd() {
    setForm({
      brand: "",
      brandMakeId: "",
      model: "",
      year: "",
      mileage: "",
    });
    setEditId(null);
    setShowForm(true);
  }

  function handleEdit(v: (typeof vehicles)[0]) {
    const foundMake = makes.find((m) => m.name === v.brand);
    setForm({
      brand: v.brand,
      brandMakeId: foundMake?.id ?? "",
      model: v.model,
      year: String(v.year),
      mileage: String(v.mileage ?? ""),
    });
    setEditId(v.id);
    setShowForm(true);
  }

  function handleSave() {
    if (!form.brand || !form.model || !form.year) return;
    const data = {
      brand: form.brand,
      model: form.model,
      year: Number(form.year),
      mileage: form.mileage ? Number(form.mileage) : undefined,
    };
    if (editId) updateVehicle(editId, data);
    else addVehicle(data);
    setShowForm(false);
    setEditId(null);
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black">{t("garage.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("garage.subtitle")}</p>
          </div>
          <Button
            onClick={openAdd}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            {t("garage.addVehicle")}
          </Button>
        </div>

        {/* Active vehicle switcher */}
        {vehicles.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 px-0.5">
              {t("garage.activeVehicle")}
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {vehicles.map((v) => {
                const isActive = activeVehicle?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setActiveVehicle(v.id)}
                    className={`flex items-center gap-2 shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
                        : "bg-background border-border hover:border-primary/40 hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <Car className="w-3.5 h-3.5 shrink-0" />
                    <span>{vehicleLabel(v)}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Vehicles grid */}
        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-24">
              <Car className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-bold text-lg mb-1">{t("garage.noVehicles")}</p>
              <p className="text-muted-foreground text-sm mb-6">
                {t("garage.noVehiclesDesc")}
              </p>
              <Button onClick={openAdd}>{t("garage.addFirst")}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => {
              const gradient =
                BRAND_COLORS[v.brand] ?? "from-slate-500 to-slate-700";
              const isActive = activeVehicle?.id === v.id;
              return (
                <div
                  key={v.id}
                  className={`group relative bg-background rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg ${
                    isActive
                      ? "border-primary/50 shadow-md shadow-primary/10"
                      : "border-border hover:border-primary/20"
                  }`}
                >
                  {/* Color accent strip */}
                  <div
                    className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${gradient}`}
                  />

                  <div className="pl-5 pr-4 pt-4 pb-4">
                    {/* Top row: vehicle name + icon actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {isActive && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">
                              {t("garage.activeBadge")}
                            </span>
                          </div>
                        )}
                        <p className="text-lg font-black leading-tight truncate">
                          {v.brand} {v.model}
                        </p>
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">
                          {v.year}
                        </p>
                      </div>

                      {/* Icon action buttons */}
                      <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(v)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title={t("garage.edit")}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeVehicle(v.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title={t("garage.remove")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Mileage chip */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        <Settings className="w-3 h-3" />
                        {v.mileage
                          ? `${v.mileage.toLocaleString()} km`
                          : "— km"}
                      </span>
                    </div>

                    {/* Action buttons row */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs h-8 rounded-xl border-border hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                      >
                        <Link href="/services">
                          <Wrench className="w-3 h-3" />
                          {t("garage.bookService")}
                        </Link>
                      </Button>
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                          title={t("garage.setActive")}
                          onClick={() => setActiveVehicle(v.id)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick tips */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_TIPS.map((tip) => (
            <Card key={tip.key}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary">
                  {tip.icon}
                </div>
                <div>
                  <p className="font-bold text-sm">{t(`garage.${tip.key}`)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(`garage.${tip.key}Desc`)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add/Edit Vehicle Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => !open && setShowForm(false)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? t("garage.editDialog") : t("garage.addDialog")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  {t("garage.brand")}
                </label>
                <Select
                  value={form.brand}
                  onValueChange={(v) => {
                    const found = makes.find((m) => m.name === v);
                    setForm((f) => ({
                      ...f,
                      brand: v ?? "",
                      brandMakeId: found?.id ?? "",
                      model: "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        makesLoading ? "Loading…" : t("garage.selectBrand")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {makes.map((b) => (
                      <SelectItem key={b.id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  {t("garage.model")}
                </label>
                <Select
                  value={form.model}
                  onValueChange={(v) =>
                    v && setForm((f) => ({ ...f, model: v }))
                  }
                  disabled={!form.brandMakeId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        modelsLoading ? "Loading…" : t("garage.selectModel")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ...new Map(dbModels.map((m) => [m.name, m])).values(),
                    ].map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  {t("garage.year")}
                </label>
                <Select
                  value={form.year}
                  onValueChange={(v) =>
                    v && setForm((f) => ({ ...f, year: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  {t("garage.mileage")}
                </label>
                <Input
                  type="number"
                  value={form.mileage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mileage: e.target.value }))
                  }
                  placeholder="e.g. 45000"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowForm(false)}
            >
              {t("garage.cancel")}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!form.brand || !form.model || !form.year}
            >
              {editId ? t("garage.saveChanges") : t("garage.addVehicleBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
