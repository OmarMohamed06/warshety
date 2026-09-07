"use client";

/**
 * VehicleFormDialog — add or edit a vehicle.
 *
 * Two deliberate choices here:
 *
 * 1. Required identity (brand / model / year) and the one field people
 *    actually keep current (mileage) sit in the open. Plate, trim and colour
 *    live behind a native <details> disclosure — they matter for matching
 *    parts precisely, but asking for six things up front is how you get an
 *    abandoned form.
 *
 * 2. Errors appear under the field they belong to, only after a submit
 *    attempt, and carry an icon as well as colour — never colour alone.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useCarMakes, useCarModels } from "@/hooks/useCarData";
import { useLanguage } from "@/context/LanguageContext";
import type { NewVehicleInput } from "@/context/GarageContext";
import type { Vehicle } from "@/types";
import { cn } from "@/lib/utils";

// ── Field shell ───────────────────────────────────────────────────────────────

/** Control height. 44px is the touch-target floor, and these are thumb targets. */
const CONTROL = "h-11 w-full";

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-xs font-semibold text-foreground"
      >
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1 text-xs font-medium text-destructive"
        >
          <Icon name="error" size="2xs" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  brand: string;
  model: string;
  year: string;
  mileage: string;
  plate: string;
  trim: string;
  color: string;
}

function initialState(vehicle: Vehicle | null): FormState {
  return {
    brand: vehicle?.brand ?? "",
    model: vehicle?.model ?? "",
    year: vehicle ? String(vehicle.year) : "",
    mileage: vehicle?.mileage != null ? String(vehicle.mileage) : "",
    plate: vehicle?.plate ?? "",
    trim: vehicle?.trim ?? "",
    color: vehicle?.color ?? "",
  };
}

