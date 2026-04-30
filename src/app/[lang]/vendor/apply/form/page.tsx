"use client";

import { useState, useTransition, useEffect } from "react";
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
  try { return JSON.parse(localStorage.getItem("vendorDraft") ?? "{}"); } catch { return {}; }
}
function saveDraft(updates: Record<string, unknown>) {
  localStorage.setItem("vendorDraft", JSON.stringify({ ...getDraft(), ...updates }));
}

export default function VendorApplyFormPage() {
  const router = useRouter();
  const { t, localePath, locale } = useLanguage();
  const [, startTransition] = useTransition();

  const VENDOR_TYPE_OPTIONS = [
    {
      value: "service_center" as VendorType,
      label: t("vendor.applyPages.vendorTypeServiceCenter"),
    },
    {
      value: "parts_seller" as VendorType,
      label: t("vendor.applyPages.vendorTypePartsSeller"),
    },
  ];

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    email: "",
    phone: "",
    vendor_type: "service_center" as VendorType,
    city: "",
    vendor_password: "",
    confirm_password: "",
  });
  const [governorate, setGovernorate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  // true when a draft already exists (password already set)
  const [hasDraft, setHasDraft] = useState(false);

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const draft = getDraft();
    if (!draft.tempId) return;
    setHasDraft(true);
    setForm((f) => ({
      ...f,
      business_name: (draft.business_name as string) ?? "",
      owner_name: (draft.owner_name as string) ?? "",
      email: (draft.email as string) ?? "",
      phone: (draft.phone as string) ?? "",
      vendor_type: (draft.vendor_type as VendorType) ?? "service_center",
      city: (draft.city as string) ?? "",
    }));
    if (draft.governorate) setGovernorate(draft.governorate as string);
    if (draft.vendor_type)
      localStorage.setItem("vendorType", draft.vendor_type as string);
  }, []);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleContinue() {
    // ── DEV ONLY: bypass validation for quick testing ──────────────────────────
    if (process.env.NEXT_PUBLIC_SKIP_APPLY_VALIDATION === "true") {
      saveDraft({ tempId: "test-id", vendor_type: form.vendor_type });
      localStorage.setItem("vendorType", form.vendor_type);
      startTransition(() => { router.push(localePath("/vendor/apply/legal")); });
      return;
    }
    if (
      !form.business_name ||
      !form.owner_name ||
      !form.email ||
      !form.phone ||
      !governorate ||
      !form.city
    ) {
      setError(t("vendor.applyPages.errorRequiredFields"));
      return;
    }

    // Password only required on first visit (no existing draft)
    if (!hasDraft) {
      if (form.vendor_password.length < 8) {
        setError(t("vendor.applyPages.errorPasswordLength"));
        return;
      }
      if (form.vendor_password !== form.confirm_password) {
        setError(t("vendor.applyPages.errorPasswordMatch"));
        return;
      }
    }

    setError(null);

    const draft = getDraft();
    const tempId = (draft.tempId as string) || crypto.randomUUID();
    saveDraft({
      tempId,
      business_name: form.business_name,
      owner_name: form.owner_name,
      email: form.email,
      // Only overwrite password if a new one was entered
      ...(form.vendor_password ? { password: form.vendor_password } : {}),
      phone: form.phone,
      vendor_type: form.vendor_type,
      governorate,
      city: form.city,
    });
    localStorage.setItem("vendorType", form.vendor_type);

    startTransition(() => { router.push(localePath("/vendor/apply/legal")); });
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
                {t("vendor.applyPages.businessType")} *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VENDOR_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.vendor_type === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bizType"
                      className="accent-primary"
                      checked={form.vendor_type === opt.value}
                      onChange={() => set("vendor_type", opt.value)}
                    />
                    <span className="text-sm font-semibold">{opt.label}</span>
                  </label>
                ))}
              </div>
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

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-5">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 20 }}
              >
                lock
              </span>
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {t("vendor.applyPages.vendorCredentials")}
              </h3>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {t("vendor.applyPages.credentialsNote")}
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("vendor.applyPages.vendorLoginEmail")} *
              </label>
              <input
                type="email"
                className={inputCls}
                placeholder="vendor@yourbusiness.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="new-password"
                readOnly={hasDraft}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                {t("vendor.applyPages.businessEmailHint")}
              </p>
            </div>

            {!hasDraft && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    {t("vendor.applyPages.passwordLabel")} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      className={inputCls + " pr-10"}
                      placeholder={t("vendor.applyPages.passwordPlaceholder")}
                      value={form.vendor_password}
                      onChange={(e) => set("vendor_password", e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      tabIndex={-1}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18 }}
                      >
                        {showPass ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    {t("vendor.applyPages.confirmPassword")} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      className={
                        inputCls +
                        " pr-10" +
                        (form.confirm_password &&
                        form.confirm_password !== form.vendor_password
                          ? " border-red-400 focus:ring-red-300"
                          : "")
                      }
                      placeholder={t(
                        "vendor.applyPages.confirmPasswordPlaceholder",
                      )}
                      value={form.confirm_password}
                      onChange={(e) => set("confirm_password", e.target.value)}
                      autoComplete="new-password"
                    />
                    {form.confirm_password &&
                      form.confirm_password !== form.vendor_password && (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 material-symbols-outlined"
                          style={{ fontSize: 18 }}
                        >
                          error
                        </span>
                      )}
                    {form.confirm_password &&
                      form.confirm_password === form.vendor_password && (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 material-symbols-outlined"
                          style={{ fontSize: 18 }}
                        >
                          check_circle
                        </span>
                      )}
                  </div>
                </div>
              </div>
            )}
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
