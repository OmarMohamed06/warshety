import { cn } from "@/lib/utils";

/**
 * Base skeleton block.
 *
 * Renders a neutral placeholder with a shimmer sweep. Prefer composing these
 * into the *shape of the real content* (see the Skeleton* helpers below) over
 * dropping a lone spinner in the middle of the page — a placeholder that
 * matches the incoming layout avoids the jarring reflow when data lands.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "skeleton-shimmer rounded-md bg-slate-200/70 dark:bg-slate-700/40",
        className,
      )}
      {...props}
    />
  );
}

/** A block of text lines, last line short like real prose. */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Card placeholder: image band, title, two text lines, footer row. */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/50",
        className,
      )}
    >
      <Skeleton className="mb-4 h-36 w-full rounded-xl" />
      <Skeleton className="mb-2.5 h-4 w-3/5" />
      <SkeletonText lines={2} />
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

/** Grid of card placeholders. */
function SkeletonCardGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Stacked rows with a leading avatar — bookings, notifications, lists. */
function SkeletonList({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/50"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Table placeholder for the admin/vendor data grids. */
function SkeletonTable({
  rows = 6,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/60",
        className,
      )}
    >
      <div className="flex gap-4 border-b border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-800/60">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 border-b border-slate-100 px-4 py-4 last:border-0 dark:border-slate-700/40"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3.5 flex-1", c === 0 && "max-w-[40%]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonCardGrid,
  SkeletonList,
  SkeletonTable,
};
