import { redirect } from "next/navigation";
import { cookies } from "next/headers";

/**
 * Root fallback — immediately redirects to the locale-prefixed home page.
 * Middleware handles this for most requests, but this ensures no 404
 * when Next.js resolves / before the middleware redirect is followed.
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en";
  redirect(`/${locale}`);
}
