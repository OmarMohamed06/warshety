"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface ModalProps {
  /** Controls visibility. The modal stays mounted for CSS transitions. */
  open: boolean;
  /** Called when the backdrop, close button, or Escape key is pressed. */
  onClose: () => void;
  /** Bold heading in the header row. */
  title?: string;
  /** Muted subtitle rendered beneath the title. */
  description?: string;
  /** Max-width tier. Defaults to "md". */
  size?: ModalSize;
  /** Body content. */
  children?: React.ReactNode;
  /**
   * Action buttons rendered in the footer.
   * Tip: use `<Button>` primitives for consistent spacing.
   *
   * @example
   * footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button>Confirm</Button></>}
   */
  footer?: React.ReactNode;
  /** Extra className applied to the white panel (not the backdrop). */
  className?: string;
}

const sizeMap: Record<ModalSize, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Centered dialog portal.
 *
 * Renders via `createPortal` directly into `document.body` so it escapes
 * every stacking context (z-index conflicts, overflow:hidden parents, etc.).
 *
 * The modal stays in the DOM when closed so opacity/scale transitions play
 * smoothly — `pointer-events-none` prevents interaction while invisible.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  className,
}: ModalProps) {
  // Gate the portal until the DOM is available (avoids SSR hydration errors).
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  const content = (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] z-[1000]",
          "transition-opacity duration-200",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />

      {/* ── Centering wrapper ── */}
      <div
        className={cn(
          "fixed inset-0 z-[1001] flex items-end justify-center sm:items-center sm:p-6",
          "transition-opacity duration-200",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        {/* ── Panel ── */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-describedby={description ? "modal-description" : undefined}
          className={cn(
            "w-full bg-white dark:bg-slate-900",
            "rounded-t-3xl sm:rounded-2xl",
            "shadow-2xl shadow-slate-950/25 ring-1 ring-slate-900/5 dark:ring-white/10",
            "transition-transform duration-200",
            "flex flex-col max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)]",
            // Sheets rise; centred panels scale.
            open
              ? "translate-y-0 sm:scale-100"
              : "translate-y-3 sm:translate-y-0 sm:scale-95",
            sizeMap[size],
            className,
          )}
        >
          {/* ── Header ── */}
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2
                    id="modal-title"
                    // font-black (900) at 18px reads as shouting; semibold with
                    // tightened tracking is the same emphasis, better colour.
                    className="text-lg leading-snug font-semibold tracking-tight text-slate-900 dark:text-white"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
                  >
                    {description}
                  </p>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className={cn(
                  "size-8 rounded-lg shrink-0 -me-1.5",
                  "flex items-center justify-center",
                  "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4B19]",
                  "text-slate-500",
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
                >
                  close
                </span>
              </button>
            </div>
          )}

          {/* ── Body ── */}
          {children && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 text-sm leading-relaxed text-slate-700 sm:px-6 sm:pb-6 dark:text-slate-300">
              {children}
            </div>
          )}

          {/* ── Footer ── */}
          {footer && (
            <div className="mt-auto flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 dark:border-slate-800 dark:bg-slate-800/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

/**
 * Pre-wired two-button confirmation dialog.
 * Renders a destructive "Confirm" and a "Cancel" button in the footer.
 *
 * @example
 * <ConfirmModal
 *   open={showDeleteModal}
 *   onClose={() => setShowDeleteModal(false)}
 *   onConfirm={handleDelete}
 *   title="Delete product?"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   confirmVariant="danger"
 * />
 */
export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  /** Text on the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Button variant for the confirm button. Defaults to "primary". */
  confirmVariant?: "primary" | "danger";
  /** Text on the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  cancelLabel = "Cancel",
  loading = false,
  children,
}: ConfirmModalProps) {
  // Import Button lazily to avoid a circular import risk
  // (Button → this file → Button). In practice they're siblings but this
  // keeps things explicit.
  const base =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";
  const variantStyle =
    confirmVariant === "danger"
      ? `${base} bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-500`
      : `${base} bg-[#FF4B19] text-white hover:bg-[#e63f10] shadow-lg shadow-[#FF4B19]/20 focus-visible:outline-[#FF4B19]`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className={`${base} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={variantStyle}
          >
            {loading && (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            )}
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
