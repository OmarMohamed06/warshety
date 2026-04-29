import type { Metadata } from "next";
import { Figtree, Cairo } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";
import type { Locale } from "@/context/LanguageContext";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Warshety — Premium Car Parts & Expert Services",
    template: "%s | Warshety",
  },
  description:
    "Egypt's #1 automotive marketplace. Buy compatible spare parts, book trusted service centers, and shop from verified vendors. قطع غيار سيارات ومراكز خدمة موثوقة في مصر.",
  metadataBase: new URL("https://garage.eg"),
  keywords: [
    "spare parts Egypt",
    "قطع غيار",
    "car service Cairo",
    "مركز صيانة",
    "brake pads",
    "تغيير زيت",
    "automotive marketplace Egypt",
  ],
  openGraph: {
    siteName: "Warshety",
    locale: "ar_EG",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  verification: {
    google: "NR1TCBHx-4t870BEXmDw9AbkZjBAcI8iJFu2qMiSEtw",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const locale = (headersList.get("x-locale") ?? "en") as Locale;
  const isRTL = locale === "ar";

  // Build hreflang URLs from the external pathname set by middleware
  const externalPath = headersList.get("x-pathname") ?? `/${locale}`;
  const internalPath = externalPath.replace(/^\/(en|ar)/, "") || "/";
  const baseUrl = "https://garage.eg";
  const enUrl = `${baseUrl}/en${internalPath}`;
  const arUrl = `${baseUrl}/ar${internalPath}`;

  return (
    <html
      lang={locale}
      dir={isRTL ? "rtl" : "ltr"}
      className={cn("light", "font-sans", figtree.variable, cairo.variable)}
    >
      <head>
        {/* ── SEO: hreflang alternate links ── */}
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="ar" href={arUrl} />
        <link rel="alternate" hrefLang="x-default" href={enUrl} />
        {/* ── Preconnect hints for faster DNS resolution ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://ldscfwokohxoxdtyqzzz.supabase.co"
        />
        {/* ── Google Material Symbols icon font ── */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${figtree.variable} ${cairo.variable} font-sans bg-[#f6f6f8] dark:bg-[#111621] text-slate-900 dark:text-slate-100 antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
