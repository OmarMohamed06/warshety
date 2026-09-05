"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/**
 * Error boundary for all /[lang]/* pages.
 *
 * Renders inside the locale layout, so Navbar/Footer and the language
 * provider stay mounted and the user keeps a way out of the failure.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The technical detail belongs here, not on screen.
    console.error("[route error]", error, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#f6f6f8] px-4 dark:bg-[#111621]">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
