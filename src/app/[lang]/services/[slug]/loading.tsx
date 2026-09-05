import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Loading UI for a single service-center page: hero banner, then the
 * details column beside the booking card.
 */
export default function ServiceCenterLoading() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <Skeleton className="h-56 w-full rounded-none sm:h-72" />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-7 w-72 max-w-full rounded-lg" />
            <div className="mt-3 flex gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* tabs */}
            <div className="mt-8 flex gap-6 border-b border-slate-200/70 pb-3 dark:border-slate-700/60">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>

            <SkeletonText className="mt-6" lines={4} />

            <div className="mt-8 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/50"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* booking card */}
          <aside className="w-full shrink-0 lg:w-80">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-800/50">
              <Skeleton className="h-5 w-32" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <Skeleton className="mt-5 h-12 w-full rounded-full" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
