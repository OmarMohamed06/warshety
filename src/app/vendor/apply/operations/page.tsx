import type { Metadata } from "next";
import Link from "next/link";
import OnboardingProgress from "@/components/vendor/OnboardingProgress";

export const metadata: Metadata = {
  title: "Operations & Terms — Vendor Onboarding",
  robots: { index: false, follow: false },
};

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

export default function VendorOperationsPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">Operations &amp; Terms</h1>
          <p className="text-slate-500">
            Configure how your business operates on the platform.
          </p>
        </div>

        <OnboardingProgress currentStep={3} />

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-8">
          <h2 className="text-xl font-black">Step 3: Operations &amp; Terms</h2>

          {/* Working days */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-3">
              Working Days *
            </label>
            <div className="flex flex-wrap gap-2">
              {WORKING_DAYS.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#FF4B19] text-sm has-[:checked]:bg-[#FF4B19] has-[:checked]:text-white has-[:checked]:border-[#FF4B19] transition-all"
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    defaultChecked={[
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                    ].includes(day)}
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>

          {/* Working hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Opening Time *
              </label>
              <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30">
                {WORKING_HOURS.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Closing Time *
              </label>
              <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30">
                {WORKING_HOURS.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Delivery */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-3">
              Delivery Options
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: "storefront",
                  label: "In-Store Pickup",
                  desc: "Customers pick up from your shop",
                },
                {
                  icon: "local_shipping",
                  label: "Delivery Available",
                  desc: "You deliver within your city",
                },
                {
                  icon: "inventory",
                  label: "Nationwide Shipping",
                  desc: "Ship across Egypt",
                },
              ].map((opt) => (
                <label
                  key={opt.label}
                  className="flex flex-col gap-1 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#FF4B19] text-sm has-[:checked]:border-[#FF4B19] has-[:checked]:bg-[#FF4B19]/5 transition-all"
                >
                  <input type="checkbox" className="hidden" />
                  <span className="material-symbols-outlined text-[#FF4B19]">
                    {opt.icon}
                  </span>
                  <span className="font-bold text-sm">{opt.label}</span>
                  <span className="text-xs text-slate-500">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Return policy */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              Return Policy *
            </label>
            <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 mb-3">
              <option>No returns accepted</option>
              <option>Returns within 7 days</option>
              <option>Returns within 14 days</option>
              <option>Returns within 30 days</option>
            </select>
            <textarea
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 resize-none"
              placeholder="Additional return conditions or notes..."
            />
          </div>

          {/* Terms acceptance */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <h3 className="font-bold">Terms &amp; Conditions</h3>
            {[
              "I agree to Garage's Vendor Terms of Service and commission structure (8–12%).",
              "I confirm that all products I list are authentic and I hold the right to sell them.",
              "I agree to respond to customer inquiries within 24 hours.",
            ].map((term) => (
              <label
                key={term}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#FF4B19]"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {term}
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/vendor/apply/legal"
              className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              Back
            </Link>
            <Link
              href="/vendor/apply/location"
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
