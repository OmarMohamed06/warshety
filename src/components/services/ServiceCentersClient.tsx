"use client";

/**
 * ServiceCentersClient — Interactive workshop listing with search and filters.
 *
 * Receives the initial centers array (fetched server-side from Supabase) and
 * handles all client-side filtering, search, and rendering.
 */

import Link from "next/link";
import { useState } from "react";

export interface ServiceCenterDisplay {
  id: string;
  name: string;
  badge: string | null;
  city: string;
  rating: number;
  reviewCount: number;
  completedBookings: number;
  specializations: string[];
  services: string[];
  availableToday: boolean;
  image: string | null;
}

type FilterKey = "workshop" | "mobile" | "available" | "topRated";

interface Props {
  initialCenters: ServiceCenterDisplay[];
}

export default function ServiceCentersClient({ initialCenters }: Props) {
  const [searchMode, setSearchMode] = useState<"service" | "center">("service");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filterBtn = (key: FilterKey, icon: string, label: string) => (
    <button
      onClick={() => toggleFilter(key)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
        activeFilters.has(key)
          ? "bg-[#FF4B19] border-[#FF4B19] text-white"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#FF4B19]"
      }`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {label}
    </button>
  );

  const filtered = initialCenters.filter((sc) => {
    if (activeFilters.has("mobile") && sc.badge !== "Mobile Service")
      return false;
    if (activeFilters.has("workshop") && sc.badge === "Mobile Service")
      return false;
    if (activeFilters.has("available") && !sc.availableToday) return false;
    if (activeFilters.has("topRated") && sc.rating < 4.8) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = sc.name.toLowerCase().includes(q);
      const cityMatch = sc.city.toLowerCase().includes(q);
      const serviceMatch = sc.services.some((s) => s.toLowerCase().includes(q));
      if (searchMode === "service" && !serviceMatch && !nameMatch) return false;
      if (searchMode === "center" && !nameMatch && !cityMatch) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621] flex flex-col">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-20 py-6">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-5">
          {/* Breadcrumb + Title */}
          <div>
            <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-1.5">
              <Link href="/" className="hover:text-[#FF4B19] transition-colors">
                Home
              </Link>
              <span className="material-symbols-outlined text-xs">
                chevron_right
              </span>
              <Link
                href="/services"
                className="hover:text-[#FF4B19] transition-colors"
              >
                Services
              </Link>
              <span className="material-symbols-outlined text-xs">
                chevron_right
              </span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                All Centers
              </span>
            </nav>
            <h1 className="text-3xl font-black tracking-tight">
              Book a Service
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Find trusted service centers for inspections &amp; diagnostics in
              Cairo &amp; Alexandria
            </p>
          </div>

          {/* Toggle + Search + Location */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            {/* Mode toggle */}
            <div className="flex p-1 bg-[#f6f6f8] dark:bg-slate-800 rounded-xl shrink-0">
              <button
                onClick={() => setSearchMode("service")}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                  searchMode === "service"
                    ? "bg-white dark:bg-slate-700 text-[#FF4B19] shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Search by Service
              </button>
              <button
                onClick={() => setSearchMode("center")}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                  searchMode === "center"
                    ? "bg-white dark:bg-slate-700 text-[#FF4B19] shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Search by Center
              </button>
            </div>

            {/* Search input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#f6f6f8] dark:bg-slate-800 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/20 text-sm"
                placeholder={
                  searchMode === "service"
                    ? "e.g. General Inspection, Brake Check, Engine Diagnostic..."
                    : "e.g. Elite Auto Haus, Precision Motors..."
                }
              />
            </div>

            {/* Location input */}
            <div className="relative lg:w-60">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                location_on
              </span>
              <input
                className="w-full pl-12 pr-4 py-3 bg-[#f6f6f8] dark:bg-slate-800 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/20 text-sm font-medium"
                defaultValue="Cairo, Egypt"
              />
            </div>
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            {filterBtn("workshop", "home_repair_service", "At Workshop")}
            {filterBtn("mobile", "car_repair", "Mobile Service")}
            {filterBtn("available", "event_available", "Available Today")}
            {filterBtn("topRated", "star", "Top Rated")}
          </div>
        </div>
      </div>

      {/* Main Content — split layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1440px] w-full mx-auto">
        {/* Left — Results list */}
        <div className="w-full lg:w-1/2 p-6 lg:pl-20 lg:pr-8 overflow-y-auto">
          {/* Result count + sort */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {filtered.length} center{filtered.length !== 1 ? "s" : ""} found
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              Sort by:
              <select className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none pr-1 cursor-pointer">
                <option>Relevance</option>
                <option>Highest Rated</option>
                <option>Distance</option>
              </select>
            </div>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-4">
            {filtered.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">
                  search_off
                </span>
                <p className="font-semibold">No centers match your filters</p>
                <p className="text-sm mt-1">
                  {initialCenters.length === 0
                    ? "No service centers are available yet. Check back soon!"
                    : "Try adjusting your search or filters."}
                </p>
              </div>
            )}
            {filtered.map((sc) => (
              <div
                key={sc.id}
                className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="w-1/3 min-w-[130px] relative shrink-0">
                  {sc.image ? (
                    <img
                      src={sc.image}
                      alt={sc.name}
                      className="w-full h-full object-cover min-h-[140px]"
                    />
                  ) : (
                    <div className="w-full min-h-[140px] h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500">
                        home_repair_service
                      </span>
                    </div>
                  )}
                  {sc.badge && (
                    <div
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sc.badge === "Mobile Service"
                          ? "bg-[#FF4B19] text-white"
                          : "bg-white/90 dark:bg-slate-900/90 text-[#FF4B19]"
                      }`}
                    >
                      {sc.badge}
                    </div>
                  )}
                  {sc.availableToday && (
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                      Available Today
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base leading-tight">
                        {sc.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[#FF4B19] font-bold text-sm shrink-0">
                        <span
                          className="material-symbols-outlined text-sm"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        {sc.rating.toFixed(1)}{" "}
                        <span className="text-slate-400 font-normal">
                          ({sc.reviewCount.toLocaleString()})
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-base">
                        location_on
                      </span>
                      {sc.city}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {sc.specializations.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-500 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sc.services.slice(0, 3).map((svc) => (
                        <span
                          key={svc}
                          className="px-2 py-0.5 bg-[#f6f6f8] dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 rounded"
                        >
                          {svc}
                        </span>
                      ))}
                      {sc.services.length > 3 && (
                        <span className="px-2 py-0.5 bg-[#f6f6f8] dark:bg-slate-800 text-[11px] font-medium text-slate-400 rounded">
                          +{sc.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {sc.completedBookings.toLocaleString()} bookings completed
                    </p>
                    <Link
                      href={`/services/${sc.id}`}
                      className="px-5 py-2 bg-[#FF4B19] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Map placeholder */}
        <div className="hidden lg:block lg:w-1/2 relative bg-slate-200 dark:bg-slate-800 sticky top-0 h-[calc(100vh-200px)]">
          {/* Abstract map grid */}
          <div className="absolute inset-0 overflow-hidden opacity-30">
            <div className="absolute top-1/4 left-0 w-full h-px bg-slate-400 dark:bg-slate-600" />
            <div className="absolute top-1/2 left-0 w-full h-px bg-slate-400 dark:bg-slate-600" />
            <div className="absolute top-3/4 left-0 w-full h-px bg-slate-400 dark:bg-slate-600" />
            <div className="absolute top-0 left-1/4 w-px h-full bg-slate-400 dark:bg-slate-600" />
            <div className="absolute top-0 left-1/2 w-px h-full bg-slate-400 dark:bg-slate-600" />
            <div className="absolute top-0 left-3/4 w-px h-full bg-slate-400 dark:bg-slate-600" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_40%_50%,_rgba(255,75,25,0.08),_transparent_60%)]" />
          </div>

          {/* Dynamic map pins from visible results */}
          {filtered.slice(0, 3).map((sc, i) => {
            const positions = [
              { top: "38%", left: "28%" },
              { top: "55%", left: "58%" },
              { top: "25%", left: "65%" },
            ];
            const pos = positions[i] ?? { top: "50%", left: "50%" };
            return (
              <div
                key={sc.id}
                className="absolute flex flex-col items-center"
                style={pos}
              >
                <div
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg mb-1 whitespace-nowrap ${
                    i === 0
                      ? "bg-[#FF4B19] text-white"
                      : "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-600"
                  }`}
                >
                  {sc.name.split(" ").slice(0, 3).join(" ")}
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 shadow-lg ${
                    i === 0 ? "bg-[#FF4B19]" : "bg-slate-400"
                  }`}
                />
              </div>
            );
          })}

          {/* Map controls */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-2">
            <button className="w-10 h-10 bg-white dark:bg-slate-800 shadow-lg rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-xl">
                my_location
              </span>
            </button>
          </div>

          {/* Map coming soon overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-8 py-5 rounded-2xl shadow-lg">
              <span className="material-symbols-outlined text-4xl text-[#FF4B19] mb-2 block">
                map
              </span>
              <p className="font-black text-slate-700 dark:text-slate-200">
                Interactive Map
              </p>
              <p className="text-xs text-slate-400 mt-1">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
