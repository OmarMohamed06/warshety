"use client";

/**
 * CenterMarkerCard — the compact card shown when a map pin is picked.
 *
 * Rendered as an overlay above the map rather than inside a Leaflet popup, so
 * it inherits the site's card, button and typography styles and lays out
 * correctly under dir="rtl".
 *
 * Takes plain values rather than a row object, so whichever page owns the map
 * can feed it from its own shape without a conversion type.
 */

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, X, ExternalLink } from "lucide-react";

export interface CenterMarkerCardProps {
  name: string;
  /** Address, or a district/city/governorate line. */
  locationLine: string | null;
  /** Localized "3.2 km away", or null when the distance is unknown. */
  distanceLabel: string | null;
  rating: number;
  reviewCount: number;
  tags: string[];
  /** Internal path to the center's detail page. */
  href: string;
  /** Validated http(s) directions URL, or null when none is available. */
  directionsUrl: string | null;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function CenterMarkerCard({
  name,
  locationLine,
  distanceLabel,
  rating,
  reviewCount,
  tags,
  href,
  directionsUrl,
  onClose,
  t,
}: CenterMarkerCardProps) {
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

      {reviewCount > 0 && (
        <div className="flex items-center gap-1 text-sm font-bold">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {rating.toFixed(1)}
          <span className="text-muted-foreground font-normal text-xs">
            ({reviewCount.toLocaleString()})
          </span>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="flex-1 h-8 text-xs" asChild>
          <Link href={href}>{t("nearMe.viewCenter")}</Link>
        </Button>

        {directionsUrl ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1"
            asChild
          >
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
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
