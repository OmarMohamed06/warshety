import React from "react";
import Link from "next/link";

const STEPS_SC = [
  { id: 1, label: "Application", path: "/vendor/apply/form" },
  { id: 2, label: "Legal & ID", path: "/vendor/apply/legal" },
  { id: 3, label: "Operations", path: "/vendor/apply/operations" },
  { id: 4, label: "Location", path: "/vendor/apply/location" },
  { id: 5, label: "Account", path: "/vendor/apply/account" },
];

const STEPS_PS = [
  { id: 1, label: "Application", path: "/vendor/apply/form" },
  { id: 2, label: "Legal & ID", path: "/vendor/apply/legal" },
  { id: 3, label: "Bank Details", path: "/vendor/apply/bank" },
  { id: 4, label: "Operations", path: "/vendor/apply/operations" },
  { id: 5, label: "Account", path: "/vendor/apply/account" },
];

export default function OnboardingProgress({
  currentStep,
  stepsType = "sc",
  // kept for backward compat — no longer drives step selection
  totalSteps: _totalSteps,
}: {
  currentStep: number;
  stepsType?: "sc" | "ps";
  totalSteps?: number;
}) {
  const STEPS = stepsType === "ps" ? STEPS_PS : STEPS_SC;
  return (
    <div className="flex items-center w-full mb-10">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black border-2 ${
                currentStep > step.id
                  ? "bg-green-500 border-green-500 text-white"
                  : currentStep === step.id
                    ? "bg-[#FF4B19] border-[#FF4B19] text-white"
                    : "border-slate-300 text-slate-400"
              }`}
            >
              {currentStep > step.id ? (
                <span className="material-symbols-outlined text-sm">check</span>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:block ${
                currentStep === step.id ? "text-[#FF4B19]" : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-px mx-3 ${
                currentStep > step.id ? "bg-green-500" : "bg-slate-200"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
