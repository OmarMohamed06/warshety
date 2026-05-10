/**
 * Route-segment loading UI for all /[lang]/admin/* pages.
 * Shown during navigation and while admin page JS is being loaded.
 */
export default function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
