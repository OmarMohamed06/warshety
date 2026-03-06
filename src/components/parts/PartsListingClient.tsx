"use client";

/**
 * PartsListingClient — client-side filter + grid for the parts listing page.
 *
 * Receives the full parts array from the server component (which handles
 * metadata + initial data fetch). Owns the filter state, applies all active
 * filters (vehicle compatibility, condition, price, rating, stock), and
 * renders FilterSidebar + ProductCard grid.
 */

import { useMemo, useState } from "react";
import FilterSidebar, {
  type FilterState,
} from "@/components/parts/FilterSidebar";
import ProductCard from "@/components/parts/ProductCard";
import { useVehicle } from "@/hooks";
import type { Part } from "@/types";

interface PartsListingClientProps {
  parts: Part[];
  categorySlug: string;
  subcategorySlug: string;
}

type SortOption = "best" | "price-asc" | "price-desc" | "rating" | "newest";

export default function PartsListingClient({
  parts,
  categorySlug,
  subcategorySlug,
}: PartsListingClientProps) {
  const { filterCompatible, hasActiveVehicle, compatibilityString } =
    useVehicle();

  const [filters, setFilters] = useState<FilterState>({
    condition: "all",
    priceMin: "",
    priceMax: "",
    inStockOnly: false,
    minRating: 0,
    compatibleOnly: hasActiveVehicle,
  });

  const [sort, setSort] = useState<SortOption>("best");

  const filtered = useMemo(() => {
    let result = [...parts];

    // 1. Vehicle compatibility filter
    if (filters.compatibleOnly && hasActiveVehicle) {
      result = filterCompatible(result);
    }

    // 2. Condition
    if (filters.condition !== "all") {
      result = result.filter((p) => p.condition === filters.condition);
    }

    // 3. Price range
    if (filters.priceMin !== "") {
      result = result.filter((p) => p.price >= Number(filters.priceMin));
    }
    if (filters.priceMax !== "") {
      result = result.filter((p) => p.price <= Number(filters.priceMax));
    }

    // 4. Rating
    if (filters.minRating > 0) {
      result = result.filter((p) => p.rating >= filters.minRating);
    }

    // 5. In stock
    if (filters.inStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    // 6. Sort
    switch (sort) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        // No date field yet — maintain original order as proxy
        break;
      default:
        // "best" — sort by rating × reviewCount score
        result.sort(
          (a, b) =>
            b.rating * Math.log(b.reviewCount + 1) -
            a.rating * Math.log(a.reviewCount + 1),
        );
    }

    return result;
  }, [parts, filters, sort, filterCompatible, hasActiveVehicle]);

  const activeFilterCount = [
    filters.condition !== "all",
    filters.priceMin !== "",
    filters.priceMax !== "",
    filters.inStockOnly,
    filters.minRating > 0,
    filters.compatibleOnly && hasActiveVehicle,
  ].filter(Boolean).length;

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <FilterSidebar onFilterChange={setFilters} />
      </div>

      {/* Results */}
      <div className="flex-1 min-w-0">
        {/* Sort + results bar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-slate-500">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "result" : "results"}
              {parts.length !== filtered.length && (
                <span className="text-slate-400"> of {parts.length}</span>
              )}
            </p>

            {/* Active filter chips */}
            {filters.compatibleOnly && hasActiveVehicle && (
              <span className="flex items-center gap-1 text-[11px] font-bold bg-[#FF4B19]/10 text-[#FF4B19] px-2.5 py-1 rounded-full">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "13px" }}
                >
                  directions_car
                </span>
                {compatibilityString}
                <button
                  onClick={() =>
                    setFilters((f) => ({ ...f, compatibleOnly: false }))
                  }
                  className="ml-0.5 hover:opacity-70"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "13px" }}
                  >
                    close
                  </span>
                </button>
              </span>
            )}
            {activeFilterCount >
              (filters.compatibleOnly && hasActiveVehicle ? 1 : 0) && (
              <button
                onClick={() =>
                  setFilters({
                    condition: "all",
                    priceMin: "",
                    priceMax: "",
                    inStockOnly: false,
                    minRating: 0,
                    compatibleOnly: false,
                  })
                }
                className="text-[11px] font-bold text-slate-400 hover:text-[#FF4B19] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
          >
            <option value="best">Sort: Best Match</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span
                className="material-symbols-outlined text-slate-400"
                style={{ fontSize: "36px" }}
              >
                search_off
              </span>
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">
              No parts match your filters
            </p>
            <p className="text-sm text-slate-400 mb-6">
              {filters.compatibleOnly && hasActiveVehicle
                ? `No compatible parts found for ${compatibilityString}. Try turning off the compatibility filter.`
                : "Try adjusting or clearing your filters."}
            </p>
            <button
              onClick={() =>
                setFilters({
                  condition: "all",
                  priceMin: "",
                  priceMax: "",
                  inStockOnly: false,
                  minRating: 0,
                  compatibleOnly: false,
                })
              }
              className="px-6 py-2.5 bg-[#FF4B19] text-white text-sm font-bold rounded-xl hover:bg-[#e03d0f] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((part) => (
              <ProductCard
                key={part.id}
                part={part}
                categorySlug={categorySlug}
                subcategorySlug={subcategorySlug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
