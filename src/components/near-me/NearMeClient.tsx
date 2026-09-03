"use client";

/**
 * NearMeClient — the Near Me view: a distance-ranked list of approved service
 * centers plus an interactive map.
 *
 * Three rules shape everything here:
 *  1. The page is always usable without location. The approved directory is
 *     server-rendered into `initialCenters`; a fix only re-ranks it and lights
 *     up the map.
 *  2. Location is requested only from a user gesture, and only after the page
 *     has said why it wants it.
 *  3. Fetching hangs off that gesture rather than an effect, so there is no
 *     render-phase cascade and no request the visitor did not ask for.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useLanguage } from "@/context/LanguageContext";
import { useGeolocation, type GeoStatus } from "@/hooks/useGeolocation";
import {
  fetchNearbyCenters,
  NEARBY_RADIUS_KM,
  type NearbyCenter,
} from "@/services/nearbyService";
import {
  formatDistanceParts,
  hasUsableCoordinates,
  buildDirectionsUrl,
} from "@/lib/geo";
import { CenterMarkerCard } from "./CenterMarkerCard";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Star,
  Navigation,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

// Leaflet reaches for `window` as it loads, so the map may only ever be
// client-rendered.
const CenterMap = dynamic(() => import("./CenterMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface NearMeClientProps {
  /** Approved directory, server-rendered so the page is useful immediately. */
  initialCenters: NearbyCenter[];
  /** True when the server-side read failed; the client offers a retry. */
  initialError?: boolean;
}

