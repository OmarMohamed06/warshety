import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  return {
    title: isAr ? "تسجيل الدخول | ورشتي" : "Sign In | Warshety",
    description: isAr
      ? "سجّل دخولك لمتابعة حجوزاتك وطلباتك على ورشتي."
      : "Sign in to manage your bookings and orders on Warshety.",
    robots: { index: false, follow: false },
  };
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
