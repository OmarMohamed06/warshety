"use client";

import { useLanguage } from "@/context/LanguageContext";
import { friendlyError, isRetryable } from "@/lib/errors";
import { cn } from "@/lib/utils";

/**
 * The standard "this didn't work" block.
 *
 * Takes the *raw* error and does the translating itself, so call sites never
 * have to decide what is safe to show. Raw text is logged, never rendered —
 * except behind a details toggle in development.
 */
export function ErrorState({
  error,
  onRetry,
  title,
  description,
  icon = "error_outline",
  className,
  compact = false,
}: {
  /** The caught error. Pass it through untouched. */
  error?: unknown;
  onRetry?: () => void;
  /** Overrides the derived heading. */
  title?: string;
  /** Overrides the derived body copy. */
  description?: string;
  icon?: string;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const message = description ?? friendlyError(error, t);
  const showRetry = Boolean(onRetry) && (error === undefined || isRetryable(error));

  const rawDetail =
    process.env.NODE_ENV === "development" && error
      ? error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error)
      : null;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-16",
        className,
      )}
    >
      <span
        className={cn(
          "material-symbols-outlined text-slate-400 dark:text-slate-500",
          compact ? "text-3xl" : "text-5xl",
        )}
      >
        {icon}
      </span>

      <h2
        className={cn(
          "font-semibold text-slate-900 dark:text-slate-100",
          compact ? "text-base" : "text-lg",
        )}
      >
        {title ?? t("errors.title")}
      </h2>

      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {message}
      </p>

      {showRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#FF4B19] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e63f10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4B19]"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          {t("common.retry")}
        </button>
      )}

      {rawDetail && (
        <details className="mt-4 max-w-lg text-start">
          <summary className="cursor-pointer text-xs text-slate-400">
            {t("common.technicalDetails")}
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-start text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {rawDetail}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Neutral "nothing here" block — not a failure, so no retry and no alert role.
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className,
      )}
    >
      <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
