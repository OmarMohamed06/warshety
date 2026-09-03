"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import NextImage from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { tGov, tArea } from "@/lib/locationData";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  MapPin,
  Star,
  Search,
  SlidersHorizontal,
  CalendarCheck,
  Wrench,
  Car,
  Award,
  ChevronDown,
  Navigation,
  Map as MapIcon,
  List as ListIcon,
  ExternalLink,
} from "lucide-react";
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

  /** How many advanced filters are set — shown on the mobile Filters button. */
  const advancedFilterCount =
    (selectedGovernorate ? 1 : 0) +
    (selectedDistrict ? 1 : 0) +
    (selectedMake ? 1 : 0) +
    (selectedVehicleId ? 1 : 0);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Search Header */}
      <div className="bg-background border-b px-4 sm:px-6 lg:px-20 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5">
          <div>
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
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t("services.bookService")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 hidden sm:block">
              {t("services.subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Tabs
              value={searchMode}
              onValueChange={(v) => setSearchMode(v as "service" | "center")}
              className="shrink-0"
            >
              <TabsList>
                <TabsTrigger value="service">
                  {t("services.byService")}
                </TabsTrigger>
                <TabsTrigger value="center">
                  {t("services.byCenter")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                placeholder={
                  searchMode === "service"
                    ? t("services.servicePlaceholder")
                    : t("services.centerPlaceholder")
                }
              />
            </div>

          </div>

          {/* Quick filters + Near Me */}
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "available" as FilterKey,
                icon: <CalendarCheck className="h-3.5 w-3.5" />,
                label: t("services.availableToday"),
              },
              {
                key: "topRated" as FilterKey,
                icon: <Award className="h-3.5 w-3.5" />,
                label: t("services.topRated"),
              },
            ].map(({ key, icon, label }) => (
              <Button
                key={key}
                variant={activeFilters.has(key) ? "default" : "outline"}
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => toggleFilter(key)}
              >
                {icon} {label}
              </Button>
            ))}

            {/* Near me — asks for location, then ranks by distance. Only ever
                fires from this tap, never on page load. */}
            <Button
              variant={sortOption === "nearest" ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                if (hasDistances) {
                  setSortOption((o) => (o === "nearest" ? "relevance" : "nearest"));
                } else {
                  void useMyLocation();
                }
              }}
              disabled={geo.loading}
            >
              <Navigation className="h-3.5 w-3.5" />
              {geo.loading ? t("nearMe.requesting") : t("services.nearMe")}
            </Button>

            {/* Filters — phone only; the block below is always open from lg up */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 lg:hidden ms-auto"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("services.filters")}
              {advancedFilterCount > 0 && (
                <span className="ms-0.5 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-bold">
                  {advancedFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Location trouble — explained inline rather than as a dead button */}
          {(geo.status === "denied" ||
            geo.status === "unavailable" ||
            geo.status === "timeout" ||
            geo.status === "insecure" ||
            geo.status === "unsupported") && (
            <p className="text-xs text-muted-foreground -mt-2">
              {geo.status === "denied"
                ? t("nearMe.deniedBody")
                : geo.status === "insecure"
                  ? t("nearMe.insecureBody")
                  : geo.status === "unsupported"
                    ? t("nearMe.unsupportedBody")
                    : t("nearMe.unavailableBody")}
            </p>
          )}

          {/* Advanced filters — collapsed on phones, always open from lg up */}
          <div
            className={cn(
              "flex-col gap-5",
              filtersOpen ? "flex" : "hidden lg:flex",
            )}
          >
              <div className="flex gap-2">
                {/* Governorate */}
                <div className="relative flex-1 min-w-0">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <select
                    value={selectedGovernorate}
                    onChange={(e) => {
                      setSelectedGovernorate(e.target.value);
                      setSelectedDistrict("");
                    }}
                    className="w-full pl-9 pr-8 py-2 h-9 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer"
                    style={{ WebkitAppearance: "none", MozAppearance: "none" }}
                  >
                    <option value="">{t("services.allGovernorates")}</option>
                    {availableGovernorates.map((gov) => (
                      <option key={gov} value={gov}>
                        {tGov(gov, locale)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* District */}
                <div className="relative flex-1 min-w-0">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    disabled={
                      !selectedGovernorate || availableDistricts.length === 0
                    }
                    className="w-full pl-9 pr-8 py-2 h-9 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ WebkitAppearance: "none", MozAppearance: "none" }}
                  >
                    <option value="">{t("services.allDistricts")}</option>
                    {availableDistricts.map((dist) => (
                      <option key={dist} value={dist}>
                        {tArea(dist, locale)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>


          {/* Filter by My Vehicle */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5" /> {t("services.myVehicles")}
            </p>
            <div className="flex flex-wrap gap-2">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() =>
                    setSelectedVehicleId(
                      selectedVehicleId === v.id ? null : v.id,
                    )
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedVehicleId === v.id
                      ? "bg-primary border-primary text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    directions_car
                  </span>
                  {vehicleLabel(v)}
                </button>
              ))}
              <Link
                href="/garage"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-slate-300 dark:border-slate-600 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-base">add</span>
                {t("services.addVehicle")}
              </Link>
            </div>
          </div>

          {/* Filter by Make — dropdown */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">
                emoji_transportation
              </span>
              {t("services.filterByMake")}
            </p>
            <div className="relative">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
                style={{ fontSize: "18px" }}
              >
                directions_car
              </span>
              <select
                value={selectedMake ?? ""}
                onChange={(e) => setSelectedMake(e.target.value || null)}
                className="w-full pl-9 pr-8 py-2.5 h-10 rounded-xl border border-input bg-background text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer shadow-sm"
                style={{ WebkitAppearance: "none", MozAppearance: "none" }}
              >
                <option value="">{isAr ? "كل الماركات" : "All Makes"}</option>
                {allMakes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {selectedMake && (
              <button
                onClick={() => setSelectedMake(null)}
                className="self-start text-xs text-primary hover:underline font-medium mt-0.5"
              >
                {isAr ? "× مسح" : "× Clear"}
              </button>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 max-w-7xl w-full mx-auto">
        {/* List */}
        <div className="w-full p-4 sm:p-6">
          <div className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 sm:py-0 mb-4 sm:mb-5 bg-muted/30 sm:bg-transparent backdrop-blur supports-[backdrop-filter]:bg-muted/60 sm:supports-[backdrop-filter]:bg-transparent flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-muted-foreground shrink-0">
              {filtered.length} {t("services.centersFound")}
            </p>

            <div className="flex items-center gap-2 min-w-0">
              {/* List / Map. The map bundle is only fetched once picked. */}
              <div className="flex rounded-md border p-0.5">
                <button
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ListIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t("services.viewList")}
                  </span>
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  aria-pressed={viewMode === "map"}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                    viewMode === "map"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t("services.viewMap")}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                  className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer min-w-0 truncate"
                >
                  <option value="relevance">{t("services.relevance")}</option>
                  <option value="rating">{t("services.highestRated")}</option>
                  <option value="nearest">{t("services.nearest")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Map — rendered above the results so the same list works in both
              views; no duplicated card markup, and it collapses cleanly on a
              phone where a side-by-side split would be unusable. */}
          {viewMode === "map" && (
            <div className="relative h-[55vh] lg:h-[65vh] mb-5">
              {mappable.length === 0 ? (
                <div className="h-full w-full rounded-xl border bg-card flex items-center justify-center p-6 text-center">
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
                <div className="absolute bottom-3 left-3 right-3 z-[500]">
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">{t("services.noFiltersMatch")}</p>
                <p className="text-sm mt-1">
                  {initialCenters.length === 0
                    ? t("services.noAvailable")
                    : t("services.tryAdjusting")}
                </p>
              </div>
            ) : (
              filtered.map((sc) => (
                <Card
                  key={sc.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Image — shrink-0 so it keeps its height when the card is
                      stretched to match a taller sibling in the row. */}
                  <div className="w-full h-40 relative shrink-0">
                    {sc.image ? (
                      <NextImage
                        src={sc.image}
                        alt={sc.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                        quality={85}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Wrench className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    {sc.badge && (
                      <div className="absolute top-2 left-2">
                        <Badge className="text-[10px] px-1.5">{sc.badge}</Badge>
                      </div>
                    )}
                    {sc.availableToday && (
                      <div className="absolute bottom-2 left-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-green-500 text-white border-green-500 px-1.5"
                        >
                          {t("services.availableToday")}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Details — flex-1 makes this fill the (already equal-height)
                      card, so justify-between pins the Book Now footer to the
                      bottom and every card in a row lines up regardless of how
                      many chips it has. */}
                  <CardContent className="p-4 flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-base leading-tight">
                          {isAr ? sc.name_ar || sc.name : sc.name}
                        </h3>
                        <div className="flex items-center gap-1 font-bold text-sm shrink-0">
                          {sc.reviewCount > 0 ? (
                            <>
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {sc.rating.toFixed(1)}
                              <span className="text-muted-foreground font-normal text-xs">
                                ({sc.reviewCount.toLocaleString()})
                              </span>
                            </>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                              {t("services.newCenter")}
                            </span>
                          )}
                        </div>
                      </div>
                      {distanceLabel(sc.id) && (
                        <p className="text-xs font-semibold text-primary mb-1.5">
                          {distanceLabel(sc.id)}
                        </p>
                      )}
                      <div className="flex items-start gap-1 text-muted-foreground text-xs mb-2.5">
                        <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1 min-w-0">
                          {/* Main location */}
                          <span className="font-medium text-foreground">
                            {sc.governorate}
                            {sc.district ? (
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                · {sc.district}
                              </span>
                            ) : null}
                          </span>
                          {/* Branch location pills */}
                          {sc.branchLocations.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {sc.branchLocations.map((b, idx) => {
                                const loc = [b.governorate, b.city]
                                  .filter(Boolean)
                                  .join(" · ");
                                return loc ? (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-0.5 bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border"
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: "10px" }}
                                    >
                                      fork_right
                                    </span>
                                    {loc}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Capped like the services row below — an unbounded list
                          of makes was the other reason cards drifted out of
                          line (2 chips on one card, 6 on the next). */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {sc.specializations.slice(0, 4).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[10px] font-semibold"
                          >
                            {s}
                          </Badge>
                        ))}
                        {sc.specializations.length > 4 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold text-muted-foreground"
                          >
                            +{sc.specializations.length - 4}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sc.services.slice(0, 3).map((svc) => (
                          <Badge
                            key={svc}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {svc}
                          </Badge>
                        ))}
                        {sc.services.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground"
                          >
                            +{sc.services.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      {hasUsableCoordinates(sc.latitude, sc.longitude) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 px-2"
                          onClick={() => {
                            setViewMode("map");
                            setSelectedMapId(sc.id);
                          }}
                        >
                          <MapIcon className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {t("nearMe.showOnMap")}
                          </span>
                        </Button>
                      )}
                      {buildDirectionsUrl({
                        maps_link: sc.mapsLink,
                        latitude: sc.latitude,
                        longitude: sc.longitude,
                      }) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 px-2"
                          asChild
                        >
                          <a
                            href={
                              buildDirectionsUrl({
                                maps_link: sc.mapsLink,
                                latitude: sc.latitude,
                                longitude: sc.longitude,
                              })!
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="hidden sm:inline">
                              {t("nearMe.getDirections")}
                            </span>
                          </a>
                        </Button>
                      )}
                      <Button size="sm" className="h-7 text-xs ms-auto" asChild>
                        <Link href={`/services/${sc.slug ?? sc.id}`}>
                          {t("services.bookNow")}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
