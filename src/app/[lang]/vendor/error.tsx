"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/** Error boundary for /[lang]/vendor/*. */
export default function VendorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vendor route error]", error, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] px-4 dark:bg-[#111621]">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
