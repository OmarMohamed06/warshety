"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

/**
 * Dialog — the app's primary popup surface.
 *
 * Layout system (keep these in step if you change one):
 *   inline padding   20px mobile / 24px desktop  (p-5 sm:p-6)
 *   section rhythm   20px between header/body/footer (gap-5)
 *   corner radius    24px mobile sheet / 16px desktop panel
 *   title            18px semibold, description 14px muted
 *
 * On phones the panel docks to the bottom as a sheet — the same pattern
 * VoucherModal already uses — and becomes a centred panel from `sm` up.
 */

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        // A real scrim. The previous bg-black/10 barely separated the panel
        // from the page, which is most of why dialogs read as "flat".
        "fixed inset-0 isolate z-50 bg-slate-950/50 duration-150",
        "supports-backdrop-filter:backdrop-blur-[2px]",
        "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Width tiers. Deliberately unprefixed `max-w-*`: a breakpoint-prefixed
 * default (the old `sm:max-w-sm`) survives tailwind-merge against a caller's
 * unprefixed `max-w-lg` and then wins inside its media query — which silently
 * clamped every dialog in the app to 384px on desktop. Unprefixed here means
 * `<DialogContent className="max-w-2xl">` merges and actually applies.
 */
const dialogSizes = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
} as const;

export type DialogSize = keyof typeof dialogSizes;

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "md",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  /** Width tier. Overridable with a plain `max-w-*` in className. */
  size?: DialogSize;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 flex flex-col gap-5 bg-background text-sm outline-none",
          // ── Phones: bottom sheet, full-bleed, rounded top only ──
          "inset-x-0 bottom-0 w-full max-sm:max-w-none rounded-t-3xl",
          "max-h-[calc(100dvh-3rem)]",
          // ── sm and up: centred panel ──
          "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2",
          "sm:w-[calc(100%-3rem)] sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-2xl sm:max-h-[calc(100dvh-4rem)]",
          // ── Elevation: layered shadow + hairline, instead of a flat ring ──
          "shadow-2xl shadow-slate-950/25 ring-1 ring-slate-900/5 dark:ring-white/10",
          "p-5 sm:p-6",
          "overflow-y-auto overscroll-contain",
          // ── Motion: slides up on phones, scales in on desktop ──
          "duration-200 data-open:animate-in data-closed:animate-out",
          "data-open:fade-in-0 data-closed:fade-out-0",
          "max-sm:data-open:slide-in-from-bottom-8 max-sm:data-closed:slide-out-to-bottom-8",
          "sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
          dialogSizes[size],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                // Optically aligned with the title's cap height rather than
                // jammed into the corner.
                className="absolute end-3.5 top-3.5 text-muted-foreground sm:end-4 sm:top-4"
                size="icon"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      // pe-10 keeps the title clear of the close button.
      className={cn("flex flex-col gap-1.5 pe-10 text-start", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Negative insets must mirror the panel's p-5 / sm:p-6 exactly, or the
        // footer bar detaches from the panel edge.
        "-mx-5 -mb-5 mt-auto sm:-mx-6 sm:-mb-6",
        "flex flex-col-reverse gap-2 border-t bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-4 sm:px-6",
        "rounded-b-none sm:rounded-b-2xl",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      // leading-snug rather than leading-none: the old value clipped
      // descenders on Arabic and on letters like g/y.
      className={cn(
        "text-lg leading-snug font-semibold tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm leading-relaxed text-muted-foreground",
        "*:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
