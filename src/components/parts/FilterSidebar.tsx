"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useVehicle } from "@/hooks";
import { useLanguage } from "@/context/LanguageContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Car, Star, RotateCcw } from "lucide-react";

export interface FilterState {
  condition: string;
  priceMin: string;
  priceMax: string;
  inStockOnly: boolean;
  minRating: number;
  /** When true, only parts compatible with the active vehicle are shown */
  compatibleOnly: boolean;
  /** Filter by part type: 'all' | 'oem' | 'aftermarket' | 'original' */
  partType: string;
}

export default function FilterSidebar({
  onFilterChange,
}: {
  onFilterChange?: (f: FilterState) => void;
}) {
  const { activeVehicle, hasActiveVehicle, compatibilityString } = useVehicle();
  const { t, localePath } = useLanguage();

  const [filters, setFilters] = useState<FilterState>({
    condition: "all",
    priceMin: "",
    priceMax: "",
    inStockOnly: false,
    minRating: 0,
    compatibleOnly: hasActiveVehicle,
    partType: "all",
  });

  const update = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    onFilterChange?.(next);
  };

  const handleClearAll = () => {
    const reset: FilterState = {
      condition: "all",
      priceMin: "",
      priceMax: "",
      inStockOnly: false,
      minRating: 0,
      compatibleOnly: false,
      partType: "all",
    };
    setFilters(reset);
    onFilterChange?.(reset);
  };

  return (
    <aside className="w-full space-y-4">
      {/* Vehicle Compatibility */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {t("filterSidebar.vehicleCompatibility")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {hasActiveVehicle && activeVehicle ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/20 rounded-lg p-3">
                <Car className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary leading-tight">
                    {activeVehicle.year} {activeVehicle.brand}{" "}
                    {activeVehicle.model}
                  </p>
                  {activeVehicle.trim && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {activeVehicle.trim}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="compat-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  {t("filterSidebar.compatibleOnly")}
                </label>
                <Switch
                  id="compat-toggle"
                  checked={filters.compatibleOnly}
                  onCheckedChange={(v) => update({ compatibleOnly: v })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full"
                asChild
              >
                <Link href={localePath("/garage")}>
                  {t("filterSidebar.changeVehicle")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("filterSidebar.selectVehicleHint")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                asChild
              >
                <Link href={localePath("/garage")}>
                  {t("filterSidebar.addMyVehicle")}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Condition */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("filterSidebar.condition")}
          </p>
          <RadioGroup
            value={filters.condition}
            onValueChange={(v) => update({ condition: v })}
            className="space-y-2"
          >
            {["all", "new", "used", "refurbished"].map((opt) => (
              <div key={opt} className="flex items-center gap-2.5">
                <RadioGroupItem
                  value={opt}
                  id={`cond-${opt}`}
                  className="text-primary"
                />
                <label
                  htmlFor={`cond-${opt}`}
                  className="text-sm cursor-pointer capitalize"
                >
                  {opt === "all"
                    ? t("filterSidebar.allConditions")
                    : opt === "new"
                      ? t("filterSidebar.condNew")
                      : opt === "used"
                        ? t("filterSidebar.condUsed")
                        : t("filterSidebar.condRefurbished")}
                </label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("filterSidebar.priceRange")}
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("filterSidebar.pricePlaceholderMin")}
              value={filters.priceMin}
              onChange={(e) => update({ priceMin: e.target.value })}
              className="h-8 text-sm"
            />
            <Input
              type="number"
              placeholder={t("filterSidebar.pricePlaceholderMax")}
              value={filters.priceMax}
              onChange={(e) => update({ priceMax: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("filterSidebar.minRating")}
          </p>
          <RadioGroup
            value={String(filters.minRating)}
            onValueChange={(v) => update({ minRating: Number(v) })}
            className="space-y-2"
          >
            {[4, 3, 2, 0].map((r) => (
              <div key={r} className="flex items-center gap-2.5">
                <RadioGroupItem value={String(r)} id={`rat-${r}`} />
                <label
                  htmlFor={`rat-${r}`}
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  {r > 0 ? (
                    <>
                      {r}+{" "}
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </>
                  ) : (
                    t("filterSidebar.allRatings")
                  )}
                </label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Part Type */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("filterSidebar.partType")}
          </p>
          <RadioGroup
            value={filters.partType}
            onValueChange={(v) => update({ partType: v })}
            className="space-y-2"
          >
            {[
              { value: "all", label: t("filterSidebar.allTypes") },
              { value: "oem", label: "OEM" },
              { value: "original", label: "Original" },
              { value: "aftermarket", label: "Aftermarket" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center gap-2.5">
                <RadioGroupItem value={opt.value} id={`pt-${opt.value}`} />
                <label
                  htmlFor={`pt-${opt.value}`}
                  className="text-sm cursor-pointer"
                >
                  {opt.label}
                </label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* In Stock */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="instock"
              checked={filters.inStockOnly}
              onCheckedChange={(v) => update({ inStockOnly: v === true })}
            />
            <label
              htmlFor="instock"
              className="text-sm font-semibold cursor-pointer"
            >
              {t("filterSidebar.inStockOnly")}
            </label>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={handleClearAll}>
        <RotateCcw className="h-4 w-4 mr-2" />{" "}
        {t("filterSidebar.clearAllFilters")}
      </Button>
    </aside>
  );
}
