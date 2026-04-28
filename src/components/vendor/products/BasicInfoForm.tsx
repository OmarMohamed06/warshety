"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRODUCT_CATEGORIES,
  CATEGORY_SUBCATEGORIES,
  PART_TYPES,
  type ProductFormData,
} from "@/types/vendor-products";
import { useLanguage } from "@/context/LanguageContext";

interface BasicInfoFormProps {
  data: ProductFormData;
  onChange: (field: keyof ProductFormData, value: string) => void;
}

export function BasicInfoForm({ data, onChange }: BasicInfoFormProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t("vendor.wpBasicTitle")}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {t("vendor.wpBasicSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Product Name EN */}
        <div className="space-y-1.5">
          <Label htmlFor="name_en">
            {t("vendor.wpProductNameEn")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name_en"
            value={data.name_en}
            onChange={(e) => onChange("name_en", e.target.value)}
            placeholder={t("vendor.wpProductNameEnPH")}
            className={!data.name_en ? "border-red-400" : ""}
            dir="ltr"
          />
        </div>

        {/* Product Name AR */}
        <div className="space-y-1.5">
          <Label htmlFor="name_ar">
            {t("vendor.wpProductNameAr")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name_ar"
            value={data.name_ar}
            onChange={(e) => onChange("name_ar", e.target.value)}
            placeholder={t("vendor.wpProductNameArPH")}
            className={!data.name_ar ? "border-red-400" : ""}
            dir="rtl"
          />
        </div>

        {/* Brand */}
        <div className="space-y-1.5">
          <Label htmlFor="brand">
            {t("vendor.wpBrand")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="brand"
            value={data.brand}
            onChange={(e) => onChange("brand", e.target.value)}
            placeholder={t("vendor.wpBrandPH")}
            className={!data.brand ? "border-red-400" : ""}
          />
        </div>

        {/* Part Number */}
        <div className="space-y-1.5">
          <Label htmlFor="part_number">
            {t("vendor.wpPartNumber")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="part_number"
            value={data.part_number}
            onChange={(e) => onChange("part_number", e.target.value)}
            placeholder={t("vendor.wpPartNumberPH")}
            className={`font-mono${!data.part_number ? " border-red-400" : ""}`}
          />
        </div>

        {/* Condition */}
        <div className="space-y-1.5">
          <Label htmlFor="condition">
            {t("vendor.wpConditionLabel")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.condition}
            onValueChange={(val) => onChange("condition", val ?? "")}
          >
            <SelectTrigger
              id="condition"
              className={!data.condition ? "border-red-400" : ""}
            >
              <SelectValue placeholder={t("vendor.wpSelectCondition")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">{t("vendor.wpConditionNew")}</SelectItem>
              <SelectItem value="used">
                {t("vendor.wpConditionUsed")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Part Type */}
        <div className="space-y-1.5">
          <Label htmlFor="part_type">
            {t("vendor.wpPartTypeLabel")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.part_type}
            onValueChange={(val) => onChange("part_type", val ?? "")}
          >
            <SelectTrigger
              id="part_type"
              className={!data.part_type ? "border-red-400" : ""}
            >
              <SelectValue placeholder={t("vendor.wpSelectPartType")} />
            </SelectTrigger>
            <SelectContent className="w-full">
              {PART_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>
                  {pt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="category">
            {t("vendor.wpCategoryLabel")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.category}
            onValueChange={(val) => {
              onChange("category", val ?? "");
              onChange("subcategory", "");
            }}
          >
            <SelectTrigger
              id="category"
              className={
                !data.category ? "border-red-400 focus:ring-red-400" : ""
              }
            >
              <SelectValue placeholder={t("vendor.wpSelectCategory")} />
            </SelectTrigger>
            <SelectContent className="w-full">
              {PRODUCT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!data.category && (
            <p className="text-xs text-red-500 mt-0.5">
              {t("vendor.wpCategoryRequired")}
            </p>
          )}
        </div>

        {/* Subcategory */}
        <div className="space-y-1.5">
          <Label htmlFor="subcategory">
            {t("vendor.wpSubcategoryLabel")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.subcategory}
            onValueChange={(val) => onChange("subcategory", val ?? "")}
            disabled={!data.category}
          >
            <SelectTrigger
              id="subcategory"
              className={!data.subcategory ? "border-red-400" : ""}
            >
              <SelectValue
                placeholder={
                  data.category
                    ? t("vendor.wpSelectSubcategory")
                    : t("vendor.wpSelectCategoryFirst")
                }
              />
            </SelectTrigger>
            <SelectContent className="w-full">
              {(CATEGORY_SUBCATEGORIES[data.category] ?? []).map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="description">
            {t("vendor.wpDescriptionLabel")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <textarea
            id="description"
            value={data.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onChange("description", e.target.value)
            }
            placeholder={t("vendor.wpDescriptionPH")}
            rows={4}
            className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none${!data.description ? " border-red-400" : " border-input"}`}
          />
        </div>
      </div>
    </div>
  );
}
