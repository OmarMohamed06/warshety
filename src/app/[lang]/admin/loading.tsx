import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Route-segment loading UI for all /[lang]/admin/* pages.
 * The admin sidebar/topbar live in the admin layout and remain mounted, so
 * this fills the <main> content area with the stat-tiles + table shape the
 * admin screens share.
 */
export default function AdminLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-7 w-48 rounded-lg" />
      <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/50"
          >
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-64 max-w-full rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <SkeletonTable className="mt-4" rows={8} columns={5} />
    </div>
  );
}
