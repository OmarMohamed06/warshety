"use client";

/**
 * GarageEmpty — the zero-vehicle state.
 *
 * Deliberately makes one claim, and only the claim the app can keep: a saved
 * vehicle is filled into the booking form for you. The three-up strip that
 * used to sit here promised parts filtering, per-vehicle service history and
 * recall alerts — none of which exist. An empty state that oversells is how
 * the first real screen becomes a disappointment.
 */

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useLanguage } from "@/context/LanguageContext";

export function GarageEmpty({ onAdd }: { onAdd: () => void }) {
  const { t } = useLanguage();

  return (
    <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-14 text-center sm:px-8 sm:py-20">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon name="garage" size="2xl" />
      </div>

      <h2 className="mt-5 text-xl font-bold tracking-tight">
        {t("garage.noVehicles")}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {t("garage.noVehiclesDesc")}
      </p>

      <Button onClick={onAdd} className="mt-6 h-11 gap-2 px-5 text-sm">
        <Icon name="add" size="sm" />
        {t("garage.addFirst")}
      </Button>
    </section>
  );
}
