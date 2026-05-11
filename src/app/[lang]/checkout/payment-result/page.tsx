"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Payment result page — redirect target for Paymob Unified Checkout (wallet payments).
 * Paymob appends: ?success=true|false&id=<transaction_id>&order=<paymob_order_id>
 */
export default function PaymentResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { localePath } = useLanguage();

  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );

  useEffect(() => {
    const successParam = searchParams.get("success");
    if (successParam === null) {
      // No params yet — wait a moment for them to load
      return;
    }
    const isSuccess = successParam === "true" || successParam === "1";
    setStatus(isSuccess ? "success" : "failed");

    // Clear the cart on success (the cart context persists in localStorage)
    if (isSuccess) {
      try {
        localStorage.removeItem("warshety-cart");
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Your order has been confirmed. You&apos;ll receive a confirmation
            shortly.
          </p>
          <div className="flex gap-3 w-full">
            <Button asChild variant="outline" className="flex-1">
              <Link href={localePath("/parts")}>Continue Shopping</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href={localePath("/orders")}>My Orders</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // status === "failed"
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black mb-2">Payment Failed</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Your payment could not be completed. No charges were made. Please try
          again.
        </p>
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
          <Button asChild className="flex-1">
            <Link href={localePath("/parts")}>Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
