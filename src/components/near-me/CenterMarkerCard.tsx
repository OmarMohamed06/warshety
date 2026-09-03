"use client";

/**
 * CenterMarkerCard — the compact card shown when a map pin is picked.
 *
 * Rendered as an overlay above the map rather than inside a Leaflet popup, so
 * it inherits the site's card, button and typography styles and lays out
 * correctly under dir="rtl".
 */

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, X, ExternalLink } from "lucide-react";
import type { NearbyCenter } from "@/services/nearbyService";
import { buildDirectionsUrl } from "@/lib/geo";

export interface CenterMarkerCardProps {
  center: NearbyCenter;
  name: string;
  locationLine: string | null;
  distanceLabel: string | null;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function CenterMarkerCard({
  center,
  name,
  locationLine,
  distanceLabel,
  onClose,
  t,
}: CenterMarkerCardProps) {
  const directionsUrl = buildDirectionsUrl(center);

  return (
    <div
      role="dialog"
      aria-label={name}
      className="rounded-xl border bg-card text-card-foreground shadow-lg p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold leading-tight truncate">{name}</p>
          {distanceLabel && (
            <p className="text-xs text-primary font-semibold mt-0.5">
              {distanceLabel}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label={t("nearMe.close")}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {locationLine && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="min-w-0">{locationLine}</span>
        </p>
      )}

      {center.total_reviews > 0 && (
        <div className="flex items-center gap-1 text-sm font-bold">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {center.rating.toFixed(1)}
          <span className="text-muted-foreground font-normal text-xs">
            ({center.total_reviews.toLocaleString()})
          </span>
        </div>
      )}

      {center.supported_makes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {center.supported_makes.slice(0, 3).map((m) => (
            <Badge key={m} variant="secondary" className="text-[10px]">
              {m}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="flex-1 h-8 text-xs" asChild>
          <Link href={`/services/${center.slug ?? center.id}`}>
            {t("nearMe.viewCenter")}
          </Link>
        </Button>

        {directionsUrl ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1"
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
        ) : (
          // No maps_link and no usable coordinates — the honest thing is a
          // disabled control with a reason, not a dead link or raw numbers.
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            disabled
            title={t("nearMe.noLocationShared")}
          >
            {t("nearMe.noLocationShared")}
          </Button>
        )}
      </div>
    </div>
  );
}
