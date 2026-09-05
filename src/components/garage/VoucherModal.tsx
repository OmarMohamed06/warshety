"use client";

/**
 * VoucherModal — Shows QR code + code after redemption (service reward)
 *                or promo code (parts reward).
 */

import { useEffect, useRef, useState } from "react";
import { X, Copy, CheckCheck, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DbUserReward } from "@/services/rewardsService";

interface VoucherModalProps {
  userReward: DbUserReward | null;
  onClose: () => void;
}

export function VoucherModal({ userReward, onClose }: VoucherModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userReward?.qr_data) return;
    // Generate QR using a public API — no external dependency needed in Next.js
    const encoded = encodeURIComponent(userReward.qr_data);
    setQrSrc(
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`,
    );
  }, [userReward]);

  // Escape to dismiss + freeze the page behind the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!userReward) return null;

  const isService = !!userReward.qr_data;
  const reward = userReward.reward;
  const title = reward?.title ?? "Reward";

  const handleCopy = () => {
    navigator.clipboard.writeText(userReward.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:p-6"
    >
      <div className="relative max-h-[calc(100dvh-3rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-t-3xl bg-card p-6 shadow-2xl shadow-slate-950/25 ring-1 ring-slate-900/5 duration-200 animate-in fade-in-0 slide-in-from-bottom-8 sm:max-h-[calc(100dvh-4rem)] sm:rounded-2xl sm:slide-in-from-bottom-0 sm:zoom-in-95 dark:ring-white/10">
        {/* Close — same 32px target and inset as Dialog's */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute end-4 top-4 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center gap-5 text-center">
          {/* Success badge */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <QrCode size={32} className="text-primary" />
          </div>

          <div className="px-4">
            <h2 className="text-lg leading-snug font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {isService
                ? "Show this QR or code to the service center"
                : "Apply this code at checkout for parts"}
            </p>
          </div>

          {/* QR Code for service rewards */}
          {isService && qrSrc && (
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR Code"
                width={180}
                height={180}
                className="block"
              />
            </div>
          )}

          {/* Code */}
          <div className="w-full rounded-xl bg-muted px-4 py-3">
            <p className="mb-1 text-xs text-muted-foreground">
              {isService ? "Or enter code manually" : "Promo Code"}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xl font-bold tracking-widest text-foreground">
                {userReward.code}
              </span>
              <button
                onClick={handleCopy}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-background/70",
                  copied
                    ? "text-green-600"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {userReward.is_used && (
            <div className="w-full rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
              This voucher has already been used.
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
