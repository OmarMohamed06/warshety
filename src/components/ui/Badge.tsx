import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Colour variants — mapped from every STATUS_COLORS pattern in the codebase:
 *
 * primary  → orange  (#FF4B19) — compatibility tags, "OEM" labels
 * success  → green   — Active, Confirmed, Completed
 * warning  → yellow  — Pending, Low Stock
 * error    → red     — Cancelled, Out of Stock
 * info     → blue    — Confirmed (booking flow)
 * purple   → purple  — Shipped
 * neutral  → slate   — category chips, generic tags
 */
export type BadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "neutral";

/**
 * Size tier:
 *
 * sm → tiny tag (10px text, slight border-radius)  — used for compat tags, OEM/Used labels
 * md → standard pill (12px text, rounded-full)     — used for order/inventory status
 */
export type BadgeSize = "sm" | "md";

// ─── Style maps ───────────────────────────────────────────────────────────────

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-[#FF4B19]/10 text-[#FF4B19]",
  success:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  error: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const sizeClasses: Record<BadgeSize, string> = {
  // sm: inline tag with subtle rounding — matches compat/OEM chips in ProductCard
  sm: "text-[10px] px-2 py-0.5 rounded",
  // md: pill shape — matches status badges in dashboard/inventory tables
  md: "text-xs px-2.5 py-1 rounded-full",
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface BadgeProps {
  /** Colour semantic. Defaults to "neutral". */
  variant?: BadgeVariant;
  /** Size tier. Defaults to "md". */
  size?: BadgeSize;
  /**
   * Optional Material Symbols icon name rendered to the left of children.
   * Sized automatically to match the badge tier.
   */
  icon?: string;
  className?: string;
  children: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "md",
  icon,
  className,
  children,
}: BadgeProps) {
  const iconSize = size === "sm" ? "11px" : "13px";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold leading-none whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {icon && (
        <span
          className="material-symbols-outlined shrink-0"
          style={{ fontSize: iconSize }}
        >
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Maps a free-form status string (from vendor dashboard / inventory / bookings)
 * to the correct Badge variant. Falls back to "neutral".
 */
export function statusVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (s === "active" || s === "completed" || s === "confirmed")
    return "success";
  if (s === "pending" || s === "low stock") return "warning";
  if (s === "cancelled" || s === "out of stock") return "error";
  if (s === "shipped" || s === "in transit") return "purple";
  if (s === "processing") return "info";
  return "neutral";
}
