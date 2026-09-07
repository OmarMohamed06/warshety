"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import NextImage from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { tGov, tArea } from "@/lib/locationData";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useGarage } from "@/hooks/useGarage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";
import { fetchDistances } from "@/services/nearbyService";
import {
  formatDistanceParts,
  hasUsableCoordinates,
  buildDirectionsUrl,
} from "@/lib/geo";
import { Skeleton } from "@/components/ui/skeleton";
import { CenterMarkerCard } from "./CenterMarkerCard";

// Leaflet reaches for `window` as it loads, so the map is client-only and is
// not downloaded at all until the visitor switches to the map view.
const CenterMap = dynamic(() => import("./CenterMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

/**
 * Field shells. The icon is a flex sibling of the control, never an absolute
 * overlay on a padded one.
 *
 * The overlay approach needs the control's `padding-inline-start` to reserve
 * exactly the space the glyph occupies, and that reservation is not reliable:
 * `pl-*` displaces a base `px-*` through tailwind-merge, but `ps-*` does not —
 * both survive and the winner is decided by stylesheet order. When `px-*` won,
 * the icon sat on top of the text. As flex siblings there is nothing to
 * coordinate, and it works the same in both writing directions.
 */
const FIELD_SHELL =
  "flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50";
const BARE_CONTROL =
  "h-full min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent text-sm outline-none";

/** Native select in a flex shell, with the chevron as a sibling. */
function SelectShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(FIELD_SHELL, className)}>
      {children}
      <Icon
        name="expand_more"
        size="md"
        className="pointer-events-none shrink-0 text-muted-foreground"
      />
    </div>
  );
}

type SortOption = "relevance" | "rating" | "nearest";
type ViewMode = "list" | "map";

export interface ServiceCenterDisplay {
  id: string;
  slug: string | null;
  name: string;
  name_ar?: string | null;
  badge: string | null;
  governorate: string;
  district?: string;
  /** Street address, when the center has given one. */
  address?: string | null;
  /** Operator-supplied Google Maps link, used for directions. */
  mapsLink?: string | null;
  latitude: number | null;
  longitude: number | null;
  featured: boolean;
  featuredPriority: number;
  rating: number;
  reviewCount: number;
  completedBookings: number;
  specializations: string[];
  services: string[];
  availableToday: boolean;
  image: string | null;
  /** Active branch locations (city + governorate) for filter matching */
  branchLocations: Array<{ city: string | null; governorate: string | null }>;
}

type FilterKey = "available" | "topRated";

const EGYPT_DISTRICTS: Record<string, string[]> = {
  Cairo: [
    "Nasr City",
    "Heliopolis",
    "Maadi",
    "New Cairo",
    "Zamalek",
    "Downtown Cairo",
    "Shubra",
    "Ain Shams",
    "Matareya",
    "Helwan",
    "El Salam",
    "El Marg",
    "Rehab City",
    "Sheraton",
    "Garden City",
    "Manial",
    "Abbassia",
    "Mokattam",
    "Badr City",
    "Shorouk City",
    "El Obour City",
  ],
  Giza: [
    "6th of October",
    "Sheikh Zayed",
    "Haram",
    "Agouza",
    "Faisal",
    "Mohandessin",
    "Dokki",
    "Boulaq El Dakrour",
    "Imbaba",
    "Omraneya",
    "Hadayek El Ahram",
  ],
  Alexandria: [
    "Miami",
    "San Stefano",
    "Smouha",
    "Roushdy",
    "Sidi Bishr",
    "Sporting",
    "Montazah",
    "Maamoura",
    "Gleem",
    "Azarita",
    "El Raml",
  ],
  "New Cairo": ["5th Settlement", "Third Settlement", "Rehab City", "Madinaty"],
  "6th of October": ["Dream Land", "Juhayna", "Hadayek October"],
};

interface Props {
  initialCenters: ServiceCenterDisplay[];
}

