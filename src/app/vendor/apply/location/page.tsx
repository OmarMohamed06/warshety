import type { Metadata } from "next";
import Link from "next/link";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";

export const metadata: Metadata = {
  title: "Location & Photos — Vendor Onboarding",
  robots: { index: false, follow: false },
};

export default function VendorLocationPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">Location &amp; Photos</h1>
          <p className="text-slate-500">
            Help customers find you and build trust with great visuals.
          </p>
        </div>

        <OnboardingProgress currentStep={4} />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
          <h2 className="text-xl font-black">Step 4: Location &amp; Photos</h2>

          {/* Governorate + City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Governorate *
              </label>
              <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30">
                <option>Select governorate</option>
                {[
                  "Cairo",
                  "Giza",
                  "Alexandria",
                  "Qalyubia",
                  "Sharqia",
                  "Dakahlia",
                  "Gharbia",
                  "Monufia",
                  "Beheira",
                  "Kafr El Sheikh",
                  "Damietta",
                  "Port Said",
                  "Ismailia",
                  "Suez",
                  "Fayoum",
                  "Beni Suef",
                  "Minya",
                  "Asyut",
                  "Sohag",
                  "Qena",
                  "Luxor",
                  "Aswan",
                  "Red Sea",
                  "Matrouh",
                  "North Sinai",
                  "South Sinai",
                  "New Valley",
                ].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                City / District *
              </label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                placeholder="e.g. New Cairo, Maadi, Heliopolis"
              />
            </div>
          </div>

          {/* Full address */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              Full Street Address *
            </label>
            <textarea
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 resize-none"
              placeholder="Building number, street name, area, landmark..."
            />
          </div>

          {/* Google Maps link */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              Google Maps Link
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                placeholder="https://maps.google.com/..."
              />
              <button className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:border-[#FF4B19] hover:text-[#FF4B19] transition-all flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  pin_drop
                </span>
                Verify
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Share your Google Maps location link for accurate discovery.
            </p>
          </div>

          {/* Map preview placeholder */}
          <div className="h-48 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <div className="text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl block mb-1">
                map
              </span>
              <p className="text-sm">Map preview will appear here</p>
            </div>
          </div>

          {/* Shop photos */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-3">
              Shop / Facility Photos
            </label>
            <p className="text-xs text-slate-400 mb-4">
              Upload at least 3 photos of your storefront, workshop, and
              inventory area.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Storefront", required: true },
                { label: "Workshop / Interior", required: true },
                { label: "Inventory Area", required: true },
                { label: "Team Photo", required: false },
                { label: "Equipment", required: false },
                { label: "Additional", required: false },
              ].map((slot) => (
                <div
                  key={slot.label}
                  className="aspect-square border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-[#FF4B19] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-slate-300 text-2xl">
                    add_photo_alternate
                  </span>
                  <p className="text-xs text-slate-400 text-center px-1">
                    {slot.label}
                    {slot.required && <span className="text-red-400">*</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Link
              href="/vendor/apply/operations"
              className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              Back
            </Link>
            <Link
              href="/vendor/apply/status"
              className="px-8 py-3 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[#FF4B19]/20"
            >
              Submit Application
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
