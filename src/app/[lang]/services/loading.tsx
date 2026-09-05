import { Skeleton, SkeletonCardGrid } from "@/components/ui/skeleton";

/**
 * Loading UI for the service-centers listing.
 * Mirrors the real page: title, filter row, then the results grid — so the
 * layout does not jump when the centers arrive.
 */
export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />

        {/* category chips */}
        <div className="mt-8 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          {/* filter sidebar */}
          <aside className="hidden w-64 shrink-0 space-y-4 lg:block">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/50"
              >
                <Skeleton className="mb-3 h-4 w-24" />
                <div className="space-y-2.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/6" />
                </div>
              </div>
            ))}
          </aside>

          <SkeletonCardGrid className="flex-1 sm:grid-cols-2" count={6} />
        </div>
      </div>
    </div>
  );
}
