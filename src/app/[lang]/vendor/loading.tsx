/**
 * Route-segment loading UI for all /[lang]/vendor/* pages.
 * Shown during navigation and while vendor page JS is being loaded.
 */
export default function VendorLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
