import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback handler for Supabase email confirmation, OAuth, and vendor invites.
 * Supabase redirects here after the user clicks the confirmation / invite email link.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin, pathname } = url;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Derive lang from path segment: /<lang>/auth/callback
  const lang = pathname.split("/")[1] ?? "en";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const meta = (data.user.user_metadata ?? {}) as Record<string, string>;
      const isVendorInvite = meta.role === "vendor";

      // If this is a vendor invite, always go to vendor-setup regardless of `next`
      if (isVendorInvite && !next.includes("vendor-setup")) {
        return NextResponse.redirect(`${origin}/${lang}/auth/vendor-setup`);
      }

      // Ensure `next` has the lang prefix
      const destination = next.startsWith(`/${lang}`)
        ? next
        : `/${lang}${next.startsWith("/") ? next : "/" + next}`;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Something went wrong — redirect to login with error, lang-prefixed
  return NextResponse.redirect(
    `${origin}/${lang}/auth/login?error=auth_callback_failed`,
  );
}
