"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { GOVERNORATES, getAreas, tGov, tArea } from "@/lib/locationData";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30";

const PHOTO_SLOTS = [
  { labelKey: "photoStorefront", required: true },
  { labelKey: "photoWorkshop", required: true },
  { labelKey: "photoInventory", required: true },
  { labelKey: "photoTeam", required: false },
  { labelKey: "photoEquipment", required: false },
  { labelKey: "photoAdditional", required: false },
] as const;

/** Canvas-based JPEG compression — same as product uploader */
async function compressImage(
  file: File,
  maxBytes = 4 * 1024 * 1024,
): Promise<File> {
  if (file.size <= maxBytes) return file;
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 2000;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            if (blob.size <= maxBytes || quality <= 0.4) {
              resolve(
                new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                  type: "image/jpeg",
                }),
              );
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          "image/jpeg",
          quality,
        );
      };
      tryCompress();
    };
    img.src = url;
  });
}

export default function VendorLocationPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, localePath, locale } = useLanguage();

  const [form, setForm] = useState({
    governorate: "",
    city: "",
    address: "",
    maps_link: "",
  });
  // One file per slot (index matches PHOTO_SLOTS)
  const [photos, setPhotos] = useState<(File | null)[]>(Array(6).fill(null));
  const [previews, setPreviews] = useState<(string | null)[]>(
    Array(6).fill(null),
  );
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function pickPhoto(index: number, file: File) {
    const compressed = await compressImage(file);
    const previewUrl = URL.createObjectURL(compressed);
    setPhotos((prev) => {
      const n = [...prev];
      n[index] = compressed;
      return n;
    });
    setPreviews((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]!);
      const n = [...prev];
      n[index] = previewUrl;
      return n;
    });
  }

  async function handleSubmit() {
    if (process.env.NEXT_PUBLIC_SKIP_APPLY_VALIDATION === "true") {
      router.push(localePath("/vendor/apply/status"));
      return;
    }
    if (!form.governorate || !form.city || !form.address || !form.maps_link) {
      setError("Please fill in all required fields.");
      return;
    }
    // Validate required photo slots (0=storefront, 1=workshop, 2=inventory)
    const requiredMissing = PHOTO_SLOTS.slice(0, 3).some((_, i) => !photos[i]);
    if (requiredMissing) {
      setError(
        t("vendor.applyPages.photoRequiredError") ??
          "Please upload the 3 required shop photos.",
      );
      return;
    }

    const applicationId =
      typeof window !== "undefined"
        ? localStorage.getItem("vendorApplicationId")
        : null;

    if (!applicationId) {
      setError("Application not found. Please start from step 1.");
      return;
    }

    setSaving(true);
    setError(null);

    // Upload photos to vendor-documents bucket
    const uploadedUrls: string[] = [];
    for (let i = 0; i < PHOTO_SLOTS.length; i++) {
      const file = photos[i];
      if (!file) {
        uploadedUrls.push("");
        continue;
      }
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `shop-photos/${applicationId}/${PHOTO_SLOTS[i].labelKey}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("vendor-documents")
        .upload(path, file, { upsert: true });
      if (upErr) {
        setError(`Photo upload failed: ${upErr.message}`);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("vendor-documents")
        .getPublicUrl(path);
      uploadedUrls.push(urlData.publicUrl);
    }

    const { error: dbError } = await supabase
      .from("vendor_applications")
      .update({
        governorate: form.governorate,
        city: form.city,
        address: form.address,
        maps_link: form.maps_link,
        shop_photos: uploadedUrls.filter(Boolean),
        step_completed: 4,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (dbError) {
      setError(dbError.message ?? "Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("vendorApplicationId");
    }

    setSaving(false);
    router.push(localePath("/vendor/apply/status"));
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">
            {t("vendor.applyPages.locationTitle")}
          </h1>
          <p className="text-slate-500">
            {t("vendor.applyPages.locationSubtitle")}
          </p>
        </div>

        <OnboardingProgress currentStep={4} />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
          <h2 className="text-xl font-black">
            {t("vendor.applyPages.step4Location")}
          </h2>

          {error && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Governorate + City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("vendor.applyPages.governorate")} *
              </label>
              <select
                className={inputCls}
                value={form.governorate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    governorate: e.target.value,
                    city: "",
                  }))
                }
              >
                <option value="">
                  {t("vendor.applyPages.selectGovernorate")}
                </option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {tGov(g, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("vendor.applyPages.cityDistrict")} *
              </label>
              <select
                className={inputCls}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                disabled={!form.governorate}
              >
                <option value="">{t("vendor.applyPages.selectCity")}</option>
                {getAreas(form.governorate).map((a) => (
                  <option key={a} value={a}>
                    {tArea(a, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Street address */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              {t("vendor.applyPages.fullAddress")} *
            </label>
            <textarea
              rows={2}
              className={inputCls + " resize-none"}
              placeholder={t("vendor.applyPages.addressPlaceholder")}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          {/* Google Maps link */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              {t("vendor.applyPages.googleMapsLink")} *
            </label>
            <input
              className={inputCls}
              placeholder={t("vendor.applyPages.mapLinkPlaceholder")}
              value={form.maps_link}
              onChange={(e) => set("maps_link", e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">
              {t("vendor.applyPages.mapLinkHint")}
            </p>
          </div>

          {/* Shop photos */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-3">
              {t("vendor.applyPages.shopPhotos")}
            </label>
            <p className="text-xs text-slate-400 mb-4">
              {t("vendor.applyPages.shopPhotosHint")}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {PHOTO_SLOTS.map((slot, i) => (
                <div key={slot.labelKey}>
                  {/* hidden file input per slot */}
                  <input
                    ref={(el) => {
                      fileInputRefs.current[i] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void pickPhoto(i, f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[i]?.click()}
                    className={`relative w-full aspect-square border-2 border-dashed rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1 transition-colors ${
                      previews[i]
                        ? "border-[#FF4B19]"
                        : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19]"
                    }`}
                  >
                    {previews[i] ? (
                      <>
                        <Image
                          src={previews[i]!}
                          alt={
                            t(`vendor.applyPages.${slot.labelKey}`) ??
                            slot.labelKey
                          }
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        {/* Change overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="material-symbols-outlined text-white text-2xl">
                            edit
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-slate-300 text-2xl">
                          add_photo_alternate
                        </span>
                        <p className="text-xs text-slate-400 text-center px-1">
                          {t(`vendor.applyPages.${slot.labelKey}`)}
                          {slot.required && (
                            <span className="text-red-400"> *</span>
                          )}
                        </p>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Link
              href={localePath("/vendor/apply/operations")}
              className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              {t("vendor.applyPages.back")}
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[#FF4B19]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving
                ? t("vendor.applyPages.submitting")
                : t("vendor.applyPages.submitApplication")}
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
