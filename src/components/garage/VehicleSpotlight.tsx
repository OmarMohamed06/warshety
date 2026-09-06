"use client";

/**
 * VehicleSpotlight — the active vehicle, given the room it earns.
 *
 * The active vehicle is not "one of N cards": it is the filter the whole app
 * runs on. So it gets a single large surface — identity on top, attributes in
 * a hairline spec strip beneath, actions below that, and a footer line saying
 * plainly what being active actually does.
 *
 * Attributes the user hasn't filled in render as an "Add" affordance rather
 * than a dead em-dash, which turns an incomplete profile into one tap.
 */

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useLanguage } from "@/context/LanguageContext";
import type { Vehicle } from "@/types";

interface SpecProps {
  label: string;
  value?: string;
  onAdd: () => void;
  addLabel: string;
}

function Spec({ label, value, onAdd, addLabel }: SpecProps) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1">
        {value ? (
          <span className="text-sm font-semibold tabular-nums">{value}</span>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="-mx-1 rounded px-1 text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {addLabel}
            <span className="sr-only"> — {label}</span>
          </button>
        )}
      </dd>
    </div>
  );
}

export interface VehicleSpotlightProps {
  vehicle: Vehicle;
  onEdit: () => void;
  onRemove: () => void;
}

export function VehicleSpotlight({
  vehicle,
  onEdit,
  onRemove,
}: VehicleSpotlightProps) {
  const { t } = useLanguage();
  const name = `${vehicle.brand} ${vehicle.model}`;

  const subtitle = [String(vehicle.year), vehicle.trim]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-labelledby="active-vehicle-name"
      className="relative overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10"
    >
      {/* Brand wash + an oversized glyph for texture. Decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />
      <Icon
        name="directions_car"
        size="3xl"
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -end-6 text-[150px] text-primary/[0.07] select-none"
      />

      <div className="relative p-5 sm:p-7">
        {/* ── Identity ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-primary uppercase">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {t("garage.activeVehicle")}
            </p>

            <h2
              id="active-vehicle-name"
              className="mt-2.5 truncate text-2xl font-bold tracking-tight sm:text-3xl"
            >
              {name}
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {/* Manage. Always visible — hover-only controls do not exist on touch. */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={t("garage.editVehicle", { vehicle: name })}
              className="grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Icon name="edit" size="lg" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={t("garage.removeVehicle", { vehicle: name })}
              className="grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
            >
              <Icon name="delete" size="lg" />
            </button>
          </div>
        </div>

        {/* ── Spec strip ──
            gap-px over a border-coloured track draws hairlines that stay
            correct when the grid wraps and when the page flips to RTL — which
            `divide-x` does not. */}
        <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border">
          <Spec
            label={t("garage.specMileage")}
            value={
              vehicle.mileage != null
                ? `${vehicle.mileage.toLocaleString()} km`
                : undefined
            }
            onAdd={onEdit}
            addLabel={t("garage.addDetail")}
          />
          <Spec
            label={t("garage.specPlate")}
            value={vehicle.plate || undefined}
            onAdd={onEdit}
            addLabel={t("garage.addDetail")}
          />
          <Spec
            label={t("garage.specColor")}
            value={vehicle.color || undefined}
            onAdd={onEdit}
            addLabel={t("garage.addDetail")}
          />
        </dl>

        {/* ── Action ──
            One CTA, because booking is the only thing a saved vehicle
            actually feeds. There is no parts catalogue to send anyone to. */}
        <div className="mt-5">
          <Button asChild className="h-11 w-full gap-2 text-sm sm:w-auto sm:px-5">
            <Link href="/services">
              <Icon name="car_repair" size="sm" />
              {t("garage.bookService")}
            </Link>
          </Button>
        </div>
      </div>

      {/* ── What "active" means. The old page buried this in a generic tips
             strip; it belongs on the thing it describes. ── */}
      <p className="relative flex items-start gap-2 border-t border-border bg-muted/40 px-5 py-3.5 text-xs text-muted-foreground sm:px-7">
        <Icon name="edit_note" size="sm" className="mt-px shrink-0" />
        {t("garage.activeExplainer")}
      </p>
    </section>
  );
}
