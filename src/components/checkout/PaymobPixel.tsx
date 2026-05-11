"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface PaymobPixelProps {
  publicKey: string;
  clientSecret: string;
  /** e.g. ["card", "apple-pay", "google-pay"] */
  paymentMethods: string[];
  onComplete: (args: { success: boolean }) => void;
}

declare global {
  interface Window {
    // Paymob Pixel SDK (loaded from CDN)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Pixel?: new (config: Record<string, unknown>) => void;
  }
}

const PIXEL_CSS =
  "https://cdn.jsdelivr.net/npm/paymob-pixel@latest/dist/pixel.css";
const PIXEL_JS =
  "https://cdn.jsdelivr.net/npm/paymob-pixel@latest/dist/pixel.esm.js";

export function PaymobPixel({
  publicKey,
  clientSecret,
  paymentMethods,
  onComplete,
}: PaymobPixelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  // Keep a stable reference to the callback to avoid re-triggering the effect
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (initializedRef.current) return;

    // Inject CSS (idempotent)
    if (!document.querySelector(`link[href="${PIXEL_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = PIXEL_CSS;
      document.head.appendChild(link);
    }

    // Inject ES module script
    const script = document.createElement("script");
    script.type = "module";
    script.src = PIXEL_JS;
    script.onload = () => {
      if (!window.Pixel) {
        console.error(
          "[PaymobPixel] window.Pixel not available after script load",
        );
        return;
      }
      // eslint-disable-next-line no-new
      new window.Pixel({
        publicKey,
        clientSecret,
        paymentMethods,
        elementId: "paymob-pixel-container",
        afterPaymentComplete: (result: { success: boolean }) => {
          onCompleteRef.current(result);
        },
      });
      initializedRef.current = true;
    };
    script.onerror = () => {
      console.error("[PaymobPixel] Failed to load Pixel SDK script");
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove the script on unmount — Pixel SDK manages its own state
    };
  }, [publicKey, clientSecret, paymentMethods]);

  return (
    <div className="relative min-h-[200px]">
      {/* Loading placeholder shown until Pixel renders into the container */}
      <div id="paymob-pixel-container" ref={containerRef} className="w-full" />
      <noscript>
        <p className="text-sm text-destructive">
          JavaScript must be enabled to complete your payment.
        </p>
      </noscript>
    </div>
  );
}
