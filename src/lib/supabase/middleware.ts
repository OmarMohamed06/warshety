import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { withTimeout } from "@/lib/utils";

type GetUserResult = Awaited<
  ReturnType<ReturnType<typeof createServerClient<Database>>["auth"]["getUser"]>
>;

/**
 * Supabase middleware helper.
 * Refreshes the session cookie on every request and returns the updated response.
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Only mutate request cookies and the existing supabaseResponse.
          // Never create a new NextResponse here — that would discard the
          // already-set session tokens and break the cookie chain.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — IMPORTANT: do not remove this.
  // Wrapped in a timeout: if Supabase Auth is slow/cold/unreachable, we must
  // NOT block every request indefinitely. On timeout we treat the user as
  // unauthenticated and pass through — the page render degrades gracefully
  // instead of the whole site hanging ("buffering forever").
  const {
    data: { user },
  } = await withTimeout<GetUserResult>(supabase.auth.getUser(), 3000, {
    data: { user: null },
    error: null,
  } as unknown as GetUserResult);

  return { supabaseResponse, user, supabase };
}