export default function NearMeClient({
  initialCenters,
  initialError = false,
}: NearMeClientProps) {
  const { t, locale, isRTL } = useLanguage();
  const geo = useGeolocation();

  const [centers, setCenters] = useState<NearbyCenter[]>(initialCenters);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(initialError);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isAr = locale === "ar";

  // ── Data ──────────────────────────────────────────────────────────────────
  const reload = useCallback(
    async (origin: { lat: number; lng: number } | null) => {
      setLoading(true);
      setFailed(false);
      const result = await fetchNearbyCenters(origin);
      setCenters(result.centers);
      setFailed(result.error !== null);
      setLoading(false);
    },
    [],
  );

  /** Ask for a fix, then re-rank. Both steps hang off a click. */
  const useMyLocation = useCallback(async () => {
    const coords = await geo.request();
    if (coords) await reload(coords);
  }, [geo, reload]);

  const retry = useCallback(() => {
    void reload(geo.coords);
  }, [geo.coords, reload]);

  // ── Selection ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selected = useMemo(
    () => centers.find((c) => c.id === selectedId) ?? null,
    [centers, selectedId],
  );

  // ── Localized display helpers ─────────────────────────────────────────────
  const displayName = useCallback(
    (c: NearbyCenter) => (isAr ? c.name_ar || c.name : c.name),
    [isAr],
  );

  const locationLine = useCallback(
    (c: NearbyCenter): string | null => {
      if (c.address) return c.address;
      const city = isAr ? c.city_ar || c.city : c.city;
      const parts = [c.district, city, c.governorate].filter(Boolean);
      return parts.length ? parts.join(" · ") : null;
    },
    [isAr],
  );

  const distanceLabel = useCallback(
    (km: number | null): string | null => {
      if (km === null) return null;
      const { value, unit } = formatDistanceParts(km);
      return t("nearMe.distanceAway", {
        distance: `${value} ${t(`nearMe.unit.${unit}`)}`,
      });
    },
    [t],
  );

  const mappable = useMemo(
    () => centers.filter((c) => hasUsableCoordinates(c.latitude, c.longitude)),
    [centers],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
        <header>
          <h1 className="text-2xl font-black tracking-tight">
            {t("nearMe.heading")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("nearMe.subtitle")}
          </p>
        </header>

        <LocationPanel
          status={geo.status}
          loading={geo.loading || loading}
          onRequest={useMyLocation}
          t={t}
        />

        {failed && (
          <Notice
            icon={<AlertCircle className="h-4 w-4 text-red-600" />}
            title={t("nearMe.loadErrorTitle")}
            body={t("nearMe.loadErrorBody")}
            action={
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={retry}
              >
                {t("nearMe.tryAgain")}
              </Button>
            }
          />
        )}

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {/* Map */}
          <div className="relative h-[340px] lg:h-[calc(100vh-14rem)] lg:sticky lg:top-24 order-1">
            {mappable.length === 0 && !loading ? (
              <div className="h-full w-full rounded-xl border bg-card flex items-center justify-center p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("nearMe.noMappableCenters")}
                </p>
              </div>
            ) : (
              <CenterMap
                centers={mappable}
                userCoords={geo.coords}
                selectedId={selectedId}
                onSelect={setSelectedId}
                youAreHereLabel={t("nearMe.youAreHere")}
                displayName={displayName}
              />
            )}

            {selected && (
              <div
                className="absolute bottom-3 left-3 right-3 z-[500]"
                dir={isRTL ? "rtl" : "ltr"}
              >
                <CenterMarkerCard
                  center={selected}
                  name={displayName(selected)}
                  locationLine={locationLine(selected)}
                  distanceLabel={distanceLabel(selected.distance_km)}
                  onClose={() => setSelectedId(null)}
                  t={t}
                />
              </div>
            )}
          </div>

          {/* List */}
          <div className="order-2 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : centers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-semibold">
                    {geo.coords
                      ? t("nearMe.noneInRadius", { radius: NEARBY_RADIUS_KM })
                      : t("nearMe.noCenters")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              centers.map((c) => {
                const dist = distanceLabel(c.distance_km);
                const line = locationLine(c);
                const directionsUrl = buildDirectionsUrl(c);
                return (
                  <Card
                    key={c.id}
                    className={
                      c.id === selectedId
                        ? "ring-2 ring-primary transition-shadow"
                        : "hover:shadow-md transition-shadow"
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/services/${c.slug ?? c.id}`}
                            className="font-bold leading-tight hover:text-primary transition-colors"
                          >
                            {displayName(c)}
                          </Link>
                          {dist ? (
                            <p className="text-xs font-semibold text-primary mt-0.5">
                              {dist}
                            </p>
                          ) : (
                            geo.coords && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t("nearMe.noDistance")}
                              </p>
                            )
                          )}
                        </div>
                        {c.total_reviews > 0 && (
                          <div className="flex items-center gap-1 text-sm font-bold shrink-0">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {c.rating.toFixed(1)}
                            <span className="text-muted-foreground font-normal text-xs">
                              ({c.total_reviews.toLocaleString()})
                            </span>
                          </div>
                        )}
                      </div>

                      {line && (
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="min-w-0">{line}</span>
                        </p>
                      )}

                      {c.supported_makes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {c.supported_makes.slice(0, 4).map((m) => (
                            <Badge
                              key={m}
                              variant="secondary"
                              className="text-[10px] font-semibold"
                            >
                              {m}
                            </Badge>
                          ))}
                          {c.supported_makes.length > 4 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-semibold text-muted-foreground"
                            >
                              +{c.supported_makes.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t flex items-center gap-2">
                        <Button size="sm" className="h-7 text-xs" asChild>
                          <Link href={`/services/${c.slug ?? c.id}`}>
                            {t("nearMe.viewCenter")}
                          </Link>
                        </Button>
                        {hasUsableCoordinates(c.latitude, c.longitude) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setSelectedId(c.id)}
                          >
                            {t("nearMe.showOnMap")}
                          </Button>
                        )}
                        {directionsUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 ms-auto"
                            asChild
                          >
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {t("nearMe.getDirections")}
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Location banner ─────────────────────────────────────────────────────────
// Hoisted out of NearMeClient: a component declared inside another component is
// a brand-new type on every render, so React unmounts and remounts its subtree.

function LocationPanel({
  status,
  loading,
  onRequest,
  t,
}: {
  status: GeoStatus;
  loading: boolean;
  onRequest: () => void;
  t: Translate;
}) {
  switch (status) {
    case "granted":
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Navigation className="h-4 w-4 text-primary" />
            {t("nearMe.showingNearYou")}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={onRequest}
            disabled={loading}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("nearMe.updateLocation")}
          </Button>
        </div>
      );

    case "requesting":
      return (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {t("nearMe.requesting")}
        </div>
      );

    case "denied":
      return (
        <Notice
          icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}
          title={t("nearMe.deniedTitle")}
          // A website cannot open browser or OS settings — say where to go,
          // do not pretend to be able to take them there.
          body={t("nearMe.deniedBody")}
          action={
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={onRequest}
            >
              {t("nearMe.tryAgain")}
            </Button>
          }
        />
      );

    case "unavailable":
    case "timeout":
      return (
        <Notice
          icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
          title={t("nearMe.unavailableTitle")}
          body={t("nearMe.unavailableBody")}
          action={
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={onRequest}
            >
              {t("nearMe.tryAgain")}
            </Button>
          }
        />
      );

    case "insecure":
      return (
        <Notice
          icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}
          title={t("nearMe.insecureTitle")}
          body={t("nearMe.insecureBody")}
        />
      );

    case "unsupported":
      // Nothing is broken — this browser simply has no Geolocation API.
      return (
        <Notice
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          title={t("nearMe.unsupportedTitle")}
          body={t("nearMe.unsupportedBody")}
        />
      );

    default:
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("nearMe.enableTitle")}</p>
            {/* Say why before asking — the prompt should never be a surprise. */}
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("nearMe.enableBody")}
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onRequest}
            disabled={loading}
          >
            <Navigation className="h-3.5 w-3.5" />
            {t("nearMe.useMyLocation")}
          </Button>
        </div>
      );
  }
}

// ── Small shared notice block ───────────────────────────────────────────────

function Notice({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
