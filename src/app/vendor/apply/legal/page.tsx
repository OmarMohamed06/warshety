import type { Metadata } from "next";
import Link from "next/link";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";

export const metadata: Metadata = {
  title: "Legal & Business Info — Vendor Onboarding",
  robots: { index: false, follow: false },
};

export default function VendorLegalPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">
            Legal &amp; Business Information
          </h1>
          <p className="text-slate-500">
            This information is required for KYC verification and compliance.
          </p>
        </div>

        <OnboardingProgress currentStep={2} />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-black mb-6">
            Step 2: Legal &amp; Business Info
          </h2>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Commercial Registration Number *
                </label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                  placeholder="e.g. 12345678"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Tax Registration Number
                </label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Legal Business Name *
              </label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                placeholder="As it appears on official documents"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Business Entity Type *
              </label>
              <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30">
                <option>Select type</option>
                <option>Individual / Sole Proprietor</option>
                <option>Limited Liability Company (LLC)</option>
                <option>Joint Stock Company</option>
                <option>Partnership</option>
              </select>
            </div>

            {/* Document uploads */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm">Required Documents</h3>
              {[
                { label: "Commercial Registration Document", required: true },
                { label: "National ID (Owner)", required: true },
                { label: "Tax Card", required: false },
              ].map((doc) => (
                <div
                  key={doc.label}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-[#FF4B19] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">
                      upload_file
                    </span>
                    <div>
                      <p className="font-semibold text-sm">
                        {doc.label}
                        {doc.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        PDF, JPG or PNG — Max 5MB
                      </p>
                    </div>
                    <button className="ml-auto px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:border-[#FF4B19] hover:text-[#FF4B19] transition-all">
                      Upload
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Link
              href="/vendor/apply"
              className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              Back
            </Link>
            <Link
              href="/vendor/apply/operations"
              className="px-8 py-3 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[#FF4B19]/20"
            >
              Continue
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
