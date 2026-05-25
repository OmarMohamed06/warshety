"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";

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

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30";

const WORKING_HOURS = [
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
];

const WORKING_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_KEY_MAP: Record<string, string> = {
  Sunday: "daySunday",
  Monday: "dayMonday",
  Tuesday: "dayTuesday",
  Wednesday: "dayWednesday",
  Thursday: "dayThursday",
  Friday: "dayFriday",
  Saturday: "daySaturday",
};

export default function VendorOperationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, localePath } = useLanguage();

  useEffect(() => {
    (supabase as any)
      .from("car_makes")
      .select("name")
      .order("name")
      .limit(1000)
      .then(({ data }: { data: { name: string }[] | null }) => {
        if (data) setDbMakes(data.map((m) => m.name));
      });
  }, []);

  const isServiceCenter = true;

  const defaultDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const [workingDays, setWorkingDays] = useState<string[]>(defaultDays);
  const [openTime, setOpenTime] = useState("9:00 AM");
  const [closeTime, setCloseTime] = useState("6:00 PM");
  const [specializations, setSpecs] = useState<string[]>([]);
  const [supportedMakes, setSupportedMakes] = useState<string[]>([]);
  const [dbMakes, setDbMakes] = useState<string[]>([]);
  const [makesOpen, setMakesOpen] = useState(false);
  const [makesSearch, setMakesSearch] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const draft = getDraft();
    if (draft.working_days && Array.isArray(draft.working_days))
      setWorkingDays(draft.working_days as string[]);
    if (draft.open_time) setOpenTime(draft.open_time as string);
    if (draft.close_time) setCloseTime(draft.close_time as string);
    if (draft.specializations && Array.isArray(draft.specializations))
      setSpecs(draft.specializations as string[]);
    if (draft.supported_makes && Array.isArray(draft.supported_makes))
      setSupportedMakes(draft.supported_makes as string[]);
  }, []);

  function toggleDay(day: string) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }
  function toggleSpec(key: string) {
    setSpecs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }
  function toggleMake(make: string) {
    if (make === "__all__") {
      setSupportedMakes([]);
      return;
    }
    setSupportedMakes((prev) =>
      prev.includes(make) ? prev.filter((m) => m !== make) : [...prev, make],
    );
  }
  const nextStep = localePath("/vendor/apply/location");

  function handleContinue() {
    if (process.env.NEXT_PUBLIC_SKIP_APPLY_VALIDATION === "true") {
      router.push(nextStep);
      return;
    }
    if (workingDays.length === 0) {
      setError(t("vendor.applyPages.errorSelectWorkingDay"));
      return;
    }
    if (specializations.length === 0) {
      setError(t("vendor.applyPages.errorSelectSpec"));
      return;
    }
    if (!termsChecked) {
      setError(t("vendor.applyPages.errorAcceptTerms"));
      return;
    }

    saveDraft({
      working_days: workingDays,
      open_time: openTime,
      close_time: closeTime,
      specializations,
      supported_makes: supportedMakes,
    });
    router.push(nextStep);
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">
            {t("vendor.applyPages.operationsTitle")}
          </h1>
          <p className="text-slate-500">
            {t("vendor.applyPages.operationsSubtitleSC")}
          </p>
        </div>

        <OnboardingProgress currentStep={3} stepsType="sc" />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">
              {t("vendor.applyPages.step3Operations")}
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {t("vendor.login.serviceCenterCard")}
            </span>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Working Days — service centers only ── */}
          {isServiceCenter && (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-3">
                {t("vendor.applyPages.workingDays")} *
              </label>
              <div className="flex flex-wrap gap-2">
                {WORKING_DAYS.map((day) => {
                  const active = workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 border rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-[#FF4B19] text-white border-[#FF4B19]"
                          : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19]"
                      }`}
                    >
                      {t(`vendor.applyPages.${DAY_KEY_MAP[day]}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Working Hours — service centers only ── */}
          {isServiceCenter && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  {t("vendor.applyPages.openingTime")} *
                </label>
                <select
                  className={inputCls}
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                >
                  {WORKING_HOURS.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  {t("vendor.applyPages.closingTime")} *
                </label>
                <select
                  className={inputCls}
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                >
                  {WORKING_HOURS.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Service Center: Specializations ── */}
          {isServiceCenter && (
            <div className="space-y-6">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block">
                {t("vendor.applyPages.serviceSpecs")} *{" "}
                <span className="normal-case font-normal text-slate-400">
                  {t("vendor.applyPages.selectAllApply")}
                </span>
              </label>
              {SERVICE_CATEGORIES.map((cat) => (
                <div key={cat.key}>
                  {/* Category heading */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#FF4B19] text-lg">
                      {cat.icon}
                    </span>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {t(`home.serviceCategories.${cat.key}`)}
                    </h4>
                  </div>
                  {/* Sub-services */}
                  <div className="flex flex-wrap gap-2 pl-7">
                    {cat.services.map((svc) => {
                      const active = specializations.includes(svc);
                      return (
                        <button
                          key={svc}
                          type="button"
                          onClick={() => toggleSpec(svc)}
                          className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                            active
                              ? "border-[#FF4B19] bg-[#FF4B19]/8 text-[#FF4B19]"
                              : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19] text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {t(`home.services.${svc}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Service Center: Supported Car Makes ── */}
          {isServiceCenter && (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1">
                {t("vendor.applyPages.supportedMakesLabel")}
              </label>
              <p className="text-xs text-slate-400 mb-3">
                {t("vendor.applyPages.supportedMakesHint")}
              </p>

              {/* Dropdown trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMakesOpen((o) => !o)}
                  className={`${inputCls} flex items-center justify-between text-left`}
                >
                  <span
                    className={
                      supportedMakes.length === 0 ? "text-slate-400" : ""
                    }
                  >
                    {supportedMakes.length === 0
                      ? t("vendor.applyPages.allMakesOption")
                      : supportedMakes.length === 1
                        ? supportedMakes[0]
                        : `${supportedMakes.length} ${t("vendor.applyPages.makesSelected")}`}
                  </span>
                  <span className="material-symbols-outlined text-slate-400 text-base ml-2">
                    {makesOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {makesOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                    {/* Search */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                      <input
                        type="text"
                        autoFocus
                        placeholder={t("vendor.applyPages.searchMakes")}
                        value={makesSearch}
                        onChange={(e) => setMakesSearch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                      />
                    </div>

                    {/* Options list */}
                    <ul className="max-h-60 overflow-y-auto py-1">
                      {/* All Makes option */}
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            toggleMake("__all__");
                            setMakesOpen(false);
                            setMakesSearch("");
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                            supportedMakes.length === 0
                              ? "text-[#FF4B19] font-semibold"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              supportedMakes.length === 0
                                ? "bg-[#FF4B19] border-[#FF4B19]"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {supportedMakes.length === 0 && (
                              <span
                                className="material-symbols-outlined text-white"
                                style={{ fontSize: "12px" }}
                              >
                                check
                              </span>
                            )}
                          </span>
                          {t("vendor.applyPages.allMakesOption")}
                        </button>
                      </li>

                      {/* Filtered makes */}
                      {dbMakes
                        .filter((m) =>
                          m.toLowerCase().includes(makesSearch.toLowerCase()),
                        )
                        .map((make) => {
                          const selected = supportedMakes.includes(make);
                          return (
                            <li key={make}>
                              <button
                                type="button"
                                onClick={() => toggleMake(make)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200"
                              >
                                <span
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                    selected
                                      ? "bg-[#FF4B19] border-[#FF4B19]"
                                      : "border-slate-300 dark:border-slate-600"
                                  }`}
                                >
                                  {selected && (
                                    <span
                                      className="material-symbols-outlined text-white"
                                      style={{ fontSize: "12px" }}
                                    >
                                      check
                                    </span>
                                  )}
                                </span>
                                {make}
                              </button>
                            </li>
                          );
                        })}
                    </ul>

                    {/* Footer: done */}
                    <div className="p-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setMakesOpen(false);
                          setMakesSearch("");
                        }}
                        className="px-4 py-1.5 bg-[#FF4B19] text-white text-xs font-bold rounded-lg hover:opacity-90"
                      >
                        {t("vendor.applyPages.makesSelectDone")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected pills */}
              {supportedMakes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {supportedMakes.map((make) => (
                    <span
                      key={make}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#FF4B19]/10 text-[#FF4B19] text-xs font-medium rounded-full"
                    >
                      {make}
                      <button
                        type="button"
                        onClick={() => toggleMake(make)}
                        className="hover:opacity-70"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "14px" }}
                        >
                          close
                        </span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Terms ── */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[#FF4B19] shrink-0"
                checked={termsChecked}
                onChange={() => setTermsChecked((v) => !v)}
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t("vendor.applyPages.termsAgree")}
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href={localePath("/vendor/apply/legal")}
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