function VehicleForm({
  vehicle,
  onCancel,
  onSubmit,
}: {
  vehicle: Vehicle | null;
  onCancel: () => void;
  onSubmit: (data: NewVehicleInput) => void;
}) {
  const { t } = useLanguage();
  const isEdit = vehicle !== null;

  const [form, setForm] = useState<FormState>(() => initialState(vehicle));
  const [showErrors, setShowErrors] = useState(false);

  // Fixed for the life of this form instance. Deriving it from live state
  // would slam the disclosure shut the moment someone cleared a field in it.
  const [detailsOpen] = useState(
    () => !!(vehicle?.plate || vehicle?.trim || vehicle?.color),
  );

  const { makes, loading: makesLoading } = useCarMakes();

  // A saved vehicle stores the make *name*; the models query needs its *id*.
  // Derived rather than stored, so it simply appears once makes have loaded.
  const brandMakeId = useMemo(
    () => makes.find((m) => m.name === form.brand)?.id ?? "",
    [makes, form.brand],
  );
  const { models, loading: modelsLoading } = useCarModels(brandMakeId || null);

  const years = useMemo(() => {
    const start = new Date().getFullYear() + 1;
    return Array.from({ length: 32 }, (_, i) => String(start - i));
  }, []);

  // The catalogue lists a model name once per generation; the picker only
  // needs the name, so collapse the duplicates.
  const modelOptions = useMemo(
    () => [...new Map(models.map((m) => [m.name, m])).values()],
    [models],
  );

  const errors = {
    brand: form.brand ? "" : t("garage.required"),
    model: form.model ? "" : t("garage.required"),
    year: form.year ? "" : t("garage.required"),
  };
  const err = (key: keyof typeof errors) =>
    showErrors && errors[key] ? errors[key] : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (errors.brand || errors.model || errors.year) {
      setShowErrors(true);
      return;
    }

    // On edit, an emptied field has to reach the database as a written value:
    // updateVehicle treats `undefined` as "leave this column alone", so a
    // cleared plate would quietly come back on the next load.
    const optional = (value: string) =>
      value.trim() || (isEdit ? "" : undefined);

    onSubmit({
      brand: form.brand,
      model: form.model,
      year: Number(form.year),
      mileage: form.mileage ? Number(form.mileage) : undefined,
      plate: optional(form.plate),
      trim: optional(form.trim),
      color: optional(form.color),
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? t("garage.editDialog") : t("garage.addDialog")}
        </DialogTitle>
        <DialogDescription>
          {isEdit ? t("garage.editDialogDesc") : t("garage.addDialogDesc")}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Brand */}
          <Field
            id="vehicle-brand"
            label={t("garage.brand")}
            required
            error={err("brand")}
          >
            <Select
              value={form.brand}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  brand: (value as string) ?? "",
                  // A model from the previous brand is never valid here.
                  model: "",
                }))
              }
            >
              <SelectTrigger
                id="vehicle-brand"
                className={cn(CONTROL)}
                aria-invalid={!!err("brand")}
                aria-describedby={
                  err("brand") ? "vehicle-brand-error" : undefined
                }
              >
                <SelectValue
                  placeholder={
                    makesLoading ? t("common.loading") : t("garage.selectBrand")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {makes.map((m) => (
                  <SelectItem key={m.id} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Model */}
          <Field
            id="vehicle-model"
            label={t("garage.model")}
            required
            error={err("model")}
            hint={brandMakeId ? undefined : t("garage.selectBrandFirst")}
          >
            <Select
              value={form.model}
              onValueChange={(value) =>
                value && setForm((f) => ({ ...f, model: value as string }))
              }
              disabled={!brandMakeId}
            >
              <SelectTrigger
                id="vehicle-model"
                className={cn(CONTROL)}
                aria-invalid={!!err("model")}
                aria-describedby={
                  err("model")
                    ? "vehicle-model-error"
                    : brandMakeId
                      ? undefined
                      : "vehicle-model-hint"
                }
              >
                <SelectValue
                  placeholder={
                    modelsLoading ? t("common.loading") : t("garage.selectModel")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m.id} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Year */}
          <Field
            id="vehicle-year"
            label={t("garage.year")}
            required
            error={err("year")}
          >
            <Select
              value={form.year}
              onValueChange={(value) =>
                value && setForm((f) => ({ ...f, year: value as string }))
              }
            >
              <SelectTrigger
                id="vehicle-year"
                className={cn(CONTROL)}
                aria-invalid={!!err("year")}
                aria-describedby={err("year") ? "vehicle-year-error" : undefined}
              >
                <SelectValue placeholder={t("garage.selectYear")} />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Mileage */}
          <Field
            id="vehicle-mileage"
            label={t("garage.mileage")}
            hint={t("garage.mileageHint")}
          >
            {/* Flex siblings rather than an overlay on a padded field:
                `pe-*` does not displace Input's own `px-*` through
                tailwind-merge, so the space the suffix needs was never
                actually reserved and it could sit on the digits. */}
            <div
              className={cn(
                CONTROL,
                "flex items-center gap-2 rounded-lg border border-input px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
              )}
            >
              <input
                id="vehicle-mileage"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.mileage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mileage: e.target.value }))
                }
                placeholder="45000"
                aria-describedby="vehicle-mileage-hint"
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
              <span className="pointer-events-none shrink-0 text-xs font-semibold text-muted-foreground">
                km
              </span>
            </div>
          </Field>
        </div>

        {/* Optional details — collapsed unless the vehicle already has some. */}
        <details
          open={detailsOpen}
          className="group rounded-xl border border-border bg-muted/30"
        >
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <Icon name="tune" size="sm" tone="muted" />
            {t("garage.optionalDetails")}
            <Icon
              name="expand_more"
              size="sm"
              tone="muted"
              className="ms-auto transition-transform group-open:rotate-180"
            />
          </summary>

          <div className="border-t border-border px-3.5 pt-4 pb-4">
            <p className="mb-4 text-xs text-muted-foreground">
              {t("garage.optionalDetailsHint")}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id="vehicle-plate" label={t("garage.plate")}>
                <Input
                  id="vehicle-plate"
                  value={form.plate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, plate: e.target.value }))
                  }
                  placeholder={t("garage.platePlaceholder")}
                  className={CONTROL}
                />
              </Field>
              <Field id="vehicle-trim" label={t("garage.trim")}>
                <Input
                  id="vehicle-trim"
                  value={form.trim}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, trim: e.target.value }))
                  }
                  placeholder={t("garage.trimPlaceholder")}
                  className={CONTROL}
                />
              </Field>
              <Field id="vehicle-color" label={t("garage.color")}>
                <Input
                  id="vehicle-color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                  placeholder={t("garage.colorPlaceholder")}
                  className={CONTROL}
                />
              </Field>
            </div>
          </div>
        </details>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 sm:h-10"
            onClick={onCancel}
          >
            {t("garage.cancel")}
          </Button>
          <Button type="submit" className="h-11 sm:h-10">
            {isEdit ? t("garage.saveChanges") : t("garage.addVehicleBtn")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

// ── Dialog shell ──────────────────────────────────────────────────────────────

export interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The vehicle being edited, or null when adding a new one. */
  vehicle: Vehicle | null;
  onSubmit: (data: NewVehicleInput) => void;
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  onSubmit,
}: VehicleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        {/* Keyed so the form is a fresh instance per vehicle: state comes from
            useState initialisers instead of a reset effect. */}
        <VehicleForm
          key={vehicle?.id ?? "new"}
          vehicle={vehicle}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
