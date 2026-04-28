import { Providers } from "@/app/providers";
import type { Metadata } from "next";
import type { Locale } from "@/context/LanguageContext";
import { BASE_URL, SITE_NAME_AR, SITE_NAME_EN } from "@/utils/seo";

/**
 * Generate metadata at the locale layout level.
 * This sets global hreflang alternates for every page under /[lang]/.
 * Individual pages override title/description via their own generateMetadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (["en", "ar"].includes(lang) ? lang : "ar") as Locale;
  const isAr = locale === "ar";

  return {
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        ar: `${BASE_URL}/ar`,
        en: `${BASE_URL}/en`,
        "x-default": `${BASE_URL}/ar`, // Arabic is the default market
      },
    },
    openGraph: {
      siteName: isAr ? SITE_NAME_AR : SITE_NAME_EN,
      locale: isAr ? "ar_EG" : "en_US",
    },
  };
}

/**
 * Locale layout — wraps every /en/* and /ar/* route.
 * Reads the locale from the [lang] URL segment and passes it to Providers,
 * which initialises LanguageContext for all child components.
 *
 * Navbar and Footer are rendered inside Providers to keep the React fiber
 * tree structure consistent between SSR and CSR (prevents Base UI ID mismatches).
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (["en", "ar"].includes(lang) ? lang : "en") as Locale;

  return (
    <Providers locale={locale}>
      <main>{children}</main>
    </Providers>
  );
}
