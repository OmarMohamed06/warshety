"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { VendorType } from "@/types/database";

const CITIES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "New Cairo",
  "Sheikh Zayed",
  "6th of October",
  "Mansoura",
  "Suez",
  "Tanta",
  "Zagazig",
  "Faiyum",
  "Luxor",
  "Aswan",
  "Hurghada",
];

const VENDOR_TYPE_OPTIONS = [
  { value: "service_center" as VendorType, label: "Service Center / Workshop" },
  { value: "parts_seller" as VendorType, label: "Spare Parts Shop" },
];

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30";

export default function VendorApplyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    email: user?.email ?? "",
    phone: "",
    vendor_type: "service_center" as VendorType,
    city: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleContinue() {
    if (
      !form.business_name ||
      !form.owner_name ||
      !form.email ||
      !form.phone ||
      !form.city
    ) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("vendor_applications")
      .insert({
        user_id: user?.id ?? null,
        business_name: form.business_name,
        vendor_type: form.vendor_type,
        owner_name: form.owner_name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        step_completed: 1,
        status: "pending",
      })
      .select("id")
      .single();

    if (dbError || !data) {
      setError(
        dbError?.message ?? "Failed to save application. Please try again.",
      );
      setSaving(false);
      return;
    }

    // Store application ID locally so subsequent steps can update it
    if (typeof window !== "undefined") {
      localStorage.setItem("vendorApplicationId", data.id);
    }

    setSaving(false);
    router.push("/vendor/apply/legal");
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF4B19] rounded-2xl mb-6">
            <span className="material-symbols-outlined text-white text-3xl">
              storefront
            </span>
          </div>
          <h1 className="text-4xl font-black mb-3">Become a Vendor</h1>
          <p className="text-slate-500 text-lg">
            Join Egypt&apos;s fastest-growing automotive marketplace. Reach
            thousands of car owners every day.
          </p>
        </div>

        <OnboardingProgress currentStep={1} />

        {/* Value props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            {
              icon: "storefront",
              title: "Your Digital Storefront",
              desc: "Fully managed product pages with SEO built in.",
            },
            {
              icon: "bar_chart",
              title: "Sales Analytics",
              desc: "Track revenue, orders, and customer trends in real time.",
            },
            {
              icon: "payments",
              title: "Secure Payments",
              desc: "Get paid on time with Garage&apos;s escrow system.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 text-center"
            >
              <span className="material-symbols-outlined text-[#FF4B19] text-3xl mb-3 block">
                {item.icon}
              </span>
              <h3 className="font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Application form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-black mb-6">Step 1: Basic Information</h2>

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
            {/* Business Name + Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Business Name *
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. Elite Auto Parts"
                  value={form.business_name}
                  onChange={(e) => set("business_name", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Owner Full Name *
                </label>
                <input
                  className={inputCls}
                  placeholder="Your full name"
                  value={form.owner_name}
                  onChange={(e) => set("owner_name", e.target.value)}
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="business@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="+20 1XX XXX XXXX"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>

            {/* Vendor type */}
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Business Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VENDOR_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.vendor_type === opt.value
                        ? "border-[#FF4B19] bg-[#FF4B19]/5"
                        : "border-slate-200 dark:border-slate-700 hover:border-[#FF4B19]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bizType"
                      className="accent-[#FF4B19]"
                      checked={form.vendor_type === opt.value}
                      onChange={() => set("vendor_type", opt.value)}
                    />
                    <span className="text-sm font-semibold">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                City *
              </label>
              <select
                className={inputCls}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              >
                <option value="">Select your city</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-xs text-slate-400">* Required fields</p>
            <button
              onClick={handleContinue}
              disabled={saving}
              className="px-8 py-3 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all flex items-center gap-2 shadow-lg shadow-[#FF4B19]/20"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">
                    progress_activity
                  </span>
                  Saving…
                </>
              ) : (
                <>
                  Continue
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sign in prompt for guests */}
        {!user && (
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/login?next=/vendor/apply"
              className="text-[#FF4B19] font-bold hover:underline"
            >
              Sign in
            </Link>{" "}
            to link this application to your profile.
          </p>
        )}
      </div>
    </div>
  );
}
