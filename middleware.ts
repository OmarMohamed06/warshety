import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// ─────────────────────────────────────────────────────────────────────────────
// Route configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Routes that require any authenticated user */
const PROTECTED_ROUTES = [
  "/profile",
  "/orders",
  "/bookings",
  "/garage",
  "/checkout",
];

/** Routes that require role=vendor */
const VENDOR_ROUTES = [
  "/vendor/dashboard",
  "/vendor/bookings",
  "/vendor/services",
  "/vendor/products",
  "/vendor/orders",
  "/vendor/inventory",
  "/vendor/calendar",
  "/vendor/settings",
];

/** Routes that require role=admin */
const ADMIN_ROUTES = ["/admin"];

/** Routes that should redirect to home if already authenticated */
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // ── If user is signed in, redirect away from auth pages ──────────────────
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── Guard: must be authenticated ─────────────────────────────────────────
  const needsAuth = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── Guard: vendor & admin routes ──────────────────────────────────────────
  const needsVendorOrAdmin =
    VENDOR_ROUTES.some((r) => pathname.startsWith(r)) ||
    ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  if (needsVendorOrAdmin) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // Fetch user role from DB
    let supabaseResponse2 = NextResponse.next({ request });
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse2 = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse2.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (
      VENDOR_ROUTES.some((r) => pathname.startsWith(r)) &&
      role !== "vendor" &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/vendor/apply", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
