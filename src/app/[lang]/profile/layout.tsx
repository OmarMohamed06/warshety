import type { Metadata } from "next";
import { generateSeoMeta } from "@/utils/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  return generateSeoMeta({
    title: isAr ? "الملف الشخصي | ورشتي" : "My Profile | Warshety",
    description: isAr
      ? "عدّل بياناتك الشخصية وتابع حجوزاتك وطلباتك في ورشتي."
      : "Edit your personal details and track your bookings and orders on Warshety.",
    path: `/${lang}/profile`,
    locale: isAr ? "ar" : "en",
    noIndex: true,
  });
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