export default function ServiceCentersClient({ initialCenters }: Props) {
  const { t, locale } = useLanguage();
  const isAr = locale === "ar";
  const searchParams = useSearchParams();
  const [searchMode, setSearchMode] = useState<"service" | "center">("service");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("service") ?? "",
  );

  // Keep query in sync if the user navigates back with a different param
  useEffect(() => {
    const svc = searchParams.get("service");
    if (svc) {
      setSearchQuery(svc);
      setSearchMode("service");
    }
  }, [searchParams]);

  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [allMakes, setAllMakes] = useState<string[]>([]);

  // Fetch all car makes from DB on mount
  useEffect(() => {
    const supabase = createClient();
    (supabase as any)
      .from("car_makes")
      .select("name")
      .order("name")
      .limit(1000)
      .then(({ data }: { data: { name: string }[] | null }) => {
        if (data) setAllMakes(data.map((m) => m.name));
      });
  }, []);

  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  // Advanced filters are a lot of chrome on a phone — collapsed there by
  // default, always open from lg up.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Distance from the visitor ─────────────────────────────────────────────
  const geo = useGeolocation();
  const [distances, setDistances] = useState<Map<string, number>>(new Map());

  /** Ask for location, then measure. Both steps hang off the click. */
  const useMyLocation = useCallback(async () => {
    const coords = await geo.request();
    if (!coords) return;
    const { byId } = await fetchDistances(coords, initialCenters);
    setDistances(byId);
    setSortOption("nearest");
  }, [geo, initialCenters]);

  const hasDistances = distances.size > 0;

  const { vehicles, vehicleLabel } = useGarage();

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Derive unique governorates from all centers + their branches
  const availableGovernorates = Array.from(
    new Set(
      initialCenters.flatMap((sc) => [
        sc.governorate,
        ...sc.branchLocations.map((b) => b.governorate ?? ""),
      ]),
    ),
  )
    .filter(Boolean)
    .sort();

  // Districts: merge hardcoded list + any district values from actual data
  // Exclude values that are themselves governorate names
  const GOVERNORATE_NAMES = new Set(
    ["Cairo", "Giza", "Alexandria", "New Cairo", "6th of October"].map((g) =>
      g.toLowerCase(),
    ),
  );
  const availableDistricts = selectedGovernorate
    ? Array.from(
        new Set([
          ...(EGYPT_DISTRICTS[selectedGovernorate] ?? []),
          ...initialCenters
            .filter(
              (sc) =>
                sc.governorate.toLowerCase() ===
                selectedGovernorate.toLowerCase(),
            )
            .flatMap((sc) => [
              sc.district ?? "",
              ...sc.branchLocations
                .filter(
                  (b) =>
                    b.governorate?.toLowerCase() ===
                    selectedGovernorate.toLowerCase(),
                )
                .map((b) => b.city ?? ""),
            ])
            .filter(
              (v) => Boolean(v) && !GOVERNORATE_NAMES.has(v.toLowerCase()),
            ),
        ]),
      ).sort()
    : [];

  const filtered = initialCenters
    .filter((sc) => {
      if (activeFilters.has("available") && !sc.availableToday) return false;
      if (activeFilters.has("topRated") && sc.rating < 4.8) return false;

      if (selectedGovernorate) {
        const govLower = selectedGovernorate.toLowerCase();
        const mainMatches = sc.governorate.toLowerCase() === govLower;
        const branchMatches = sc.branchLocations.some(
          (b) =>
            b.governorate?.toLowerCase() === govLower ||
            b.city?.toLowerCase() === govLower,
        );
        if (!mainMatches && !branchMatches) return false;
      }

      if (selectedDistrict) {
        const distLower = selectedDistrict.toLowerCase();
        const mainMatches = (sc.district ?? "").toLowerCase() === distLower;
        const branchMatches = sc.branchLocations.some(
          (b) => b.city?.toLowerCase() === distLower,
        );
        if (!mainMatches && !branchMatches) return false;
      }

      if (selectedMake) {
        const specs = sc.specializations.map((s) => s.toLowerCase());
        if (
          !specs.includes("all makes") &&
          !specs.some((s) => s.includes(selectedMake.toLowerCase()))
        )
          return false;
      }

      if (selectedVehicleId) {
        const v = vehicles.find((v) => v.id === selectedVehicleId);
        if (v) {
          const specs = sc.specializations.map((s) => s.toLowerCase());
          if (
            !specs.includes("all makes") &&
            !specs.some((s) => s.includes(v.brand.toLowerCase()))
          )
            return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const displayName = (
          isAr ? sc.name_ar || sc.name : sc.name
        ).toLowerCase();
        const nameMatch = displayName.includes(q);
        const locationMatch =
          sc.governorate.toLowerCase().includes(q) ||
          (sc.district ?? "").toLowerCase().includes(q);
        const serviceMatch = sc.services.some((s) =>
          s.toLowerCase().includes(q),
        );
        if (searchMode === "service" && !serviceMatch && !nameMatch)
          return false;
        if (searchMode === "center" && !nameMatch && !locationMatch)
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sorting by distance is the one case where "featured" must not win:
      // the visitor asked for closest first, so answer that question.
      if (sortOption === "nearest") {
        const da = distances.get(a.id);
        const db = distances.get(b.id);
        // Centers we cannot place sink to the bottom rather than disappearing.
        if (da === undefined && db === undefined) return b.rating - a.rating;
        if (da === undefined) return 1;
        if (db === undefined) return -1;
        return da - db;
      }

      // 1. Featured first (always)
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.featuredPriority !== b.featuredPriority)
        return b.featuredPriority - a.featuredPriority;

      // 2. User-selected sort
      if (sortOption === "rating") {
        return b.rating - a.rating;
      }

      // Default relevance: rating
      return b.rating - a.rating;
    });

  // ── Derived helpers ───────────────────────────────────────────────────────

  const displayName = useCallback(
    (sc: ServiceCenterDisplay) => (isAr ? sc.name_ar || sc.name : sc.name),
    [isAr],
  );

  const locationLine = useCallback(
    (sc: ServiceCenterDisplay): string | null => {
      if (sc.address) return sc.address;
      const parts = [sc.district, sc.governorate].filter(Boolean);
      return parts.length ? parts.join(" · ") : null;
    },
    [],
  );

  const distanceLabel = useCallback(
    (id: string): string | null => {
      const km = distances.get(id);
      if (km === undefined) return null;
      const { value, unit } = formatDistanceParts(km);
      return t("nearMe.distanceAway", {
        distance: `${value} ${t(`nearMe.unit.${unit}`)}`,
      });
    },
    [distances, t],
  );

  /** Only centers we can actually place get a pin. */
  const mappable = useMemo(
    () => filtered.filter((sc) => hasUsableCoordinates(sc.latitude, sc.longitude)),
    [filtered],
  );

  const selectedCenter = useMemo(
    () => filtered.find((sc) => sc.id === selectedMapId) ?? null,
    [filtered, selectedMapId],
  );

  // Esc closes the marker card.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedMapId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** How many filters are set — shown on the mobile Filters button. Counts the
   *  two quick toggles too, now that they live in the same panel. */
  const advancedFilterCount =
    (selectedGovernorate ? 1 : 0) +
    (selectedDistrict ? 1 : 0) +
    (selectedMake ? 1 : 0) +
    (selectedVehicleId ? 1 : 0) +
    activeFilters.size;

  const hasAnyFilter = advancedFilterCount > 0;

  /** Reset every filter. Search text and sort are deliberately left alone —
   *  they are not filters, and wiping a query nobody asked to clear is rude. */
  const clearAllFilters = useCallback(() => {
    setSelectedGovernorate("");
    setSelectedDistrict("");
    setSelectedMake(null);
    setSelectedVehicleId(null);
    setActiveFilters(new Set());
  }, []);

  /** What is currently narrowing the list, each removable on its own. */
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (selectedGovernorate)
    activeChips.push({
      key: "gov",
      label: tGov(selectedGovernorate, locale),
      clear: () => {
        setSelectedGovernorate("");
        setSelectedDistrict("");
      },
    });
  if (selectedDistrict)
    activeChips.push({
      key: "dist",
      label: tArea(selectedDistrict, locale),
      clear: () => setSelectedDistrict(""),
    });
  if (selectedMake)
    activeChips.push({
      key: "make",
      label: selectedMake,
      clear: () => setSelectedMake(null),
    });
  if (selectedVehicleId) {
    const v = vehicles.find((x) => x.id === selectedVehicleId);
    if (v)
      activeChips.push({
        key: "vehicle",
        label: vehicleLabel(v),
        clear: () => setSelectedVehicleId(null),
      });
  }
  for (const key of activeFilters) {
    activeChips.push({
      key,
      label:
        key === "available"
          ? t("services.availableToday")
          : t("services.topRated"),
      clear: () => toggleFilter(key),
    });
  }

  // ── Filter panel ────────────────────────────────────────────────────────────
  // One definition, rendered twice: as the desktop sidebar and inside the phone
  // sheet. The old page kept these controls in a band above the results that was
  // permanently open from lg up, so the first card started below the fold.
  const filterPanel = (
    <div className="space-y-6">
      {/* Location */}
      <div>
        <p className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {t("services.allGovernorates")}
        </p>
        <div className="space-y-2">
          <SelectShell>
            <select
              value={selectedGovernorate}
              onChange={(e) => {
                setSelectedGovernorate(e.target.value);
                setSelectedDistrict("");
              }}
              aria-label={t("services.allGovernorates")}
              className={BARE_CONTROL}
            >
              <option value="">{t("services.allGovernorates")}</option>
              {availableGovernorates.map((gov) => (
                <option key={gov} value={gov}>
                  {tGov(gov, locale)}
                </option>
              ))}
            </select>
          </SelectShell>
          <SelectShell className="has-disabled:opacity-50">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedGovernorate || availableDistricts.length === 0}
              aria-label={t("services.allDistricts")}
              className={cn(BARE_CONTROL, "disabled:cursor-not-allowed")}
            >
              <option value="">{t("services.allDistricts")}</option>
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist}>
                  {tArea(dist, locale)}
                </option>
              ))}
            </select>
          </SelectShell>
        </div>
      </div>

      {/* My vehicles */}
      <div>
        <p className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {t("services.myVehicles")}
        </p>
        <div className="flex flex-wrap gap-2">
          {vehicles.map((v) => {
            const isSelected = selectedVehicleId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() =>
                  setSelectedVehicleId(isSelected ? null : v.id)
                }
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:border-primary/50",
                )}
              >
                {isSelected && <Icon name="check" size="2xs" />}
                {vehicleLabel(v)}
              </button>
            );
          })}
          <Link
            href="/garage"
            className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Icon name="add" size="2xs" />
            {t("services.addVehicle")}
          </Link>
        </div>
      </div>

      {/* Make */}
      <div>
        <p className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {t("services.filterByMake")}
        </p>
        <SelectShell>
          <select
            value={selectedMake ?? ""}
            onChange={(e) => setSelectedMake(e.target.value || null)}
            aria-label={t("services.filterByMake")}
            className={BARE_CONTROL}
          >
            <option value="">{isAr ? "كل الماركات" : "All Makes"}</option>
            {allMakes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </SelectShell>
      </div>

      {/* Quick filters — same two toggles as before, gathered with the rest
          instead of living in a separate row up in the header. */}
      <div>
        <p className="mb-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {t("services.filters")}
        </p>
        {(
          [
            { key: "available" as FilterKey, label: t("services.availableToday") },
            { key: "topRated" as FilterKey, label: t("services.topRated") },
          ]
        ).map(({ key, label }) => {
          const isOn = activeFilters.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              aria-pressed={isOn}
              className="flex h-11 w-full items-center gap-2.5 rounded-lg px-1 text-start text-sm transition-colors hover:bg-muted/60"
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded border-2 transition-colors",
                  isOn
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {isOn && <Icon name="check" size="2xs" />}
              </span>
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* ── Header ── */}
      <div className="border-b bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <Breadcrumb className="mb-2 hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">{t("services.home")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/services">{t("services.services")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t("services.allCenters")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("services.bookService")}
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            {t("services.subtitle")}
          </p>

          {/* One row from sm up. On a phone the segmented control takes its
              own line and search shares the next with Near me — three items
              on one 375px line overflowed, and Arabic labels are longer still. */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex h-11 items-center rounded-lg bg-muted p-1 sm:shrink-0">
              {(
                [
                  { value: "service" as const, label: t("services.byService") },
                  { value: "center" as const, label: t("services.byCenter") },
                ]
              ).map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setSearchMode(mode.value)}
                  aria-pressed={searchMode === mode.value}
                  className={cn(
                    "h-9 flex-1 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none",
                    searchMode === mode.value
                      ? "bg-card shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:contents">
            <div className={cn(FIELD_SHELL, "min-w-0 flex-1 sm:min-w-[200px]")}>
              <Icon
                name="search"
                size="md"
                className="pointer-events-none shrink-0 text-muted-foreground"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchMode === "service"
                    ? t("services.servicePlaceholder")
                    : t("services.centerPlaceholder")
                }
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
            </div>

            {/* Near me — asks for location, then ranks by distance. Only ever
                fires from this tap, never on page load. */}
            <Button
              variant={sortOption === "nearest" ? "default" : "outline"}
              className="h-11 shrink-0 gap-1.5 px-3 text-sm sm:px-4"
              onClick={() => {
                if (hasDistances) {
                  setSortOption((o) => (o === "nearest" ? "relevance" : "nearest"));
                } else {
                  void useMyLocation();
                }
              }}
              disabled={geo.loading}
            >
              <Icon name="near_me" size="sm" />
              {geo.loading ? t("nearMe.requesting") : t("services.nearMe")}
            </Button>
            </div>
          </div>

          {/* Location trouble — explained inline rather than as a dead button */}
          {(geo.status === "denied" ||
            geo.status === "unavailable" ||
            geo.status === "timeout" ||
            geo.status === "insecure" ||
            geo.status === "unsupported") && (
            <p className="mt-2 text-xs text-muted-foreground">
              {geo.status === "denied"
                ? t("nearMe.deniedBody")
                : geo.status === "insecure"
                  ? t("nearMe.insecureBody")
                  : geo.status === "unsupported"
                    ? t("nearMe.unsupportedBody")
                    : t("nearMe.unavailableBody")}
            </p>
          )}
        </div>
      </div>

      {/* ── Sidebar + results ── */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        <aside className="hidden w-[264px] shrink-0 border-e bg-background p-5 lg:block">
          <div className="sticky top-24">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight">
                {t("services.filters")}
              </h2>
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("services.clearAll")}
                </button>
              )}
            </div>
            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto pe-1">
              {filterPanel}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          {/* Active filters — the page had no single place showing what was on. */}
          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex h-8 items-center gap-1 rounded-full bg-card px-3 text-xs font-semibold ring-1 ring-border"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.clear}
                    aria-label={`${t("services.clearAll")} — ${chip.label}`}
                    className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Icon name="close" size="2xs" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t("services.clearAll")}
              </button>
            </div>
          )}

          {/* Count + view + sort */}
          {/* flex-wrap, not a fixed row: count + Filters + view toggle + sort
              does not fit 375px, and body has overflow-x:hidden so the excess
              was clipped rather than scrollable. */}
          <div className="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center gap-2 bg-muted/60 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:flex-nowrap sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <p className="shrink-0 text-sm font-semibold">
              <span className="tabular-nums">{filtered.length}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t("services.centersFound")}
              </span>
            </p>

            <div className="ms-auto flex min-w-0 items-center gap-2">
              {/* Filters — phone only; the sidebar is always open from lg up */}
              <Button
                variant="outline"
                className="h-10 shrink-0 gap-1.5 px-3 text-xs lg:hidden"
                onClick={() => setFiltersOpen(true)}
                aria-expanded={filtersOpen}
              >
                <Icon name="tune" size="sm" />
                {t("services.filters")}
                {advancedFilterCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {advancedFilterCount}
                  </span>
                )}
              </Button>

              {/* List / Map. The map bundle is only fetched once picked. */}
              <div className="flex h-10 shrink-0 items-center rounded-lg bg-card p-0.5 ring-1 ring-border">
                {(
                  [
                    { mode: "list" as ViewMode, icon: "view_list", label: t("services.viewList") },
                    { mode: "map" as ViewMode, icon: "map", label: t("services.viewMap") },
                  ]
                ).map((v) => (
                  <button
                    key={v.mode}
                    onClick={() => setViewMode(v.mode)}
                    aria-pressed={viewMode === v.mode}
                    className={cn(
                      "inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors",
                      viewMode === v.mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon name={v.icon} size="sm" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                ))}
              </div>

              <SelectShell className="h-10 min-w-[7rem] shrink bg-card px-2.5">
                <select
                  value={sortOption}
                  onChange={(e) => {
                    const next = e.target.value as SortOption;
                    // Picking "nearest" without a fix yet asks for one.
                    if (next === "nearest" && !hasDistances) {
                      void useMyLocation();
                      return;
                    }
                    setSortOption(next);
                  }}
                  aria-label={t("services.relevance")}
                  className={cn(BARE_CONTROL, "text-xs font-semibold")}
                >
                  <option value="relevance">{t("services.relevance")}</option>
                  <option value="rating">{t("services.highestRated")}</option>
                  <option value="nearest">{t("services.nearest")}</option>
                </select>
              </SelectShell>
            </div>
          </div>

          {/* Map — rendered above the results so the same list works in both
              views; no duplicated card markup, and it collapses cleanly on a
              phone where a side-by-side split would be unusable. */}
          {viewMode === "map" && (
            <div className="relative mb-5 h-[55vh] lg:h-[65vh]">
              {mappable.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center rounded-2xl border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("nearMe.noMappableCenters")}
                  </p>
                </div>
              ) : (
                <CenterMap
                  centers={mappable}
                  userCoords={geo.coords}
                  selectedId={selectedMapId}
                  onSelect={setSelectedMapId}
                  youAreHereLabel={t("nearMe.youAreHere")}
                  displayName={(id) => {
                    const c = filtered.find((x) => x.id === id);
                    return c ? displayName(c) : "";
                  }}
                />
              )}

              {selectedCenter && (
                <div className="absolute inset-x-3 bottom-3 z-[500]">
                  <CenterMarkerCard
                    name={displayName(selectedCenter)}
                    locationLine={locationLine(selectedCenter)}
                    distanceLabel={distanceLabel(selectedCenter.id)}
                    rating={selectedCenter.rating}
                    reviewCount={selectedCenter.reviewCount}
                    tags={selectedCenter.specializations}
                    href={`/services/${selectedCenter.slug ?? selectedCenter.id}`}
                    directionsUrl={buildDirectionsUrl({
                      maps_link: selectedCenter.mapsLink,
                      latitude: selectedCenter.latitude,
                      longitude: selectedCenter.longitude,
                    })}
                    onClose={() => setSelectedMapId(null)}
                    t={t}
                  />
                </div>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Icon name="search_off" size="2xl" />
              </div>
              <h2 className="mt-4 text-base font-semibold">
                {t("services.noFiltersMatch")}
              </h2>
              <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {initialCenters.length === 0
                  ? t("services.noAvailable")
                  : t("services.tryAdjusting")}
              </p>
              {hasAnyFilter && (
                <Button
                  variant="outline"
                  className="mt-5 h-11 px-4"
                  onClick={clearAllFilters}
                >
                  {t("services.clearAll")}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((sc) => {
                const name = displayName(sc);
                const distance = distanceLabel(sc.id);
                const directionsUrl = buildDirectionsUrl({
                  maps_link: sc.mapsLink,
                  latitude: sc.latitude,
                  longitude: sc.longitude,
                });
                return (
                  <article
                    key={sc.id}
                    className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-shadow hover:shadow-md"
                  >
                    {/* Image — shrink-0 so it keeps its height when the card is
                        stretched to match a taller sibling in the row. */}
                    <div className="relative aspect-[16/9] w-full shrink-0 bg-muted">
                      {sc.image ? (
                        <NextImage
                          src={sc.image}
                          alt={name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1400px) 50vw, 33vw"
                          className="object-cover"
                          quality={85}
                        />
                      ) : (
                        // A monogram beats a grey wrench repeated down the grid.
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/10 to-transparent">
                          <span className="text-3xl font-bold tracking-tight text-primary/30">
                            {name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {distance && (
                        <span className="absolute start-3 top-3 inline-flex h-7 items-center gap-1 rounded-full bg-black/70 px-2.5 text-[11px] font-semibold text-white backdrop-blur">
                          <Icon name="near_me" size="2xs" />
                          {distance}
                        </span>
                      )}
                      {sc.featured && (
                        <span className="absolute end-3 top-3 inline-flex h-7 items-center gap-1 rounded-full bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground">
                          <Icon name="star" size="2xs" filled />
                          {t("services.featured")}
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <h3 className="text-base leading-snug font-semibold">
                        {name}
                      </h3>

                      {/* One meta line replaces three stacked rows. */}
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                        {sc.reviewCount > 0 ? (
                          <>
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                              <Icon
                                name="star"
                                size="2xs"
                                filled
                                className="text-amber-500"
                              />
                              {sc.rating.toFixed(1)}
                            </span>
                            <span>({sc.reviewCount.toLocaleString()})</span>
                          </>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                            {t("services.newCenter")}
                          </span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Icon name="location_on" size="2xs" />
                          {sc.governorate}
                          {sc.district ? ` · ${sc.district}` : ""}
                        </span>
                        {sc.branchLocations.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-foreground">
                              +{sc.branchLocations.length}{" "}
                              {t("services.branches")}
                            </span>
                          </>
                        )}
                      </p>

                      {/* One chip row, not two of near-identical styling. */}
                      {sc.services.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {sc.services.slice(0, 3).map((svc) => (
                            <span
                              key={svc}
                              className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium"
                            >
                              {svc}
                            </span>
                          ))}
                          {sc.services.length > 3 && (
                            <span className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground">
                              +{sc.services.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-2 border-t pt-3">
                        <Button asChild className="h-11 flex-1 text-sm">
                          <Link href={`/services/${sc.slug ?? sc.id}`}>
                            {t("services.bookNow")}
                          </Link>
                        </Button>
                        {hasUsableCoordinates(sc.latitude, sc.longitude) && (
                          <Button
                            variant="outline"
                            className="size-11 shrink-0 p-0"
                            aria-label={t("nearMe.showOnMap")}
                            onClick={() => {
                              setViewMode("map");
                              setSelectedMapId(sc.id);
                            }}
                          >
                            <Icon name="map" size="md" />
                          </Button>
                        )}
                        {directionsUrl && (
                          <Button
                            variant="outline"
                            className="size-11 shrink-0 p-0"
                            aria-label={t("nearMe.getDirections")}
                            asChild
                          >
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Icon name="directions" size="md" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter sheet (phones) ── */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("services.filters")}
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-card"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">
                {t("services.filters")}
              </h2>
              <div className="flex items-center gap-3">
                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs font-semibold text-primary"
                  >
                    {t("services.clearAll")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label={t("services.filters")}
                  className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <Icon name="close" size="md" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {filterPanel}
            </div>

            <div className="border-t p-5">
              <Button
                className="h-12 w-full text-sm font-semibold"
                onClick={() => setFiltersOpen(false)}
              >
                {t("services.showResults", { count: filtered.length })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
