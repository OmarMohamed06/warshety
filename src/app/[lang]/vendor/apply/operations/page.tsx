"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";
import { GOVERNORATES, getAreas } from "@/lib/locationData";

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

  const [vendorType, setVendorType] = useState<
    "service_center" | "parts_seller"
  >("service_center");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("vendorType");
      if (t === "parts_seller") setVendorType("parts_seller");
    }
  }, []);

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

  const isServiceCenter = vendorType === "service_center";

  const DELIVERY_OPTIONS = [
    {
      key: "pickup",
      icon: "storefront",
      label: t("vendor.applyPages.deliveryPickupLabel"),
      desc: t("vendor.applyPages.deliveryPickupDesc"),
    },
    {
      key: "delivery",
      icon: "local_shipping",
      label: t("vendor.applyPages.deliveryCityLabel"),
      desc: t("vendor.applyPages.deliveryCityDesc"),
    },
    {
      key: "shipping",
      icon: "inventory",
      label: t("vendor.applyPages.deliveryNationwideLabel"),
      desc: t("vendor.applyPages.deliveryNationwideDesc"),
    },
  ];

  const RETURN_POLICIES = [
    t("vendor.applyPages.returnNoReturns"),
    t("vendor.applyPages.returnWithin7"),
    t("vendor.applyPages.returnWithin14"),
    t("vendor.applyPages.returnWithin30"),
  ];

  const defaultDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const [workingDays, setWorkingDays] = useState<string[]>(defaultDays);
  const [openTime, setOpenTime] = useState("9:00 AM");
  const [closeTime, setCloseTime] = useState("6:00 PM");
  const [specializations, setSpecs] = useState<string[]>([]);
  const [supportedMakes, setSupportedMakes] = useState<string[]>([]);
  const [dbMakes, setDbMakes] = useState<string[]>([]);
  const [makesOpen, setMakesOpen] = useState(false);
  const [makesSearch, setMakesSearch] = useState("");
  const [deliveryOptions, setDeliveryOpts] = useState<string[]>(["pickup"]);
  const [returnPolicy, setReturnPolicy] = useState("No returns accepted");
  const [governorate, setGovernorate] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved draft from DB on mount
  useEffect(() => {
    const applicationId =
      typeof window !== "undefined"
        ? localStorage.getItem("vendorApplicationId")
        : null;
    if (!applicationId) return;
    supabase
      .from("vendor_applications")
      .select(
        "working_days, open_time, close_time, specializations, supported_makes, delivery_options, return_policy, governorate, city, address",
      )
      .eq("id", applicationId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.working_days?.length) setWorkingDays(data.working_days);
        if (data.open_time) setOpenTime(data.open_time);
        if (data.close_time) setCloseTime(data.close_time);
        if (data.specializations?.length) setSpecs(data.specializations);
        if (data.supported_makes?.length)
          setSupportedMakes(data.supported_makes);
        if (data.delivery_options?.length)
          setDeliveryOpts(data.delivery_options);
        if (data.return_policy) setReturnPolicy(data.return_policy);
        if (data.governorate) setGovernorate(data.governorate);
        if (data.city) setArea(data.city);
        if (data.address) setAddress(data.address);
      });
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
  function toggleDelivery(key: string) {
    setDeliveryOpts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }
  // Parts sellers go to bank details next; service centers go to location
  const nextStep = isServiceCenter
    ? localePath("/vendor/apply/location")
    : localePath("/vendor/apply/bank");

  async function handleContinue() {
    // ── DEV ONLY: bypass validation for quick testing ──────────────────────────
    if (process.env.NEXT_PUBLIC_SKIP_APPLY_VALIDATION === "true") {
      router.push(nextStep);
      return;
    }
    if (isServiceCenter && workingDays.length === 0) {
      setError(t("vendor.applyPages.errorSelectWorkingDay"));
      return;
    }
    if (isServiceCenter && specializations.length === 0) {
      setError(t("vendor.applyPages.errorSelectSpec"));
      return;
    }
    if (!isServiceCenter && !governorate) {
      setError(t("vendor.applyPages.selectGovernorate"));
      return;
    }
    if (!isServiceCenter && !address.trim()) {
      setError(t("vendor.applyPages.fullAddress") + " is required.");
      return;
    }
    if (!termsChecked) {
      setError(t("vendor.applyPages.errorAcceptTerms"));
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

    const updatePayload: Record<string, unknown> = {
      terms_accepted: true,
      step_completed: 3,
    };

    if (isServiceCenter) {
      updatePayload.working_days = workingDays;
      updatePayload.open_time = openTime;
      updatePayload.close_time = closeTime;
      updatePayload.specializations = specializations;
      updatePayload.supported_makes = supportedMakes;
    } else {
      updatePayload.delivery_options = deliveryOptions;
      updatePayload.return_policy = returnPolicy;
      updatePayload.governorate = governorate;
      updatePayload.city = area;
      updatePayload.address = address;
      // Mark as fully submitted — parts sellers complete here (no location step)
      updatePayload.submitted_at = new Date().toISOString();
    }

    const { error: dbError } = await supabase
      .from("vendor_applications")
      .update(updatePayload)
      .eq("id", applicationId);

    if (dbError) {
      setError(dbError.message ?? "Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    if (!isServiceCenter && typeof window !== "undefined") {
      localStorage.removeItem("vendorApplicationId");
    }

    setSaving(false);
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
            {isServiceCenter
              ? t("vendor.applyPages.operationsSubtitleSC")
              : t("vendor.applyPages.operationsSubtitlePS")}
          </p>
        </div>

        <OnboardingProgress
          currentStep={isServiceCenter ? 3 : 4}
          stepsType={isServiceCenter ? "sc" : "ps"}
        />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">
              {t("vendor.applyPages.step3Operations")}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isServiceCenter
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              }`}
            >
              {isServiceCenter
                ? t("vendor.login.serviceCenterCard")
                : t("vendor.login.partsSellerCard")}
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

          {/* ── Parts Seller: Location ── */}
          {!isServiceCenter && (
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block">
                {t("vendor.applyPages.locationTitle").replace(" & Photos", "")}{" "}
                *
              </label>

              {/* Governorate */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  {t("vendor.applyPages.governorate")} *
                </label>
                <select
                  className={inputCls}
                  value={governorate}
                  onChange={(e) => {
                    setGovernorate(e.target.value);
                    setArea("");
                  }}
                >
                  <option value="">
                    {t("vendor.applyPages.selectGovernorate")}
                  </option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area / District */}
              {governorate && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">
                    {t("vendor.applyPages.cityDistrict")}
                  </label>
                  <select
                    className={inputCls}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    <option value="">
                      {t("vendor.applyPages.cityDistrictPlaceholder")}
                    </option>
                    {getAreas(governorate).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Full Address */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  {t("vendor.applyPages.fullAddress")} *
                </label>
                <textarea
                  className={inputCls + " resize-none"}
                  rows={2}
                  placeholder={t("vendor.applyPages.addressPlaceholder")}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Parts Seller: Delivery Options ── */}
          {!isServiceCenter && (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-3">
                {t("vendor.applyPages.deliveryOptionsLabel")}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DELIVERY_OPTIONS.map((opt) => {
                  const active = deliveryOptions.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleDelivery(opt.key)}
                      className={`flex flex-col gap-1 p-4 border rounded-xl text-left text-sm transition-all ${
                        active
                          ? "border-[#FF4B19] bg-[#FF4B19]/5"
                          : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[#FF4B19]">
                        {opt.icon}
                      </span>
                      <span className="font-bold text-sm">{opt.label}</span>
                      <span className="text-xs text-slate-500">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Parts Seller: Return Policy ── */}
          {!isServiceCenter && (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                {t("vendor.applyPages.returnPolicyLabel")} *
              </label>
              <select
                className={inputCls}
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
              >
                {RETURN_POLICIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
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
                : isServiceCenter
                  ? t("vendor.applyPages.continueBtn")
                  : t("vendor.applyPages.submitBtn")}
              <span className="material-symbols-outlined text-sm">
                {isServiceCenter ? "arrow_forward" : "check_circle"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
