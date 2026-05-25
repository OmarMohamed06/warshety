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
    title: isAr ? "سيارتي | ورشتي" : "My Garage | Warshety",
    description: isAr
      ? "أدر سياراتك، تابع مواعيد الصيانة، وراجع سجل خدمة كل مركبة في ورشتي."
      : "Manage your vehicles, track service appointments, and review the maintenance history for each car on Warshety.",
    path: `/${lang}/garage`,
    locale: isAr ? "ar" : "en",
    noIndex: true,
  });
}

export default function GarageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
