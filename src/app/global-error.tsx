"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself.
 *
 * This replaces <html>/<body>, so none of the app's providers, fonts, icon
 * font or CSS variables are guaranteed to be available — hence the plain
 * markup and inline styles, and no `t()`/icon-font usage. Copy is bilingual
 * because we cannot resolve the locale from here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
          background: "#f6f6f8",
          color: "#0f172a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: "28rem", fontSize: "14px", color: "#64748b", margin: 0 }}>
          We hit an unexpected problem. Please try again — if it keeps
          happening, refreshing the page usually helps.
        </p>
        <p
          style={{ maxWidth: "28rem", fontSize: "14px", color: "#64748b", margin: 0 }}
          dir="rtl"
          lang="ar"
        >
          حدث خطأ غير متوقع. برجاء المحاولة مرة أخرى.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "8px",
            border: 0,
            cursor: "pointer",
            borderRadius: "999px",
            background: "#FF4B19",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            padding: "10px 20px",
          }}
        >
          Try again · إعادة المحاولة
        </button>
      </body>
    </html>
  );
}
