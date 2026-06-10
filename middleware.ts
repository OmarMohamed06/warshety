import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { withTimeout } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Locale configuration
// ─────────────────────────────────────────────────────────────────────────────

type Locale = "en" | "ar";
const DEFAULT_LOCALE: Locale = "en";

/** Infer best locale from cookie or Accept-Language header */
function detectLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale === "en" || cookieLocale === "ar") return cookieLocale;
  const acceptLang = request.headers.get("accept-language") ?? "";
  // Accept-Language like "ar,en;q=0.9" → Arabic
  if (/\bar\b/i.test(acceptLang)) return "ar";
  return DEFAULT_LOCALE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route configuration
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED_ROUTES = [
  "/profile",
  "/orders",
  "/bookings",
  "/garage",
  "/checkout",
  "/branch",
];

const VENDOR_ROUTES = [
  "/vendor/dashboard",
  "/vendor/bookings",
  "/vendor/branches", // includes /vendor/branches/[id]/managers
  "/vendor/services",
  "/vendor/products",
  "/vendor/orders",
  "/vendor/inventory",
  "/vendor/calendar",
  "/vendor/settings",
  "/vendor/customers",
  "/vendor/reviews",
  "/vendor/billing",
];

const ADMIN_ROUTES = ["/admin"];
const AUTH_ROUTES = ["/auth/login", "/auth/register"];
const VENDOR_AUTH_ROUTES = ["/vendor/login", "/auth/vendor-setup"];

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  try {
    return await middlewareInner(request);
  } catch (err) {
    console.error("[middleware] Unhandled error:", err);
    // Pass through rather than returning a 500
    return NextResponse.next();
  }
}

async function middlewareInner(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Step 1: detect locale prefix in URL ───────────────────────────────────
  const localeMatch = pathname.match(/^\/(en|ar)(\/|$)/);

  if (!localeMatch) {
    // No locale prefix → redirect to /{detectedLocale}/path
    const locale = detectLocale(request);
    const redirectUrl = new URL(
      `/${locale}${pathname === "/" ? "" : pathname}${request.nextUrl.search}`,
      request.url,
    );
    return NextResponse.redirect(redirectUrl);
  }

  // ── Step 2: extract locale + internal path ────────────────────────────────
  const locale = localeMatch[1] as Locale;
  const internalPath = pathname.replace(/^\/(en|ar)/, "") || "/";

  // ── Step 3: refresh Supabase session ──────────────────────────────────────
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // ── Server Actions: never redirect them ───────────────────────────────────
  // Server Actions are dispatched as POST requests to the *current page URL*
  // (not /api), carrying a `next-action` header. If middleware returns a
  // redirect (e.g. because getUser() timed out or a role guard failed), the
  // Server Action POST receives a 307 instead of the expected action result —
  // which surfaces as a Next.js E394 "invalid/unexpected response" error and
  // the action silently fails. Each Server Action performs its own auth checks,
  // so here we just refresh the session cookie and pass through untouched.
  if (request.method === "POST" && request.headers.has("next-action")) {
    supabaseResponse.headers.set("x-locale", locale);
    supabaseResponse.headers.set("x-pathname", pathname);
    return supabaseResponse;
  }

  // Helper: create a locale-prefixed redirect carrying Supabase cookies
  function localeRedirect(path: string, search = ""): NextResponse {
    const url = new URL(`/${locale}${path}${search}`, request.url);
    const res = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      res.cookies.set(cookie); // pass full cookie object to preserve httpOnly/secure flags
    }
    return res;
  }

  // ── Step 4: auth guards (based on internalPath) ───────────────────────────
  const isVendorAuthRoute = VENDOR_AUTH_ROUTES.some((r) =>
    internalPath.startsWith(r),
  );
  void isVendorAuthRoute; // used implicitly by pass-through below

  if (user && AUTH_ROUTES.some((r) => internalPath.startsWith(r))) {
    return localeRedirect("/");
  }

  if (user && internalPath.startsWith("/vendor/login")) {
    return localeRedirect("/vendor/dashboard");
  }

  if (internalPath.startsWith("/auth/vendor-setup") && !user) {
    return localeRedirect("/auth/login", "?error=session_required");
  }

  if (PROTECTED_ROUTES.some((r) => internalPath.startsWith(r)) && !user) {
    return localeRedirect("/auth/login", `?next=/${locale}${internalPath}`);
  }

  const needsVendorOrAdmin =
    VENDOR_ROUTES.some((r) => internalPath.startsWith(r)) ||
    ADMIN_ROUTES.some((r) => internalPath.startsWith(r));

  // Holds the role fetched during the guard check so the cookie-caching
  // block below can reuse it without a second DB round-trip.
  let fetchedRole: string | undefined;

  if (needsVendorOrAdmin) {
    if (!user) {
      return localeRedirect("/vendor/login", `?next=/${locale}${internalPath}`);
    }

    // Check role cache cookie first to avoid a DB round-trip on every request
    const cachedRole = request.cookies.get("_role")?.value;
    let role: string | undefined = cachedRole;

    if (!role) {
      // Reuse the supabase client already created by updateSession
      const { data: profile } = await withTimeout(
        supabase.from("users").select("role").eq("id", user.id).single(),
        3000,
        { data: null } as { data: { role?: string } | null },
      );
      role = profile?.role ?? undefined;
      fetchedRole = role; // capture for cookie-caching below
    }

    if (
      ADMIN_ROUTES.some((r) => internalPath.startsWith(r)) &&
      role !== "admin"
    ) {
      return localeRedirect("/");
    }

    if (
      VENDOR_ROUTES.some((r) => internalPath.startsWith(r)) &&
      role !== "vendor" &&
      role !== "admin" &&
      role !== "manager"
    ) {
      return localeRedirect("/vendor/apply");
    }

    // Branch managers (role='manager') cannot access owner-only routes
    if (role === "manager") {
      const isBranchListExact =
        internalPath === "/vendor/branches" ||
        internalPath === "/vendor/branches/";
      const isOwnerOnly =
        isBranchListExact ||
        ["/vendor/billing", "/vendor/settings"].some((r) =>
          internalPath.startsWith(r),
        );
      if (isOwnerOnly) {
        return localeRedirect("/vendor/dashboard");
      }
    }
  }

  // ── Step 5: pass through — inject locale headers for root layout SSR ────────
  // Mutate supabaseResponse directly rather than creating a new NextResponse.
  // A new NextResponse.next() breaks the Supabase cookie chain — the refreshed
  // session tokens that updateSession baked into supabaseResponse are lost.
  supabaseResponse.headers.set("x-locale", locale);
  supabaseResponse.headers.set("x-pathname", pathname); // e.g. /ar/services

  // Persist locale cookie (1 year)
  supabaseResponse.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Cache role for 1 minute so repeat navigations skip the DB query.
  // Reuse `fetchedRole` from the guard block above — no second DB call needed.
  if (
    user &&
    needsVendorOrAdmin &&
    !request.cookies.get("_role")?.value &&
    fetchedRole
  ) {
    supabaseResponse.cookies.set("_role", fetchedRole, {
      path: "/",
      maxAge: 60,
      sameSite: "lax",
      httpOnly: true,
    });
  } else if (!user) {
    // Clear stale role cookie on logout
    supabaseResponse.cookies.delete("_role");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/ routes (handled directly by Next.js, no locale needed)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt, public assets
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
