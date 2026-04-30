"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import { useLanguage } from "@/context/LanguageContext";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30";

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

export default function VendorBankPage() {
  const router = useRouter();
  const { t, localePath } = useLanguage();

  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const draft = getDraft();
    if (draft.bank_name) setBankName(draft.bank_name as string);
    if (draft.account_name) setAccountName(draft.account_name as string);
    if (draft.account_number) setAccountNumber(draft.account_number as string);
    if (draft.iban) setIban(draft.iban as string);
  }, []);

  function handleContinue() {
    if (!bankName.trim()) {
      setError(t("vendor.applyPages.bankErrorName"));
      return;
    }
    if (!accountName.trim()) {
      setError(t("vendor.applyPages.bankErrorHolder"));
      return;
    }
    if (!accountNumber.trim()) {
      setError(t("vendor.applyPages.bankErrorNumber"));
      return;
    }

    saveDraft({
      bank_name: bankName.trim(),
      account_name: accountName.trim(),
      account_number: accountNumber.trim(),
      iban: iban.trim() || null,
    });
    router.push(localePath("/vendor/apply/operations"));
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">
            {t("vendor.applyPages.bankTitle")}
          </h1>
          <p className="text-slate-500">
            {t("vendor.applyPages.bankSubtitle")}
          </p>
        </div>

        <OnboardingProgress currentStep={3} stepsType="ps" />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-orange-600"
                style={{ fontSize: 22 }}
              >
                account_balance
              </span>
            </div>
            <div>
              <h2 className="text-lg font-black">
                {t("vendor.applyPages.bankStep")}
              </h2>
              <p className="text-xs text-slate-400">
                {t("vendor.applyPages.bankStepDesc")}
              </p>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Bank Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {t("vendor.applyPages.bankNameLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={t("vendor.applyPages.bankNamePlaceholder")}
              className={inputCls}
            />
          </div>

          {/* Account Holder Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {t("vendor.applyPages.accountHolderLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={t("vendor.applyPages.accountHolderPlaceholder")}
              className={inputCls}
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {t("vendor.applyPages.accountNumberLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={t("vendor.applyPages.accountNumberPlaceholder")}
              className={inputCls}
            />
          </div>

          {/* IBAN */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {t("vendor.applyPages.ibanLabel")}{" "}
              <span className="text-slate-400 normal-case font-normal">
                {t("vendor.applyPages.optional")}
              </span>
            </label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="EG00 0000 0000 0000 0000 0000 0000"
              className={inputCls}
            />
            <p className="text-xs text-slate-400 mt-1.5">
              {t("vendor.applyPages.ibanHint")}
            </p>
          </div>

          {/* Info box */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
            <span
              className="material-symbols-outlined text-amber-600 shrink-0"
              style={{ fontSize: 20 }}
            >
              lock
            </span>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              {t("vendor.applyPages.bankSecurityNote")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => router.back()}
              className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              ← {t("vendor.applyPages.back")}
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#FF4B19] hover:bg-[#e04416] text-white font-black rounded-xl transition-colors"
            >
              {t("vendor.applyPages.continueBtn")}
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
