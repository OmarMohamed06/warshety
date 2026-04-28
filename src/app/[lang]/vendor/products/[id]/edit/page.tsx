"use client";

import { useState, useEffect, use } from "react";
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
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import type {
  WizardState,
  ProductFormData,
  PricingFormData,
  VehicleFormRow,
} from "@/types/vendor-products";

const STEP_LABELS = ["Basic Info", "Pricing", "Vehicles", "Images"];

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

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { vendor } = useAuth();
  const { localePath } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>(emptyWizard());
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  // ── Load existing product data ─────────────────────────────────────────────
  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setLoadError(null);

      try {
        // ── Live DB ─────────────────────────────────────────────────────────
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = supabase as any;

        const { data: product, error: pErr } = await s
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (pErr || !product) {
          setLoadError(pErr?.message ?? "Product not found.");
          return;
        }

        const { data: vehicles } = await s
          .from("product_vehicles")
          .select("*")
          .eq("product_id", id);

        const { data: imagesData } = await s
          .from("products")
          .select("images")
          .eq("id", id)
          .single();
        setExistingImageUrls(
          Array.isArray(imagesData?.images) ? imagesData.images : [],
        );

        setState({
          step: 1,
          productInfo: {
            name_en: product.name_en ?? product.name ?? "",
            name_ar: product.name_ar ?? "",
            brand: product.brand ?? "",
            part_number: product.part_number ?? "",
            category: product.category ?? "",
            subcategory: product.subcategory ?? "",
            description: product.description ?? "",
            condition: product.condition ?? "",
            part_type: product.part_type ?? "",
          },
          pricing: {
            price: String(product.original_price ?? product.price ?? ""),
            discount_percent: product.original_price
              ? String(
                  Math.round(
                    (1 - product.price / product.original_price) * 100,
                  ),
                )
              : "0",
            stock_quantity: String(product.stock ?? ""),
          },
          vehicles: (vehicles ?? []).map(
            (v: {
              id: string;
              make: string | null;
              model: string | null;
              engine: string | null;
              fuel_type: string | null;
              power_hp: number | null;
              year_from: number | null;
              year_to: number | null;
            }) => ({
              _key: v.id,
              make: v.make ?? "",
              model: v.model ?? "",
              engine: v.engine ?? "",
              fuel_type: v.fuel_type ?? "",
              power_hp: v.power_hp != null ? String(v.power_hp) : "",
              year_from: v.year_from != null ? String(v.year_from) : "",
              year_to: v.year_to != null ? String(v.year_to) : "",
            }),
          ),
          imageFiles: [],
          submitting: false,
          error: null,
        });
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load product.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  // ── State helpers ──────────────────────────────────────────────────────────
  function setStep(step: number) {
    setState((s) => ({ ...s, step: step as WizardState["step"] }));
  }

  function updateProductInfo(field: keyof ProductFormData, value: string) {
    setState((s) => ({
      ...s,
      productInfo: { ...s.productInfo, [field]: value },
    }));
  }

  function updatePricing(field: keyof PricingFormData, value: string) {
    setState((s) => ({ ...s, pricing: { ...s.pricing, [field]: value } }));
  }

  function updateVehicles(vehicles: VehicleFormRow[]) {
    setState((s) => ({ ...s, vehicles }));
  }

  function updateImages(imageFiles: File[]) {
    setState((s) => ({ ...s, imageFiles }));
  }

  // ── Validation ─────────────────────────────────────────────────────────────
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

  // ── Save / Update ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!vendor) return;
    setState((s) => ({ ...s, submitting: true, error: null }));

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = supabase as any;

      // 1. Update core product
      const rawPrice = parseFloat(state.pricing.price);
      const discountPct = parseFloat(state.pricing.discount_percent) || 0;
      const effectivePrice =
        discountPct > 0 ? rawPrice * (1 - discountPct / 100) : rawPrice;

      const { error: updateErr } = await s
        .from("products")
        .update({
          name:
            state.productInfo.name_en.trim() ||
            state.productInfo.name_ar.trim(),
          name_en: state.productInfo.name_en.trim() || null,
          name_ar: state.productInfo.name_ar.trim() || null,
          brand: state.productInfo.brand.trim() || null,
          part_number: state.productInfo.part_number.trim() || null,
          category: state.productInfo.category || "other",
          subcategory: state.productInfo.subcategory || null,
          description: state.productInfo.description.trim() || null,
          price: effectivePrice,
          original_price: discountPct > 0 ? rawPrice : null,
          stock: parseInt(state.pricing.stock_quantity, 10),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("vendor_id", vendor.id);

      if (updateErr) throw new Error(updateErr.message);

      // 2. Replace vehicle fitment rows (delete + re-insert)
      await s.from("product_vehicles").delete().eq("product_id", id);
      if (state.vehicles.length > 0) {
        const vehicleRows = state.vehicles.map((v) => ({
          product_id: id,
          make: v.make.trim(),
          model: v.model.trim(),
          engine: v.engine.trim() || null,
          fuel_type: v.fuel_type || null,
          power_hp: v.power_hp ? parseInt(v.power_hp, 10) : null,
          year_from: v.year_from ? parseInt(v.year_from, 10) : null,
          year_to: v.year_to ? parseInt(v.year_to, 10) : null,
        }));
        const { error: vErr } = await s
          .from("product_vehicles")
          .insert(vehicleRows);
        if (vErr) throw new Error(`Vehicle update failed: ${vErr.message}`);
      }

      // 3. Upload any newly added images
      const newUrls: string[] = [];
      for (let i = 0; i < state.imageFiles.length; i++) {
        const file = state.imageFiles[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${vendor.id}/${id}/edit-${Date.now()}-${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { upsert: true });
        if (uploadErr)
          throw new Error(`Image ${i + 1} upload failed: ${uploadErr.message}`);
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        const { error: imgErr } = await s
          .from("products")
          .update({
            images: [...existingImageUrls, ...newUrls, urlData.publicUrl],
          })
          .eq("id", id);
        if (imgErr)
          throw new Error(`Image ${i + 1} record failed: ${imgErr.message}`);
        newUrls.push(urlData.publicUrl);
      }

      // Update main thumbnail if first image changed
      const allUrls = [...existingImageUrls, ...newUrls];
      if (allUrls.length > 0) {
        await s.from("products").update({ image_url: allUrls[0] }).eq("id", id);
      }

      setDone(true);
    } catch (err) {
      setState((s) => ({
        ...s,
        submitting: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <VendorLayout>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
          <div className="bg-white border border-slate-200 rounded-2xl p-6 h-72 animate-pulse" />
        </div>
      </VendorLayout>
    );
  }

  // ── Load error ─────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <VendorLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Could not load product
          </h2>
          <p className="text-slate-500 text-sm max-w-xs">{loadError}</p>
          <Button
            variant="outline"
            onClick={() => router.push(localePath("/vendor/products"))}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </VendorLayout>
    );
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <VendorLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Product Updated!
          </h1>
          <p className="text-slate-500 mb-8 max-w-sm">
            Your changes have been saved and are now live on your product
            listing.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDone(false);
                setState((s) => ({ ...s, step: 1 }));
              }}
            >
              Continue Editing
            </Button>
            <Button onClick={() => router.push(localePath("/vendor/products"))}>
              Back to Products
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
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(localePath("/vendor/products"))}
            className="mt-0.5 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
            <p className="text-sm text-slate-500 mt-1">
              Step {state.step} of 4 — {STEP_LABELS[state.step - 1]}
            </p>
          </div>
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
            <ImageUploader
              existingUrls={existingImageUrls}
              onRemoveExisting={async (url) => {
                const updatedUrls = existingImageUrls.filter((u) => u !== url);
                const s2 = createClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                await s2
                  .from("products")
                  .update({ images: updatedUrls })
                  .eq("id", id);
                setExistingImageUrls(updatedUrls);
              }}
              files={state.imageFiles}
              onChange={updateImages}
            />
          )}
        </div>

        {/* Error */}
        {state.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(state.step - 1)}
            disabled={state.step === 1 || state.submitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            {/* Save at any step */}
            {!isLastStep && (
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={state.submitting || !canAdvance()}
              >
                {state.submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}

            {isLastStep ? (
              <Button
                onClick={handleSave}
                disabled={state.submitting}
                className="min-w-[140px]"
              >
                {state.submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setStep(state.step + 1)}
                disabled={!canAdvance()}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </VendorLayout>
  );
}
