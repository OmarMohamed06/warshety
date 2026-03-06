"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks";
import type { Part } from "@/types";

interface ProductCardProps {
  part: Part;
  categorySlug: string;
  subcategorySlug: string;
}

/** Maps part categories to Material Symbols icon names */
const CATEGORY_ICONS: Record<string, string> = {
  brakes: "minor_crash",
  engine: "settings",
  suspension: "construction",
  filters: "oil_barrel",
  electrical: "bolt",
  cooling: "thermostat",
  transmission: "settings_input_component",
  exhaust: "air",
  steering: "360",
  fuel: "local_gas_station",
  body: "directions_car",
  lighting: "lightbulb",
  tyres: "tire_repair",
  interior: "airline_seat_recline_normal",
  ac: "ac_unit",
  battery: "battery_charging_full",
};

function partIcon(part: Part): string {
  return CATEGORY_ICONS[part.category] ?? "construction";
}

function partBadge(part: Part): "OEM" | "Aftermarket" | "Used" | undefined {
  if (part.condition === "used") return "Used";
  if (part.oemNumber) return "OEM";
  return undefined;
}

export default function ProductCard({
  part,
  categorySlug,
  subcategorySlug,
}: ProductCardProps) {
  const { addItem, isInCart, getItemQty, changeQty } = useCart();
  const [adding, setAdding] = useState(false);

  const inCart = isInCart(part.id);
  const qty = getItemQty(part.id);

  const discount = part.originalPrice
    ? Math.round(((part.originalPrice - part.price) / part.originalPrice) * 100)
    : null;

  const href = `/parts/${categorySlug}/${subcategorySlug}/${part.id}`;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) return;
    setAdding(true);
    addItem({
      id: part.id,
      name: part.name,
      vendor: part.vendorName,
      vendorId: part.vendorId,
      sku: part.oemNumber ?? part.partNumber ?? part.id,
      compatible: part.compatibleVehicles?.[0] ?? "",
      price: part.price,
      icon: partIcon(part),
      badge: partBadge(part),
      image: part.images?.[0],
      stock: part.stock,
    });
    setTimeout(() => setAdding(false), 600);
  }

  function handleQtyChange(e: React.MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    changeQty(part.id, delta);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19] hover:shadow-xl transition-all group flex flex-col">
      {/* ── Clickable image + main content area ── */}
      <Link href={href} className="flex flex-col flex-1">
        {/* Product image */}
        <div className="relative h-48 bg-slate-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
          {part.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={part.images[0]}
              alt={part.name}
              className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="material-symbols-outlined text-6xl text-slate-300">
              {partIcon(part)}
            </span>
          )}

          {/* Discount badge */}
          {discount && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}

          {/* Condition badge */}
          {part.condition !== "new" && (
            <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full capitalize">
              {part.condition}
            </span>
          )}

          {/* In-cart overlay indicator */}
          {inCart && (
            <span className="absolute bottom-3 right-3 bg-[#FF4B19] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "12px" }}
              >
                shopping_cart
              </span>
              {qty}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="p-4 flex-1 flex flex-col">
          <p className="text-xs text-slate-400 font-medium mb-1">
            {part.brand}
          </p>
          <h3 className="font-bold text-sm leading-snug mb-2 line-clamp-2 flex-1">
            {part.name}
          </h3>

          {/* Compatibility tags */}
          {part.compatibleVehicles?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {part.compatibleVehicles.slice(0, 2).map((v) => (
                <span
                  key={v}
                  className="text-[10px] bg-[#FF4B19]/10 text-[#FF4B19] font-bold px-2 py-0.5 rounded"
                >
                  ✓ {v}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-black text-[#FF4B19]">
              {formatPrice(part.price)}
            </span>
            {part.originalPrice && (
              <span className="text-xs text-slate-400 line-through">
                {formatPrice(part.originalPrice)}
              </span>
            )}
          </div>

          {/* Rating & vendor */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <span
                className="material-symbols-outlined text-[#FF4B19] text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {part.rating}
              </span>
              <span>({part.reviewCount})</span>
            </div>
            <span className="text-slate-500 truncate max-w-[100px]">
              {part.vendorName}
            </span>
          </div>

          {/* Low stock warning */}
          {part.stock > 0 && part.stock < 5 && (
            <p className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "13px" }}
              >
                warning
              </span>
              Only {part.stock} left in stock
            </p>
          )}

          {part.installationAvailable && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1 text-xs text-green-600 font-semibold">
              <span className="material-symbols-outlined text-sm">build</span>
              Installation available
            </div>
          )}
        </div>
      </Link>

      {/* ── Add to Cart action bar (outside Link, no navigation) ── */}
      <div className="px-4 pb-4">
        {inCart ? (
          /* Qty stepper when already in cart */
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 flex-1 bg-[#FF4B19]/8 border border-[#FF4B19]/20 rounded-xl overflow-hidden">
              <button
                onClick={(e) => handleQtyChange(e, -1)}
                className="w-9 h-9 flex items-center justify-center hover:bg-[#FF4B19]/10 transition-colors text-[#FF4B19]"
                aria-label="Decrease quantity"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px" }}
                >
                  remove
                </span>
              </button>
              <span className="flex-1 text-center text-sm font-black text-[#FF4B19]">
                {qty}
              </span>
              <button
                onClick={(e) => handleQtyChange(e, 1)}
                className="w-9 h-9 flex items-center justify-center hover:bg-[#FF4B19]/10 transition-colors text-[#FF4B19]"
                aria-label="Increase quantity"
                disabled={part.stock !== undefined && qty >= part.stock}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px" }}
                >
                  add
                </span>
              </button>
            </div>
            <span className="text-xs font-bold text-[#FF4B19] whitespace-nowrap">
              In Cart
            </span>
          </div>
        ) : (
          /* Add to cart button */
          <button
            onClick={handleAddToCart}
            disabled={part.stock === 0 || adding}
            className={`w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              part.stock === 0
                ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                : adding
                  ? "bg-[#FF4B19]/80 text-white scale-95"
                  : "bg-[#FF4B19] text-white hover:bg-[#e03d0f] active:scale-95 shadow-sm shadow-[#FF4B19]/20"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
            >
              {part.stock === 0
                ? "remove_shopping_cart"
                : adding
                  ? "check"
                  : "add_shopping_cart"}
            </span>
            {part.stock === 0
              ? "Out of Stock"
              : adding
                ? "Added!"
                : "Add to Cart"}
          </button>
        )}
      </div>
    </div>
  );
}
