"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { type PricingFormData } from "@/types/vendor-products";
import { Package, DollarSign, Tag } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface PricingFormProps {
  data: PricingFormData;
  onChange: (field: keyof PricingFormData, value: string) => void;
}

export function PricingForm({ data, onChange }: PricingFormProps) {
  const { t } = useLanguage();
  const price = parseFloat(data.price) || 0;
  const stock = parseInt(data.stock_quantity) || 0;
  const discountPct = Math.min(
    99,
    Math.max(0, parseFloat(data.discount_percent) || 0),
  );
  const finalPrice = discountPct > 0 ? price * (1 - discountPct / 100) : price;
  const savings = price - finalPrice;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t("vendor.wpPricingTitle")}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {t("vendor.wpPricingSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Price */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm font-medium">
              {t("vendor.wpOriginalPrice")}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">
              {t("vendor.wpPriceEGP")} <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                EGP
              </span>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={data.price}
                onChange={(e) => onChange("price", e.target.value)}
                placeholder="0.00"
                className="pl-12"
              />
            </div>
          </div>
          {price > 0 && discountPct === 0 && (
            <p className="text-xs text-slate-500">
              {t("vendor.wpListedAt", { price: price.toLocaleString() })}
            </p>
          )}
        </div>

        {/* Stock */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium">
              {t("vendor.wpStockQuantity")}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">
              {t("vendor.wpUnitsInStock")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={data.stock_quantity}
              onChange={(e) => onChange("stock_quantity", e.target.value)}
              placeholder="0"
            />
          </div>
          {stock > 0 ? (
            <p className="text-xs text-green-600 font-medium">
              ✓ {t("vendor.wpUnitsAvailable", { stock })}
            </p>
          ) : data.stock_quantity !== "" ? (
            <p className="text-xs text-amber-600 font-medium">
              ⚠ {t("vendor.wpOutOfStockWarn")}
            </p>
          ) : null}
        </div>
      </div>

      {/* Discount */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Tag className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <span className="text-sm font-medium">
              {t("vendor.wpDiscountOptional")}
            </span>
            <p className="text-xs text-slate-400">
              {t("vendor.wpDiscountHint")}
            </p>
          </div>
          {discountPct > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              -{discountPct}% OFF
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="discount_percent">
              {t("vendor.wpDiscountPct")}
            </Label>
            <div className="relative">
              <Input
                id="discount_percent"
                type="number"
                min="0"
                max="99"
                step="1"
                value={data.discount_percent}
                onChange={(e) => {
                  const val = Math.min(
                    99,
                    Math.max(0, parseInt(e.target.value) || 0),
                  );
                  onChange("discount_percent", String(val));
                }}
                placeholder="0"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                %
              </span>
            </div>
          </div>

          {price > 0 && discountPct > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 space-y-1">
              <p className="text-xs text-slate-500">
                {t("vendor.wpOriginalLabel")}{" "}
                <span className="line-through text-slate-400">
                  EGP {price.toLocaleString()}
                </span>
              </p>
              <p className="text-base font-black text-red-600">
                EGP{" "}
                {finalPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-green-600 font-semibold">
                {t("vendor.wpCustomerSaves", {
                  amount: savings.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }),
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
