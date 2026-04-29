"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks";
import type { Part } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  PackageX,
  Wrench,
} from "lucide-react";

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

  const { localePath, locale } = useLanguage();
  const isAr = locale === "ar";

  const discount = part.originalPrice
    ? Math.round(((part.originalPrice - part.price) / part.originalPrice) * 100)
    : null;

  const href = localePath(
    `/parts/${categorySlug}/${subcategorySlug}/${part.slug ?? part.id}`,
  );

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
    <Card className="group overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all flex flex-col">
      {/* â”€â”€ Clickable image + content â”€â”€ */}
      <Link href={href} className="flex flex-col flex-1">
        {/* Image */}
        <div className="relative bg-muted h-44 flex items-center justify-center overflow-hidden">
          {part.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={part.images[0]}
              alt={part.name}
              className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="material-symbols-outlined text-5xl text-muted-foreground/40 group-hover:text-primary/40 transition-colors">
              {partIcon(part)}
            </span>
          )}
          {discount && (
            <Badge
              variant="destructive"
              className="absolute top-2.5 left-2.5 text-[10px] px-1.5"
            >
              -{discount}%
            </Badge>
          )}
          {part.condition !== "new" && (
            <Badge
              variant="outline"
              className="absolute top-2.5 right-2.5 text-[10px] capitalize"
            >
              {part.condition === "used"
                ? isAr
                  ? "مستعمل"
                  : "Used"
                : isAr
                  ? "مجدد"
                  : "Refurbished"}
            </Badge>
          )}
          {inCart && (
            <Badge className="absolute bottom-2.5 right-2.5 gap-1 text-[10px]">
              <ShoppingCart className="h-3 w-3" />
              {qty}
            </Badge>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {part.brand}
          </p>
          <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2 flex-1">
            {part.name}
          </h3>

          {/* Part number */}
          {(part.partNumber ?? part.oemNumber) && (
            <p className="text-[10px] font-mono text-muted-foreground mb-2 truncate">
              # {part.partNumber ?? part.oemNumber}
            </p>
          )}

          {/* Part type + condition badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            {part.partType && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  part.partType === "oem"
                    ? "bg-blue-100 text-blue-700"
                    : part.partType === "original"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {part.partType}
              </span>
            )}
          </div>

          {/* Compatibility — structured fitment row */}

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-base font-black text-primary">
              {formatPrice(part.price)}
            </span>
            {part.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(part.originalPrice)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">
                {part.rating}
              </span>
              <span>({part.reviewCount})</span>
            </div>
            <span className="truncate max-w-[90px]">{part.vendorName}</span>
          </div>

          {part.stock > 0 && part.stock < 5 && (
            <p className="mt-1.5 text-[10px] font-bold text-amber-600 flex items-center gap-1">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "12px" }}
              >
                warning
              </span>
              {isAr ? `باقي ${part.stock} فقط` : `Only ${part.stock} left`}
            </p>
          )}

          {part.installationAvailable && (
            <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-green-600 font-semibold">
              <Wrench className="h-3 w-3" />{" "}
              {isAr ? "التركيب متاح" : "Installation available"}
            </div>
          )}
        </CardContent>
      </Link>

      {/* â”€â”€ Cart action â”€â”€ */}
      <div className="px-4 pb-4">
        {inCart ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 border border-primary/30 rounded-lg overflow-hidden bg-primary/5">
              <button
                onClick={(e) => handleQtyChange(e, -1)}
                className="w-9 h-9 flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex-1 text-center text-sm font-black text-primary">
                {qty}
              </span>
              <button
                onClick={(e) => handleQtyChange(e, 1)}
                className="w-9 h-9 flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
                disabled={part.stock !== undefined && qty >= part.stock}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-xs font-bold text-primary whitespace-nowrap">
              {isAr ? "في السلة" : "In Cart"}
            </span>
          </div>
        ) : (
          <Button
            onClick={handleAddToCart}
            disabled={part.stock === 0 || adding}
            className="w-full h-9"
            variant={part.stock === 0 ? "outline" : "default"}
          >
            {part.stock === 0 ? (
              <>
                <PackageX className="h-3.5 w-3.5 mr-1.5" />
                {isAr ? "نفذت الكمية" : "Out of Stock"}
              </>
            ) : adding ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                {isAr ? "تم الإضافة!" : "Added!"}
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                {isAr ? "أضف إلى السلة" : "Add to Cart"}
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
