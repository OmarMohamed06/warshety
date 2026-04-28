"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Pricing" },
  { id: 3, label: "Vehicles" },
  { id: 4, label: "Images" },
];

interface StepIndicatorProps {
  currentStep: number;
  labels?: string[];
}

export function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  const steps = STEPS.map((s, i) => ({ ...s, label: labels?.[i] ?? s.label }));
  return (
    <div className="w-full">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, idx) => {
          const done = currentStep > step.id;
          const active = currentStep === step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                    done && "bg-green-600 border-green-600 text-white",
                    active && "bg-slate-900 border-slate-900 text-white",
                    !done &&
                      !active &&
                      "bg-white border-slate-300 text-slate-400",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    done && "text-green-600",
                    active && "text-slate-900",
                    !done && !active && "text-slate-400",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3 mb-4 transition-colors",
                    currentStep > step.id ? "bg-green-500" : "bg-slate-200",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact label */}
      <div className="sm:hidden flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
          {currentStep}
        </div>
        <div>
          <p className="text-xs text-slate-500 leading-none">
            Step {currentStep} of {steps.length}
          </p>
          <p className="text-sm font-semibold text-slate-900 leading-snug">
            {steps[currentStep - 1]?.label}
          </p>
        </div>
        <div className="ml-auto flex gap-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "w-2 h-2 rounded-full",
                currentStep > step.id && "bg-green-500",
                currentStep === step.id && "bg-slate-900",
                currentStep < step.id && "bg-slate-200",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
