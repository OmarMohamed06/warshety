import { Skeleton, SkeletonCardGrid } from "@/components/ui/skeleton";

/**
 * Route-segment loading UI for all /[lang]/* pages.
 * Next.js App Router automatically wraps page.tsx in <Suspense> using this
 * file, so the fallback is shown while the server streams the page.
 *
 * Navbar/Footer live in the locale layout and stay mounted, so this only
 * stands in for the page body — a generic content shape (heading + cards)
 * rather than a spinner floating in an empty viewport.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />

        <div className="mt-8 flex flex-wrap gap-3">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>

        <SkeletonCardGrid className="mt-8" count={6} />
      </div>
    </div>
  );
}
