"use client";

import { useEffect, useRef, useState } from "react";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

export default function VendorLegalPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, localePath } = useLanguage();

  const [file, setFile] = useState<File | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPartsSeller, setIsPartsSeller] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPartsSeller(localStorage.getItem("vendorType") === "parts_seller");
    }
  }, []);

  // Load saved national_id_url from DB on mount
  useEffect(() => {
    const applicationId =
      typeof window !== "undefined"
        ? localStorage.getItem("vendorApplicationId")
        : null;
    if (!applicationId) return;
    supabase
      .from("vendor_applications")
      .select("national_id_url")
      .eq("id", applicationId)
      .single()
      .then(({ data }) => {
        if (data?.national_id_url) setExistingUrl(data.national_id_url);
      });
  }, []);

  async function handleContinue() {
    // ── DEV ONLY: bypass validation for quick testing ──────────────────────────
    if (process.env.NEXT_PUBLIC_SKIP_APPLY_VALIDATION === "true") {
      router.push(
        localePath(
          isPartsSeller ? "/vendor/apply/bank" : "/vendor/apply/operations",
        ),
      );
      return;
    }

    if (!file && !existingUrl) {
      setError(t("vendor.applyPages.legalErrorNoFile"));
      return;
    }

    // If no new file selected but we already have one saved, just advance
    if (!file && existingUrl) {
      router.push(
        localePath(
          isPartsSeller ? "/vendor/apply/bank" : "/vendor/apply/operations",
        ),
      );
      return;
    }

    const applicationId =
      typeof window !== "undefined"
        ? localStorage.getItem("vendorApplicationId")
        : null;

    if (!applicationId) {
      setError(t("vendor.applyPages.legalErrorNotFound"));
      return;
    }

    setSaving(true);
    setError(null);

    // Upload file to Supabase Storage
    const ext = file!.name.split(".").pop();
    const path = `national-ids/${applicationId}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("vendor-documents")
      .upload(path, file!, { upsert: true });

    if (uploadErr) {
      setError(uploadErr.message ?? t("vendor.applyPages.legalErrorUpload"));
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("vendor-documents")
      .getPublicUrl(path);

    const { error: dbError } = await supabase
      .from("vendor_applications")
      .update({
        national_id_url: urlData.publicUrl,
        step_completed: 2,
      })
      .eq("id", applicationId);

    if (dbError) {
      setError(dbError.message ?? "Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push(
      localePath(
        isPartsSeller ? "/vendor/apply/bank" : "/vendor/apply/operations",
      ),
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">
            {t("vendor.applyPages.legalTitle")}
          </h1>
          <p className="text-slate-500">
            {t("vendor.applyPages.legalSubtitle")}
          </p>
        </div>

        <OnboardingProgress
          currentStep={2}
          stepsType={isPartsSeller ? "ps" : "sc"}
        />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-black mb-2">
            {t("vendor.applyPages.legalIdentityTitle")}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {t("vendor.applyPages.legalIdentityDesc")}
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* National ID upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setError(null);
            }}
          />

          {/* Already uploaded indicator */}
          {existingUrl && !file && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>
              <span>
                {t("vendor.applyPages.legalAlreadyUploaded") ??
                  "Document already uploaded. You can continue or replace it."}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-all ${
              file || existingUrl
                ? "border-[#FF4B19] bg-[#FF4B19]/5"
                : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19]/60"
            }`}
          >
            <span className="material-symbols-outlined text-4xl text-slate-400">
              {file || existingUrl ? "check_circle" : "upload_file"}
            </span>
            <div className="text-center">
              <p className="font-bold text-sm">
                {file
                  ? file.name
                  : existingUrl
                    ? (t("vendor.applyPages.legalUploadChange") ??
                      "Replace document")
                    : t("vendor.applyPages.legalUploadLabel")}
                {!file && !existingUrl && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {file
                  ? `${(file.size / 1024).toFixed(0)} KB — ${t("vendor.applyPages.legalUploadChange")}`
                  : t("vendor.applyPages.legalUploadHint")}
              </p>
            </div>
          </button>

          <div className="mt-8 flex items-center justify-between">
            <Link
              href={localePath("/vendor/apply/form")}
              className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              {t("vendor.applyPages.back")}
            </Link>
            <button
              onClick={handleContinue}
              disabled={saving}
              className="px-8 py-3 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[#FF4B19]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving
                ? t("vendor.applyPages.saving")
                : t("vendor.applyPages.continueBtn")}
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
