"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import type { VendorType } from "@/types/database";
import { useLanguage } from "@/context/LanguageContext";
import { GOVERNORATES, getAreas, tGov, tArea } from "@/lib/locationData";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

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

export default function VendorApplyFormPage() {
  const router = useRouter();
  const { t, localePath, locale } = useLanguage();

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    phone: "",
    vendor_type: "service_center" as VendorType,
    city: "",
  });
  const [governorate, setGovernorate] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Restore draft from localStorage on mount
  useEffect(() => {
    const draft = getDraft();
    if (!draft.tempId) return; // no draft yet
    setForm({
      business_name: (draft.business_name as string) ?? "",
      owner_name: (draft.owner_name as string) ?? "",
      phone: (draft.phone as string) ?? "",
      vendor_type: (draft.vendor_type as VendorType) ?? "service_center",
      city: (draft.city as string) ?? "",
    });
    if (draft.governorate) setGovernorate(draft.governorate as string);
    if (draft.vendor_type)
      localStorage.setItem("vendorType", draft.vendor_type as string);
  }, []);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleContinue() {
    if (process.env.NEXT_PUBLIC_SKIP_APPLY_VALIDATION === "true") {
      localStorage.setItem("vendorType", form.vendor_type);
      router.push(localePath("/vendor/apply/legal"));
      return;
    }
    if (
      !form.business_name ||
      !form.owner_name ||
      !form.phone ||
      !governorate ||
      !form.city
    ) {
      setError(t("vendor.applyPages.errorRequiredFields"));
      return;
    }

    const draft = getDraft();
    const tempId = (draft.tempId as string) || crypto.randomUUID();

    saveDraft({
      tempId,
      business_name: form.business_name,
      owner_name: form.owner_name,
      phone: form.phone,
      vendor_type: form.vendor_type,
      governorate,
      city: form.city,
    });
    localStorage.setItem("vendorType", form.vendor_type);
    router.push(localePath("/vendor/apply/legal"));
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6">
            <span className="material-symbols-outlined text-white text-3xl">
              storefront
            </span>
          </div>
          <h1 className="text-4xl font-black mb-3">
            {t("vendor.applyPages.applyAsVendor")}
          </h1>
          <p className="text-slate-500 text-lg">
            {t("vendor.applyPages.applyFormSubtitle")}
          </p>
        </div>

        <OnboardingProgress currentStep={1} />

        {/* Application form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-black mb-6">
            {t("vendor.applyPages.step1BasicInfo")}
          </h2>

          {error && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              <span
                className="material-symbols-outlined shrink-0"
                style={{ fontSize: "18px" }}
              >
                error
              </span>
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  {t("vendor.applyPages.businessName")} *
                </label>
                <input
                  className={inputCls}
                  placeholder={t("vendor.applyPages.businessNamePlaceholder")}
                  value={form.business_name}
                  onChange={(e) => set("business_name", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  {t("vendor.applyPages.ownerFullName")} *
                </label>
                <input
                  className={inputCls}
                  placeholder={t("vendor.applyPages.ownerFullNamePlaceholder")}
                  value={form.owner_name}
                  onChange={(e) => set("owner_name", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("vendor.applyPages.phoneNumberLabel")} *
              </label>
              <input
                type="tel"
                className={inputCls}
                placeholder="+20 1XX XXX XXXX"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("vendor.applyPages.governorate")} *
              </label>
              <select
                className={inputCls}
                value={governorate}
                onChange={(e) => {
                  setGovernorate(e.target.value);
                  set("city", "");
                }}
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
                disabled={!governorate}
              >
                <option value="">{t("vendor.applyPages.selectCity")}</option>
                {getAreas(governorate).map((a) => (
                  <option key={a} value={a}>
                    {tArea(a, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {t("vendor.applyPages.requiredFields")}
            </p>
            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              {t("vendor.applyPages.continueBtn")}
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
