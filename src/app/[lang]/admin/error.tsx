"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/** Error boundary for /[lang]/admin/* — keeps the admin shell mounted. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin route error]", error, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
