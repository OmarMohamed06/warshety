                 "use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Convenience shape for the `options` prop — avoids verbose JSX option lists. */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Rendered above the select as a small-caps label. */
  label?: string;
  /** Red error message rendered below the select. Hides `hint`. */
  error?: string;
  /** Muted helper text rendered below the select. */
  hint?: string;
  /**
   * Placeholder option rendered at the top with an empty string value.
   * e.g. "Select your city".
   */
  placeholder?: string;
  /**
   * Array of { value, label } objects rendered as <option> elements.
   * You can also pass <option> children directly instead.
   */
  options?: SelectOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      placeholder,
      options,
      className,
      id,
      children,
      ...props
    },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2"
          >
            {label}
          </label>
        )}

        {/* Select + custom chevron wrapper */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              // Base — appearance-none hides browser's default arrow
              "w-full appearance-none",
              "bg-slate-50 dark:bg-slate-900",
              "border border-slate-200 dark:border-slate-700 rounded-xl",
              "text-sm text-slate-900 dark:text-slate-100",
              "py-3 pl-4 pr-10",
              // Focus ring
              "focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 focus:border-[#FF4B19]/60",
              // States
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors",
              // Error override
              error &&
                "border-red-400 dark:border-red-500 focus:ring-red-300/30 focus:border-red-400",
              className,
            )}
            {...props}
          >
            {/* Placeholder option */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {/* Programmatic options */}
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}

            {/* Slot for manual <option> / <optgroup> children */}
            {children}
          </select>

          {/* Custom chevron — pointer-events-none so it doesn't block clicks */}
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none"
            style={{ fontSize: "18px" }}
          >
            expand_more
          </span>
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

Select.displayName = "Select";
export { Select };
