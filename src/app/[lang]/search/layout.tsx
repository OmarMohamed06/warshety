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
    title: isAr
      ? "بحث — مراكز الخدمة وقطع الغيار | ورشتي"
      : "Search — Service Centers & Parts | Warshety",
    description: isAr
      ? "ابحث عن مراكز صيانة السيارات وقطع الغيار في مصر بسرعة وسهولة."
      : "Quickly find car service centers and spare parts across Egypt.",
    path: `/${lang}/search`,
    locale: isAr ? "ar" : "en",
  });
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
