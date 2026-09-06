"use client";

/**
 * GarageEmpty — the zero-vehicle state.
 *
 * It carries the three "what a saved vehicle buys you" points that used to
 * sit in a permanent tips strip at the bottom of the page. They belong here:
 * persuasive when the garage is empty, filler once it isn't.
 */

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useLanguage } from "@/context/LanguageContext";

const BENEFITS = [
  { icon: "filter_alt", key: "smartFiltering" },
  { icon: "history", key: "serviceHistory" },
  { icon: "notifications_active", key: "recallAlerts" },
] as const;

export function GarageEmpty({ onAdd }: { onAdd: () => void }) {
  const { t } = useLanguage();

  return (
    <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center sm:px-8 sm:py-16">
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

      <ul className="mx-auto mt-10 grid max-w-2xl gap-3 text-start sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <li key={b.key} className="rounded-2xl bg-muted/50 p-4">
            <Icon name={b.icon} size="lg" tone="accent" />
            <p className="mt-2.5 text-sm font-semibold">
              {t(`garage.${b.key}`)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t(`garage.${b.key}Desc`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
