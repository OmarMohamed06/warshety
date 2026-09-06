"use client";

/**
 * /garage — My Garage.
 *
 * Shape of the page, and why:
 *
 *   The active vehicle is what filters parts and services across the whole
 *   app, so it gets one large spotlight card instead of being one tile in a
 *   grid of equals. Everything else is a compact radio-style list you switch
 *   from. That kills the old page's duplication — a chip row of vehicles
 *   *and* a card grid, each with its own "set active" control — and gives
 *   the screen a single, obvious focal point.
 */

import { useState } from "react";
import { toast } from "sonner";

import { useGarage } from "@/hooks/useGarage";
import { useLanguage } from "@/context/LanguageContext";
import type { NewVehicleInput } from "@/context/GarageContext";
import type { Vehicle } from "@/types";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmModal } from "@/components/ui/modal";

import { GarageEmpty } from "@/components/garage/GarageEmpty";
import { VehicleFormDialog } from "@/components/garage/VehicleFormDialog";
import { VehicleRow } from "@/components/garage/VehicleRow";
import { VehicleSpotlight } from "@/components/garage/VehicleSpotlight";
import { GarageAppPromo } from "@/components/app-download/GarageAppPromo";

// ── Loading ───────────────────────────────────────────────────────────────────

/** Placeholder in the shape of the real page, so nothing jumps when data lands. */
function GarageSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-7">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3.5 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-24" />
        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card px-4 py-3">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="mt-2 h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-lg sm:w-40 sm:flex-none" />
          <Skeleton className="h-11 flex-1 rounded-lg sm:w-32 sm:flex-none" />
        </div>
      </div>
      <div className="mt-8 space-y-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GaragePage() {
  const {
    vehicles,
    activeVehicle,
    isHydrated,
    addVehicle,
    updateVehicle,
    removeVehicle,
    setActiveVehicle,
    vehicleLabel,
  } = useGarage();
  const { t, locale } = useLanguage();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Vehicle | null>(null);

  // When nothing is active yet, every vehicle belongs in the list below.
  const others = vehicles.filter((v) => v.id !== activeVehicle?.id);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setFormOpen(true);
  }

  function handleSubmit(data: NewVehicleInput) {
    if (editing) {
      updateVehicle(editing.id, data);
      toast.success(t("garage.toastUpdated"));
    } else {
      addVehicle(data);
      toast.success(t("garage.toastAdded"));
    }
    // `editing` is deliberately left alone: clearing it here would swap the
    // dialog's title and fields to the "add" variant mid close-animation.
    setFormOpen(false);
  }

  function handleActivate(vehicle: Vehicle) {
    setActiveVehicle(vehicle.id);
    toast.success(
      t("garage.toastActive", { vehicle: `${vehicle.brand} ${vehicle.model}` }),
    );
  }

  function handleConfirmRemove() {
    if (!pendingRemoval) return;
    removeVehicle(pendingRemoval.id);
    toast.success(
      t("garage.toastRemoved", {
        vehicle: `${pendingRemoval.brand} ${pendingRemoval.model}`,
      }),
    );
    setPendingRemoval(null);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        {/* ── Header ── */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("garage.title")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("garage.subtitle")}
            </p>
          </div>

          {/* Hidden while empty — the empty state already owns the one CTA. */}
          {isHydrated && vehicles.length > 0 && (
            <Button onClick={openAdd} className="h-11 gap-2 px-4 text-sm">
              <Icon name="add" size="sm" />
              {t("garage.addVehicle")}
            </Button>
          )}
        </header>

        {!isHydrated ? (
          <GarageSkeleton />
        ) : vehicles.length === 0 ? (
          <GarageEmpty onAdd={openAdd} />
        ) : (
          <div className="space-y-8">
            {activeVehicle ? (
              <VehicleSpotlight
                vehicle={activeVehicle}
                onEdit={() => openEdit(activeVehicle)}
                onRemove={() => setPendingRemoval(activeVehicle)}
              />
            ) : (
              // Vehicles saved, none selected: say so plainly instead of
              // rendering an empty hole where the spotlight belongs.
              <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <Icon name="info" size="lg" tone="accent" className="mt-px" />
                <div>
                  <p className="text-sm font-semibold">
                    {t("garage.noActiveTitle")}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("garage.noActiveDesc")}
                  </p>
                </div>
              </div>
            )}

            {others.length > 0 && (
              <section>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-sm font-bold tracking-tight">
                    {activeVehicle
                      ? t("garage.otherVehicles")
                      : t("garage.yourVehicles")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t("garage.otherVehiclesHint")}
                  </p>
                </div>

                <ul className="space-y-2">
                  {others.map((vehicle) => (
                    <VehicleRow
                      key={vehicle.id}
                      vehicle={vehicle}
                      onActivate={() => handleActivate(vehicle)}
                      onEdit={() => openEdit(vehicle)}
                      onRemove={() => setPendingRemoval(vehicle)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <GarageAppPromo locale={locale} />
      </div>

      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={handleConfirmRemove}
        title={t("garage.removeTitle")}
        description={
          pendingRemoval
            ? t("garage.removeDesc", { vehicle: vehicleLabel(pendingRemoval) })
            : undefined
        }
        confirmLabel={t("garage.removeConfirm")}
        cancelLabel={t("garage.cancel")}
        confirmVariant="danger"
      />
    </div>
  );
}
