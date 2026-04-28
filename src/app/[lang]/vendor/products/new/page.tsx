"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import VendorLayout from "@/components/vendor/VendorLayout";
import { StepIndicator } from "@/components/vendor/products/StepIndicator";
import { BasicInfoForm } from "@/components/vendor/products/BasicInfoForm";
import { PricingForm } from "@/components/vendor/products/PricingForm";
import { VehicleFitmentForm } from "@/components/vendor/products/VehicleFitmentForm";
import { ImageUploader } from "@/components/vendor/products/ImageUploader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Save,
} from "lucide-react";
import type {
  WizardState,
  ProductFormData,
  PricingFormData,
  VehicleFormRow,
} from "@/types/vendor-products";

function emptyWizard(): WizardState {
  return {
    step: 1,
    productInfo: {
      name_en: "",
      name_ar: "",
      brand: "",
      part_number: "",
      category: "",
      subcategory: "",
      description: "",
      condition: "",
      part_type: "",
    },
    pricing: {
      price: "",
      discount_percent: "0",
      stock_quantity: "",
    },
    vehicles: [],
    imageFiles: [],
    submitting: false,
    error: null,
  };
}

export default function NewProductPage() {
  const router = useRouter();
  const { vendor } = useAuth();
  const { localePath, t } = useLanguage();
  const STEP_LABELS = [
    t("vendor.wpStep1"),
    t("vendor.wpStep2"),
    t("vendor.wpStep3"),
    t("vendor.wpStep4"),
  ];
  const [state, setState, clearState] = useLocalStorage<WizardState>(
    "vendor_new_product_draft",
    emptyWizard(),
  );
  const [done, setDone] = useState(false);
  // imageFiles are kept in plain state — File objects can't be JSON-serialised
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  // productId persisted across refreshes so we can continue saving to the same row
  const [savedProductId, setSavedProductId, clearProductId] = useLocalStorage<
    string | null
  >("vendor_new_product_id", null);
  const productIdRef = useRef<string | null>(savedProductId);

  // Keep ref in sync with persisted value
  useEffect(() => {
    productIdRef.current = savedProductId;
  }, [savedProductId]);

  // If the page was refreshed mid-save, `submitting` may be stuck as true in
  // the persisted draft. Reset it on mount so the button is never locked.
  useEffect(() => {
    setState((s) =>
      s.submitting ? { ...s, submitting: false, error: null } : s,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateProductInfo(field: keyof ProductFormData, value: string) {
    setState((s) => ({
      ...s,
      productInfo: { ...s.productInfo, [field]: value },
    }));
  }

  function updatePricing(field: keyof PricingFormData, value: string) {
    setState((s) => ({
      ...s,
      pricing: { ...s.pricing, [field]: value },
    }));
  }

  function updateVehicles(vehicles: VehicleFormRow[]) {
    setState((s) => ({ ...s, vehicles }));
  }

  function updateImages(files: File[]) {
    setImageFiles(files);
  }

  // ── Validation ────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (state.step === 1) {
      const p = state.productInfo;
      return (
        p.name_en.trim().length > 0 &&
        p.name_ar.trim().length > 0 &&
        p.brand.trim().length > 0 &&
        p.part_number.trim().length > 0 &&
        p.category.trim().length > 0 &&
        p.subcategory.trim().length > 0 &&
        p.description.trim().length > 0 &&
        p.condition.length > 0 &&
        p.part_type.length > 0
      );
    }
    if (state.step === 2) {
      const price = parseFloat(state.pricing.price);
      const stock = parseInt(state.pricing.stock_quantity, 10);
      return !isNaN(price) && price > 0 && !isNaN(stock) && stock >= 0;
    }
    return true;
  }

  // ── Save current step, then advance ──────────────────────────
  async function handleNext() {
    if (!vendor) return;
    setState((s) => ({ ...s, submitting: true, error: null }));

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      // ── Step 1: create the draft product ─────────────────────
      if (state.step === 1) {
        const { data: product, error } = await db
          .from("products")
          .insert({
            vendor_id: vendor.id,
            name:
              state.productInfo.name_en.trim() ||
              state.productInfo.name_ar.trim(),
            name_en: state.productInfo.name_en.trim() || null,
            name_ar: state.productInfo.name_ar.trim() || null,
            brand: state.productInfo.brand.trim() || null,
            description: state.productInfo.description.trim() || null,
            part_number: state.productInfo.part_number.trim() || null,
            category: state.productInfo.category || "other",
            subcategory: state.productInfo.subcategory || null,
            condition: state.productInfo.condition || "new",
            part_type: state.productInfo.part_type || null,
            // temporary defaults so NOT NULL constraints pass
            price: 0,
            stock: 0,
            active: false,
          })
          .select()
          .single();

        if (error || !product)
          throw new Error(error?.message ?? "Failed to create product");
        productIdRef.current = product.id;
        setSavedProductId(product.id);
      }

      // ── Step 2: save pricing ──────────────────────────────────
      if (state.step === 2 && productIdRef.current) {
        const rawPrice = parseFloat(state.pricing.price);
        const discountPct = parseFloat(state.pricing.discount_percent) || 0;
        const effectivePrice = rawPrice * (1 - discountPct / 100);
        const { error } = await db
          .from("products")
          .update({
            original_price: discountPct > 0 ? rawPrice : null,
            price: discountPct > 0 ? effectivePrice : rawPrice,
            stock: parseInt(state.pricing.stock_quantity, 10),
          })
          .eq("id", productIdRef.current)
          .eq("vendor_id", vendor.id);

        if (error) throw new Error(error.message);
      }

      // ── Step 3: save vehicle fitment ──────────────────────────
      if (state.step === 3 && productIdRef.current) {
        await db
          .from("product_vehicles")
          .delete()
          .eq("product_id", productIdRef.current);
        if (state.vehicles.length > 0) {
          const rows = state.vehicles.map((v) => ({
            product_id: productIdRef.current,
            make: v.make.trim(),
            model: v.model.trim(),
            engine: v.engine.trim() || null,
            fuel_type: v.fuel_type || null,
            power_hp: v.power_hp ? parseInt(v.power_hp, 10) : null,
            year_from: v.year_from ? parseInt(v.year_from, 10) : null,
            year_to: v.year_to ? parseInt(v.year_to, 10) : null,
          }));
          const { error } = await db.from("product_vehicles").insert(rows);
          if (error)
            throw new Error(`Failed to save vehicles: ${error.message}`);
        }
      }

      // advance
      setState((s) => ({
        ...s,
        step: (s.step + 1) as WizardState["step"],
        submitting: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        submitting: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }

  // ── Final step: upload images & finish ────────────────────────
  async function handlePublish() {
    if (!vendor || !productIdRef.current) return;
    const productId = productIdRef.current;
    setState((s) => ({ ...s, submitting: true, error: null }));

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      // Upload all images in parallel, then do a single DB write
      const uploadedUrls: string[] = await Promise.all(
        imageFiles.map(async (file, i) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${vendor.id}/${productId}/${i}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(path, file, { upsert: true });

          if (uploadError) {
            throw new Error(
              `Image ${i + 1} upload failed: ${uploadError.message}`,
            );
          }

          const { data: urlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(path);

          return urlData.publicUrl;
        }),
      );

      // Save all image URLs in one DB call
      if (uploadedUrls.length > 0) {
        const { error: imgError } = await db
          .from("products")
          .update({ images: uploadedUrls })
          .eq("id", productId)
          .eq("vendor_id", vendor.id);
        if (imgError)
          throw new Error(`Saving images failed: ${imgError.message}`);
      }

      // Mark product active and set main thumbnail (image_url = first image)
      await db
        .from("products")
        .update({
          active: true,
          ...(uploadedUrls.length > 0 ? { image_url: uploadedUrls[0] } : {}),
        })
        .eq("id", productId)
        .eq("vendor_id", vendor.id);

      clearState();
      clearProductId();
      setImageFiles([]);
      setDone(true);
    } catch (err) {
      setState((s) => ({
        ...s,
        submitting: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }

  // ── Success screen ────────────────────────────────────────────
  if (done) {
    return (
      <VendorLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {t("vendor.wpPublished")}
          </h1>
          <p className="text-slate-500 mb-8 max-w-sm">
            {t("vendor.wpPublishedDesc")}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                productIdRef.current = null;
                clearState();
                clearProductId();
                setImageFiles([]);
                setDone(false);
              }}
            >
              {t("vendor.wpAddAnother")}
            </Button>
            <Button onClick={() => router.push(localePath("/vendor/products"))}>
              {t("vendor.wpBackToProducts")}
            </Button>
          </div>
        </div>
      </VendorLayout>
    );
  }

  const isLastStep = state.step === 4;

  return (
    <VendorLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("vendor.wpTitle")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t("vendor.wpStepOf", { step: state.step, total: 4 })} —{" "}
              {STEP_LABELS[state.step - 1]}
            </p>
          </div>
          {productIdRef.current && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <Save className="h-3.5 w-3.5" />
              {t("vendor.wpSaved")}
            </span>
          )}
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={state.step} labels={STEP_LABELS} />

        {/* Form card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[320px]">
          {state.step === 1 && (
            <BasicInfoForm
              data={state.productInfo}
              onChange={updateProductInfo}
            />
          )}
          {state.step === 2 && (
            <PricingForm data={state.pricing} onChange={updatePricing} />
          )}
          {state.step === 3 && (
            <VehicleFitmentForm
              vehicles={state.vehicles}
              onChange={updateVehicles}
            />
          )}
          {state.step === 4 && (
            <ImageUploader files={imageFiles} onChange={updateImages} />
          )}
        </div>

        {/* Error message */}
        {state.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() =>
              setState((s) => ({
                ...s,
                step: (s.step - 1) as WizardState["step"],
              }))
            }
            disabled={state.step === 1 || state.submitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("vendor.wpBack")}
          </Button>

          {isLastStep ? (
            <Button
              onClick={handlePublish}
              disabled={state.submitting}
              className="min-w-[140px]"
            >
              {state.submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("vendor.wpPublishing")}
                </>
              ) : (
                t("vendor.wpPublishProduct")
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canAdvance() || state.submitting}
              className="min-w-[120px]"
            >
              {state.submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("vendor.wpSavingLabel")}
                </>
              ) : (
                <>
                  {t("vendor.wpSaveNext")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
