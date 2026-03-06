"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalSize = "sm" | "md" | "lg" | "xl";

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
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
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
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]",
          "transition-opacity duration-200",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />

      {/* ── Centering wrapper ── */}
      <div
        className={cn(
          "fixed inset-0 z-[1001] flex items-center justify-center p-4",
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
            "w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl",
            "border border-slate-100 dark:border-slate-800",
            "transition-transform duration-200",
            open ? "scale-100" : "scale-95",
            sizeMap[size],
            className,
          )}
        >
          {/* ── Header ── */}
          {(title || description) && (
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex-1 min-w-0 pr-4">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-lg font-black text-slate-900 dark:text-white"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="text-sm text-slate-500 mt-1"
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
                  "w-8 h-8 rounded-lg shrink-0",
                  "flex items-center justify-center",
                  "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
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
            <div className="px-6 py-5 text-sm text-slate-700 dark:text-slate-300">
              {children}
            </div>
          )}

          {/* ── Footer ── */}
          {footer && (
            <div className="px-6 pb-6 pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
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
  const variantStyle =
    confirmVariant === "danger"
      ? "bg-red-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-90 transition-all disabled:opacity-50"
      : "bg-[#FF4B19] text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-90 shadow-lg shadow-[#FF4B19]/20 transition-all disabled:opacity-50";

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
            className="border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-5 py-2.5 text-sm hover:border-slate-300 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={variantStyle}
          >
            {loading ? "…" : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
