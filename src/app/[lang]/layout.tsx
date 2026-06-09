import { Providers } from "@/app/providers";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/utils";
import type { Metadata } from "next";
import type { Locale } from "@/context/LanguageContext";
import type { DbUser, DbVendor } from "@/types/database";
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

  // ── Server-side auth pre-fetch ────────────────────────────────────────────
  // Reading auth from the server eliminates the client-side loading flash:
  // the AuthProvider hydrates immediately with real data instead of null.
  // getUser() verifies the JWT with Supabase — never returns stale data.
  let initialProfile: DbUser | null = null;
  let initialVendor: DbVendor | null = null;
  let initialManagedBranchId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await withTimeout(supabase.auth.getUser(), 3000, {
      data: { user: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

    if (authUser) {
      const { data: profile } = await withTimeout(
        supabase.from("users").select("*").eq("id", authUser.id).single(),
        3000,
        { data: null } as unknown as Awaited<
          ReturnType<ReturnType<typeof supabase.from>["select"]>
        >,
      );

      if (profile) {
        initialProfile = profile as DbUser;

        if (profile.role === "vendor") {
          const { data: vendorRow } = await withTimeout(
            supabase
              .from("vendors")
              .select("*")
              .eq("user_id", authUser.id)
              .single(),
            3000,
            { data: null } as unknown as Awaited<
              ReturnType<ReturnType<typeof supabase.from>["select"]>
            >,
          );
          initialVendor = (vendorRow as DbVendor) ?? null;
        } else if (profile.role === "manager") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: assignment } = await withTimeout(
            (supabase as any)
              .from("branch_users")
              .select("branch_id")
              .eq("user_id", authUser.id)
              .limit(1)
              .maybeSingle(),
            3000,
            { data: null } as unknown as Awaited<
              ReturnType<ReturnType<typeof supabase.from>["select"]>
            >,
          );
          initialManagedBranchId = assignment?.branch_id ?? null;
        }
      }
    }
  } catch {
    // If Supabase is unreachable, the client will still initialize correctly
    // via onAuthStateChange — just with an initial loading flash.
  }

  return (
    <Providers
      locale={locale}
      initialProfile={initialProfile}
      initialVendor={initialVendor}
      initialManagedBranchId={initialManagedBranchId}
    >
      <main>{children}</main>
    </Providers>
  );
}
