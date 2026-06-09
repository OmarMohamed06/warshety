import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Race a promise against a timeout. If the promise does not settle within
 * `ms` milliseconds (or rejects), `fallback` is returned instead.
 *
 * Used to wrap blocking server-side Supabase calls so a slow/cold/throttled
 * backend degrades gracefully (renders without auth/data) instead of hanging
 * the entire server render — which manifests as the page "buffering forever".
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, ms);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

export function formatPrice(price: number, currency = "EGP"): string {
  return `${currency} ${price.toLocaleString("en-EG")}`;
}
