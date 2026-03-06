"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ─── Component ────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Rendered above the input as a small-caps label. */
  label?: string;
  /** Red error message rendered below the input. Hides `hint`. */
  error?: string;
  /** Muted helper text rendered below the input. */
  hint?: string;
  /**
   * Material Symbols icon name placed INSIDE the left edge.
   * Automatically adds left padding so text doesn't overlap.
   */
  prefixIcon?: string;
  /**
   * Material Symbols icon name placed INSIDE the right edge.
   * Automatically adds right padding so text doesn't overlap.
   */
  suffixIcon?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, prefixIcon, suffixIcon, className, id, ...props },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2"
          >
            {label}
          </label>
        )}

        {/* Input wrapper — positions prefix/suffix icons */}
        <div className="relative">
          {prefixIcon && (
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none"
              style={{ fontSize: "18px" }}
            >
              {prefixIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base
              "w-full bg-slate-50 dark:bg-slate-900",
              "border border-slate-200 dark:border-slate-700 rounded-xl",
              "text-sm text-slate-900 dark:text-slate-100",
              "placeholder:text-slate-400",
              "py-3",
              prefixIcon ? "pl-10" : "pl-4",
              suffixIcon ? "pr-10" : "pr-4",
              // Focus ring
              "focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 focus:border-[#FF4B19]/60",
              // States
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors",
              // Error overrides
              error &&
                "border-red-400 dark:border-red-500 focus:ring-red-300/30 focus:border-red-400",
              className,
            )}
            {...props}
          />

          {suffixIcon && (
            <span
              className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none"
              style={{ fontSize: "18px" }}
            >
              {suffixIcon}
            </span>
          )}
        </div>

        {/* Error / hint */}
        {error && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <span
              className="material-symbols-outlined shrink-0"
              style={{ fontSize: "13px" }}
            >
              error
            </span>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };
