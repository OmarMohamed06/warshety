import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المنتج غير موجود | Product Not Found | Warshety",
  robots: { index: false, follow: false },
};

/**
 * Shown when `getProductBySlug()` returns null — i.e. the slug has no
 * matching row in catalog_products.
 */
export default function ProductNotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Product Not Found
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          We couldn't find a product matching that part number. It may have been
          removed or the URL might be incorrect.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/parts"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Browse Parts
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
