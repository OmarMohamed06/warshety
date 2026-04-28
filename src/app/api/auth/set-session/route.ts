import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges hash tokens (from a Supabase recovery link) into a server-side session.
 * Called by the reset-password page to avoid client/middleware lock conflicts.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const next = searchParams.get("next") ?? "/en/auth/reset-password";

  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(
      `${origin}/en/auth/forgot-password?error=invalid_link`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.redirect(
      `${origin}/en/auth/forgot-password?error=link_expired`,
    );
  }

  // Session is now in cookies — redirect to the reset page (no hash)
  const response = NextResponse.redirect(`${origin}${next}`);
  return response;
}
