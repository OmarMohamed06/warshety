"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import { submitVendorApplication } from "@/app/actions/adminActions";
import { useLanguage } from "@/context/LanguageContext";

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

export default function VendorAccountPage() {
  const router = useRouter();
  const { t, localePath } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorType, setVendorType] = useState<
    "service_center" | "parts_seller"
  >("service_center");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const vt = localStorage.getItem("vendorType");
      if (vt === "parts_seller") setVendorType("parts_seller");
    }
  }, []);

  const isPartsSeller = vendorType === "parts_seller";
  const backHref = localePath(
    isPartsSeller ? "/vendor/apply/operations" : "/vendor/apply/location",
  );

  async function handleSubmit() {
    setError(null);

    if (!email.trim()) {
      setError(
        t("vendor.applyPages.errorEmailRequired") ?? "Email is required.",
      );
      return;
    }
    if (password.length < 8) {
      setError(
        t("vendor.applyPages.errorPasswordLength") ??
          "Password must be at least 8 characters.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError(
        t("vendor.applyPages.errorPasswordMismatch") ??
          "Passwords do not match.",
      );
      return;
    }

    const draft = getDraft();
    if (!draft.tempId) {
      setError(t("vendor.applyPages.errorDraftNotFound"));
      return;
    }

    setSaving(true);

    const result = await submitVendorApplication({
      email: email.trim(),
      password,
      business_name: (draft.business_name as string) ?? "",
      owner_name: (draft.owner_name as string) ?? "",
      vendor_type: (draft.vendor_type as string) ?? vendorType,
      phone: (draft.phone as string) ?? "",
      governorate: draft.governorate as string | undefined,
      city: draft.city as string | undefined,
      national_id_url: (draft.national_id_front_url ??
        draft.national_id_url) as string | undefined,
      national_id_front_url: draft.national_id_front_url as string | undefined,
      national_id_back_url: draft.national_id_back_url as string | undefined,
      bank_name: draft.bank_name as string | undefined,
      account_name: draft.account_name as string | undefined,
      account_number: draft.account_number as string | undefined,
      iban: draft.iban as string | undefined,
      working_days: draft.working_days as string[] | undefined,
      open_time: draft.open_time as string | undefined,
      close_time: draft.close_time as string | undefined,
      specializations: draft.specializations as string[] | undefined,
      supported_makes: draft.supported_makes as string[] | undefined,
      delivery_options: draft.delivery_options as string[] | undefined,
      return_policy: draft.return_policy as string | undefined,
      address: draft.address as string | undefined,
      maps_link: draft.maps_link as string | undefined,
      shop_photos: draft.shop_photos as string[] | undefined,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Clear draft, store application ID for status page
    localStorage.removeItem("vendorDraft");
    if (result.applicationId) {
      localStorage.setItem("vendorApplicationId", result.applicationId);
    }

    router.push(localePath("/vendor/apply/status"));
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6">
            <span className="material-symbols-outlined text-white text-3xl">
              lock
            </span>
          </div>
          <h1 className="text-3xl font-black mb-2">
            {t("vendor.applyPages.accountTitle") ?? "Create Your Account"}
          </h1>
          <p className="text-slate-500">
            {t("vendor.applyPages.accountSubtitle") ??
              "Set up your vendor login credentials to submit your application."}
          </p>
        </div>

        <OnboardingProgress
          currentStep={5}
          stepsType={isPartsSeller ? "ps" : "sc"}
        />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
          <h2 className="text-xl font-black">
            {t("vendor.applyPages.vendorCredentials") ?? "Vendor Credentials"}
          </h2>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            {t("vendor.applyPages.credentialsNote") ??
              "These credentials will be used to log in to your vendor dashboard once your application is approved."}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              <span
                className="material-symbols-outlined shrink-0"
                style={{ fontSize: "18px" }}
              >
                error
              </span>
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              {t("vendor.applyPages.vendorLoginEmail") ?? "Email Address"} *
            </label>
            <input
              type="email"
              className={inputCls}
              placeholder="vendor@yourbusiness.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="new-password"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              {t("vendor.applyPages.businessEmailHint") ??
                "Use a business email you check regularly."}
            </p>
          </div>

          {/* Password + Confirm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("vendor.applyPages.passwordLabel") ?? "Password"} *
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className={inputCls + " pr-10"}
                  placeholder={
                    t("vendor.applyPages.passwordPlaceholder") ??
                    "Min. 8 characters"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {t("vendor.applyPages.confirmPassword") ?? "Confirm Password"} *
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className={
                    inputCls +
                    " pr-10" +
                    (confirmPassword && confirmPassword !== password
                      ? " border-red-400 focus:ring-red-300"
                      : "")
                  }
                  placeholder={
                    t("vendor.applyPages.confirmPasswordPlaceholder") ??
                    "Repeat password"
                  }
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {confirmPassword && confirmPassword !== password && (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    error
                  </span>
                )}
                {confirmPassword && confirmPassword === password && (
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

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => router.push(backHref)}
              className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              ← {t("vendor.applyPages.back") ?? "Back"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">
                    progress_activity
                  </span>
                  {t("vendor.applyPages.saving") ?? "Submitting..."}
                </>
              ) : (
                <>
                  {t("vendor.applyPages.submitApplication") ??
                    "Submit Application"}
                  <span className="material-symbols-outlined text-sm">
                    send
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
