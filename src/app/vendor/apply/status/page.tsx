import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Application Status — Vendor Onboarding",
  robots: { index: false, follow: false },
};

const STATUS_STEPS = [
  {
    key: "submitted",
    label: "Application Submitted",
    desc: "We received your application.",
    icon: "task_alt",
    done: true,
  },
  {
    key: "review",
    label: "Under Review",
    desc: "Our team is verifying your documents (1–3 business days).",
    icon: "manage_search",
    done: true,
    active: true,
  },
  {
    key: "approved",
    label: "Account Activated",
    desc: "You will be notified once approved.",
    icon: "verified",
    done: false,
  },
];

export default function VendorStatusPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621] flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full">
        {/* Success banner */}
        <div className="bg-[#FF4B19] rounded-3xl p-10 text-center text-white mb-8 shadow-2xl shadow-[#FF4B19]/30">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-4xl">
              check_circle
            </span>
          </div>
          <h1 className="text-3xl font-black mb-2">Application Submitted!</h1>
          <p className="text-blue-100 max-w-sm mx-auto text-sm">
            Thank you for joining Garage. Our team will review your application
            and verify your documents within 1–3 business days.
          </p>
          <div className="mt-4 inline-block bg-white/10 rounded-full px-4 py-1 text-xs font-bold tracking-wider uppercase">
            Reference ID: GRG-VEN-2024-0892
          </div>
        </div>

        {/* Status tracker */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
          <h2 className="text-lg font-black mb-6">Application Status</h2>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, i) => (
              <div key={step.key} className="flex gap-4">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      step.done && !step.active
                        ? "bg-green-500 text-white"
                        : step.active
                          ? "bg-[#FF4B19] text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {step.icon}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-14 mt-1 ${step.done ? "bg-green-200" : "bg-slate-100 dark:bg-slate-700"}`}
                    />
                  )}
                </div>
                {/* Content */}
                <div className="pt-2 pb-10">
                  <p
                    className={`font-bold text-sm ${step.active ? "text-[#FF4B19]" : ""}`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                  {step.active && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs bg-[#FF4B19]/10 text-[#FF4B19] font-bold px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-[#FF4B19] rounded-full animate-pulse" />
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What's next */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
          <h2 className="text-lg font-black mb-4">What happens next?</h2>
          <ul className="space-y-3">
            {[
              {
                icon: "email",
                text: "You will receive a confirmation email with your reference number.",
              },
              {
                icon: "phone_callback",
                text: "A Garage representative may call to verify your details.",
              },
              {
                icon: "notifications_active",
                text: "Once approved, you will be notified via email and SMS.",
              },
              {
                icon: "dashboard",
                text: "Your vendor dashboard will be activated immediately after approval.",
              },
            ].map((item) => (
              <li key={item.icon} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#FF4B19] text-lg mt-0.5">
                  {item.icon}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 py-3 text-center border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-slate-400 transition-all"
          >
            Back to Homepage
          </Link>
          <a
            href="mailto:vendors@garage.eg"
            className="flex-1 py-3 text-center bg-[#FF4B19] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">
              support_agent
            </span>
            Contact Vendor Support
          </a>
        </div>
      </div>
    </div>
  );
}
