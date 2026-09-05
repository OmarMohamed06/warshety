import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Route-segment loading UI for all /[lang]/vendor/* pages.
 * Unlike admin, the vendor sidebar is rendered by each page (not the layout),
 * so this stands in for the whole screen including the nav rail.
 */
export default function VendorLoading() {
  return (
    <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* sidebar rail */}
      <aside className="hidden w-64 shrink-0 border-e border-slate-200/70 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/50 lg:block">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <div className="mt-8 space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl" />
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 p-6">
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

        <SkeletonTable className="mt-6" rows={6} columns={4} />
      </div>
    </div>
  );
}
