"use client";

/**
 * CenterMap — Leaflet map with the visitor's position and one pin per center.
 *
 * Uses Leaflet directly rather than a React wrapper: the map is an imperative,
 * long-lived object and this component owns its whole lifecycle, so a wrapper
 * would only add a version-compatibility surface.
 *
 * Markers are `divIcon`s, which sidesteps Leaflet's well-known broken default
 * icon paths under a bundler and lets the pins carry the site's own colour.
 *
 * This component must only ever be rendered on the client (Leaflet touches
 * `window` at import time) — load it with next/dynamic and `ssr: false`.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocatableCenter } from "@/services/nearbyService";
import { hasUsableCoordinates, type Coordinates } from "@/lib/geo";

/** Cairo — a sensible view before any fix arrives. */
const FALLBACK_CENTER: [number, number] = [30.0444, 31.2357];
const FALLBACK_ZOOM = 6;
const LOCATED_ZOOM = 12;

const BRAND = "#FF4B19";

function centerPinIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: "", // suppress Leaflet's default .leaflet-div-icon chrome
    html: `
      <span style="
        display:block;width:${selected ? 34 : 26}px;height:${selected ? 34 : 26}px;
        border-radius:50% 50% 50% 0;background:${BRAND};
        transform:rotate(-45deg);
        border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,.35);
      "></span>`,
    iconSize: selected ? [34, 34] : [26, 26],
    iconAnchor: selected ? [17, 34] : [13, 26],
  });
}

function userDotIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <span style="
        display:block;width:16px;height:16px;border-radius:50%;
        background:#2563eb;border:3px solid #fff;
        box-shadow:0 0 0 4px rgba(37,99,235,.25);
      "></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export interface CenterMapProps {
  centers: LocatableCenter[];
  userCoords: Coordinates | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Accessible label for the visitor's own marker. */
  youAreHereLabel: string;
  /** Keyed by id rather than taking the row, so this stays independent of
   *  whatever shape the calling page holds — and survives next/dynamic, which
   *  erases generic type parameters. */
  displayName: (id: string) => string;
}

export default function CenterMap({
  centers,
  userCoords,
  selectedId,
  onSelect,
  youAreHereLabel,
  displayName,
}: CenterMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  // Recentre on the visitor once per fix, not on every re-render, so panning
  // around is not constantly undone.
  const centredOnRef = useRef<string | null>(null);
  // Keep the latest onSelect without making the marker effect depend on it.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // ── Create the map once ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      scrollWheelZoom: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      // Required by the OpenStreetMap tile usage policy.
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    // Capture for the cleanup closure — the ref itself may point elsewhere by
    // the time this effect tears down.
    const markers = markersRef.current;

    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
      userMarkerRef.current = null;
    };
  }, []);

  // ── Centre on the visitor when a fix arrives ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;

    const key = `${userCoords.lat},${userCoords.lng}`;
    if (centredOnRef.current !== key) {
      map.setView([userCoords.lat, userCoords.lng], LOCATED_ZOOM);
      centredOnRef.current = key;
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
        icon: userDotIcon(),
        // Below the center pins: it is context, not a target.
        zIndexOffset: -500,
        keyboard: false,
        alt: youAreHereLabel,
      })
        .addTo(map)
        .bindTooltip(youAreHereLabel, { direction: "top" });
    }
  }, [userCoords, youAreHereLabel]);

  // ── Sync center markers ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mappable = centers.filter((c) =>
      hasUsableCoordinates(c.latitude, c.longitude),
    );
    const wanted = new Set(mappable.map((c) => c.id));

    // Drop markers for centers no longer in the list.
    for (const [id, marker] of markersRef.current) {
      if (!wanted.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const c of mappable) {
      const existing = markersRef.current.get(c.id);
      if (existing) {
        existing.setLatLng([c.latitude!, c.longitude!]);
        continue;
      }
      const marker = L.marker([c.latitude!, c.longitude!], {
        icon: centerPinIcon(false),
        // Leaflet gives keyboard-focusable markers that fire click on Enter.
        keyboard: true,
        title: displayName(c.id),
        alt: displayName(c.id),
        riseOnHover: true,
      })
        .addTo(map)
        .on("click", () => onSelectRef.current(c.id));

      markersRef.current.set(c.id, marker);
    }
  }, [centers, displayName]);

  // ── Reflect selection in the pins ─────────────────────────────────────────
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.setIcon(centerPinIcon(id === selectedId));
    }
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const selected = markersRef.current.get(selectedId);
    if (selected) map.panTo(selected.getLatLng());
  }, [selectedId, centers]);

  return (
    <div
      ref={containerRef}
      // Leaflet needs a laid-out box with a real height before it can render.
      className="h-full w-full rounded-xl overflow-hidden z-0"
      // The map's internal chrome is LTR regardless of page direction;
      // flipping it produces mirrored zoom controls and attribution.
      dir="ltr"
    />
  );
}
