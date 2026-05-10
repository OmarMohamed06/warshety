/**
 * Route-segment loading UI for all /[lang]/* pages.
 * Next.js App Router automatically wraps page.tsx in <Suspense> using this
 * file, so the fallback is shown while the server streams the page.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
