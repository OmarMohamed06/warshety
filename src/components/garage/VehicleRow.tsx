"use client";

/**
 * VehicleRow — one of the vehicles that isn't currently active.
 *
 * The row behaves like a radio option: the whole row is a single button that
 * promotes the vehicle to active, with an unchecked-radio glyph on the
 * leading edge doing the explaining. Edit and remove sit outside that button
 * so the markup stays valid and every target is a real, always-visible
 * control — the old card revealed its actions on hover, which is invisible on
 * a phone.
 */

import { Icon } from "@/components/ui/icon";
import { useLanguage } from "@/context/LanguageContext";
import type { Vehicle } from "@/types";

export interface VehicleRowProps {
  vehicle: Vehicle;
  onActivate: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function VehicleRow({
  vehicle,
  onActivate,
  onEdit,
  onRemove,
}: VehicleRowProps) {
  const { t } = useLanguage();
  const name = `${vehicle.brand} ${vehicle.model}`;

  const meta = [
    String(vehicle.year),
    vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} km` : null,
    vehicle.plate || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="group flex items-center gap-1 rounded-2xl border border-border bg-card pe-2 transition-colors hover:border-primary/40 focus-within:border-primary/40">
      <button
        type="button"
        onClick={onActivate}
        aria-label={t("garage.switchTo", { vehicle: name })}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 text-start transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <Icon
          name="radio_button_unchecked"
          size="xl"
          className="shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
            {meta}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onEdit}
        aria-label={t("garage.editVehicle", { vehicle: name })}
        className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon name="edit" size="md" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("garage.removeVehicle", { vehicle: name })}
        className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
      >
        <Icon name="delete" size="md" />
      </button>
    </li>
  );
}
