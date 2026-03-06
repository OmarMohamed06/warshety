import Link from "next/link";

const STEPS = [
  { id: 1, label: "Application", path: "/vendor/apply" },
  { id: 2, label: "Legal & Business", path: "/vendor/apply/legal" },
  { id: 3, label: "Operations", path: "/vendor/apply/operations" },
  { id: 4, label: "Location & Photos", path: "/vendor/apply/location" },
];

export default function OnboardingProgress({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
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
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-8 lg:w-16 ${
                currentStep > step.id ? "bg-green-500" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
