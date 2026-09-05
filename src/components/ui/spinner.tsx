import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[3px]",
} as const;

/**
 * Indeterminate spinner.
 *
 * Inherits `currentColor` so it works on any background — including inside a
 * filled button, where a hard-coded brand colour would disappear.
 *
 * Use this for *actions* (a submitting button, an inline refresh). For a
 * region or page that is still fetching its content, prefer a skeleton that
 * mirrors the layout: it communicates what is coming instead of just "wait".
 */
export function Spinner({
  size = "md",
  className,
  ...props
}: React.ComponentProps<"span"> & { size?: keyof typeof sizes }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex shrink-0", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "animate-spin rounded-full border-current border-t-transparent opacity-90",
          sizes[size],
        )}
      />
      <span className="sr-only">Loading</span>
    </span>
  );
}
