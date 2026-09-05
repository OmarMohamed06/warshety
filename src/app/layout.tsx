import type { Metadata } from "next";
import { Figtree, Cairo } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
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
  metadataBase: new URL("https://warshety.com"),
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
        {/* ── Google Material Symbols icon font ──
            display=block (not swap) is essential: Material Symbols is a
            LIGATURE font, so with `swap` the fallback font paints the raw
            ligature text ("home", "search", ...) until the font arrives.
            `block` keeps the glyph invisible during the block period instead. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
        {/* Belt-and-braces for the FOUT above: icons stay `visibility:hidden`
            (layout space reserved, so no shift) until the font is actually
            ready. Runs before paint, so the ligature text is never shown. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document,r=d.documentElement;function go(){r.classList.add('icon-font-ready')}
if(!d.fonts||!d.fonts.load){go();return}
try{d.fonts.load('24px "Material Symbols Outlined"').then(go).catch(go)}catch(e){go()}
setTimeout(go,3000)})();`,
          }}
        />
        {/* No JS means the class above never lands and icons would stay
            hidden forever — reveal them unconditionally in that case. */}
        <noscript>
          <style>{`html:not(.icon-font-ready) .material-symbols-outlined{visibility:visible;width:auto;min-width:0;overflow:visible}`}</style>
        </noscript>
      </head>
      <body
        className={`${figtree.variable} ${cairo.variable} font-sans bg-[#f6f6f8] dark:bg-[#111621] text-slate-900 dark:text-slate-100 antialiased`}
        suppressHydrationWarning
      >
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-C5G8WYS3G6"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-C5G8WYS3G6');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
