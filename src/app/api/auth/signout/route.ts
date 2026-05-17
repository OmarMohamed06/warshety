import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side sign-out handler.
 *
 * The browser Supabase client cannot reliably delete auth cookies that were
 * written by the middleware via Set-Cookie response headers (attribute
 * mismatches cause cookie deletion to silently fail). Calling signOut() here
 * uses the server client which deletes the cookies through Set-Cookie headers
 * — the only reliable way to clear them.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Return 200 so the caller can handle navigation itself.
  return new NextResponse(null, { status: 200 });
}
