"use client";

import { useEffect, useRef, useState } from "react";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

// ── localStorage draft helpers ─────────────────────────────────────────────
function getDraft(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("vendorDraft") ?? "{}");
  } catch {
    return {};
  }
}
function saveDraft(updates: Record<string, unknown>) {
  localStorage.setItem(
    "vendorDraft",
    JSON.stringify({ ...getDraft(), ...updates }),
  );
}

export default function VendorLegalPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, localePath } = useLanguage();

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [isPartsSeller, setIsPartsSeller] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPartsSeller(localStorage.getItem("vendorType") === "parts_seller");
    }
  }, []);

  // Load saved URLs from localStorage draft on mount
  useEffect(() => {
    const draft = getDraft();
    if (draft.national_id_front_url)
      setFrontUrl(draft.national_id_front_url as string);
    if (draft.national_id_back_url)
      setBackUrl(draft.national_id_back_url as string);
  }, []);

  async function uploadFile(
    file: File,
    slot: "front" | "back",
    tempId: string,
  ): Promise<string | null> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `national-ids/${tempId}-${slot}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("vendor-documents")
      .upload(path, file, { upsert: true });
    if (uploadErr) {
      setError(uploadErr.message ?? t("vendor.applyPages.legalErrorUpload"));
      return null;
    }
    const { data: urlData } = supabase.storage
      .from("vendor-documents")
      .getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function handleContinue() {
    if (process.env.NEXT_PUBLIC_SKIP_APPLY_VALIDATION === "true") {
      router.push(
        localePath(
          isPartsSeller ? "/vendor/apply/bank" : "/vendor/apply/operations",
        ),
      );
      return;
    }

    const hasFront = frontFile || frontUrl;
    const hasBack = backFile || backUrl;

    if (!hasFront || !hasBack) {
      setError("Please upload both the front and back of your national ID.");
      return;
    }

    // If no new files selected but both already saved, just advance
    if (!frontFile && !backFile && frontUrl && backUrl) {
      router.push(
        localePath(
          isPartsSeller ? "/vendor/apply/bank" : "/vendor/apply/operations",
        ),
      );
      return;
    }

    const draft = getDraft();
    const tempId = draft.tempId as string | undefined;
    if (!tempId) {
      setError(t("vendor.applyPages.legalErrorNotFound"));
      return;
    }

    setSaving(true);
    setError(null);

    let newFrontUrl = frontUrl;
    let newBackUrl = backUrl;

    if (frontFile) {
      newFrontUrl = await uploadFile(frontFile, "front", tempId);
      if (!newFrontUrl) {
        setSaving(false);
        return;
      }
    }
    if (backFile) {
      newBackUrl = await uploadFile(backFile, "back", tempId);
      if (!newBackUrl) {
        setSaving(false);
        return;
      }
    }

    saveDraft({
      national_id_front_url: newFrontUrl,
      national_id_back_url: newBackUrl,
    });

    setSaving(false);
    router.push(
      localePath(
        isPartsSeller ? "/vendor/apply/bank" : "/vendor/apply/operations",
      ),
    );
  }

  function UploadSlot({
    label,
    file,
    existingUrl,
    inputRef,
    slot,
    onChange,
  }: {
    label: string;
    file: File | null;
    existingUrl: string | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
    slot: string;
    onChange: (f: File) => void;
  }) {
    const hasContent = file || existingUrl;
    return (
      <div className="flex-1">
        <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
          {label} <span className="text-red-500">*</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onChange(f);
              setError(null);
            }
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 transition-all ${
            hasContent
              ? "border-[#FF4B19] bg-[#FF4B19]/5"
              : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19]/60"
          }`}
        >
          <span className="material-symbols-outlined text-3xl text-slate-400">
            {hasContent ? "check_circle" : "upload_file"}
          </span>
          <div className="text-center">
            <p className="font-bold text-xs">
              {file
                ? file.name
                : existingUrl
                  ? "Uploaded — click to replace"
                  : "Click to upload"}
            </p>
            {file && (
              <p className="text-xs text-slate-400 mt-0.5">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
            {!file && !existingUrl && (
              <p className="text-xs text-slate-400 mt-0.5">JPG, PNG or PDF</p>
            )}
          </div>
        </button>
      </div>
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

          {/* Front + Back ID upload */}
          <div className="flex flex-col sm:flex-row gap-4">
            <UploadSlot
              label={t("vendor.applyPages.legalIdFront") ?? "Front of ID"}
              file={frontFile}
              existingUrl={frontUrl}
              inputRef={frontInputRef}
              slot="front"
              onChange={setFrontFile}
            />
            <UploadSlot
              label={t("vendor.applyPages.legalIdBack") ?? "Back of ID"}
              file={backFile}
              existingUrl={backUrl}
              inputRef={backInputRef}
              slot="back"
              onChange={setBackFile}
            />
          </div>

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
