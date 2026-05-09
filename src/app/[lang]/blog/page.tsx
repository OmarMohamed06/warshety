import type { Metadata } from "next";
import Link from "next/link";
import { generateSeoMeta } from "@/utils/seo";
import NewsletterForm from "@/components/blog/NewsletterForm";
import { getAllArticles, calculateReadingTime } from "@/lib/blog";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  return generateSeoMeta({
    title: isAr
      ? "مدونة ورشتي — نصائح السيارات والصيانة في مصر"
      : "Warshety Blog — Car Tips & Maintenance Advice in Egypt",
    description: isAr
      ? "اقرأ أحدث مقالات ورشتي عن صيانة السيارات، قطع الغيار، ونصائح الخبراء لسائقي مصر."
      : "Read the latest Warshety articles on car maintenance, spare parts, and expert tips for Egyptian drivers.",
    path: "/blog",
    locale: isAr ? "ar" : "en",
  });
}

const CARD_COLORS = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-pink-500",
];

const FEATURED_GRADIENT = "from-orange-600 to-red-700";

export default async function BlogPage({ params }: Props) {
  const { lang } = await params;
  const isAr = lang === "ar";

  const allArticles = getAllArticles();
  const featured = allArticles[0];
  const posts = allArticles.slice(1);

  return (
    <div
      className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]"
      dir={isAr ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <nav className="text-xs text-slate-400 mb-8 flex items-center gap-2">
            <Link
              href={`/${lang}`}
              className="hover:text-[#FF4B19] transition-colors"
            >
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <span>/</span>
            <span className="text-slate-300">{isAr ? "المدونة" : "Blog"}</span>
          </nav>
          <div className="max-w-2xl">
            <span className="inline-block text-[#FF4B19] text-xs font-semibold tracking-widest uppercase mb-3">
              {isAr ? "ورشتي تكتب" : "Warshety Writes"}
            </span>
            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
              {isAr ? "مدونة ورشتي" : "Warshety Blog"}
            </h1>
            <p className="text-slate-400 text-lg">
              {isAr
                ? "نصائح السيارات، قطع الغيار، والصيانة — من خبراء ورشتي لك."
                : "Car tips, spare parts, and maintenance advice — from Warshety experts to you."}
            </p>
          </div>
        </div>
      </section>

      {/* ── Featured post ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <Link
          href={`/${lang}/blog/${featured.slug}`}
          className="group block rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-2xl transition-shadow"
        >
          <div
            className={`bg-gradient-to-r ${FEATURED_GRADIENT} p-10 md:p-14 text-white relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
            <div className="relative">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {isAr ? "مقال مميز" : "Featured"}
              </span>
              <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">
                {isAr ? featured.title_ar : featured.title_en}
              </h2>
              <p className="text-white/80 text-base leading-relaxed max-w-2xl">
                {isAr
                  ? featured.meta_description_ar
                  : featured.meta_description_en}
              </p>
            </div>
          </div>
          <div className="px-8 py-5 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-4 h-4"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z"
                  clipRule="evenodd"
                />
              </svg>
              {calculateReadingTime(
                isAr ? featured.content_ar : featured.content_en,
                isAr,
              )}{" "}
              {isAr ? "دقيقة قراءة" : "min read"}
            </span>
            <span className="text-[#FF4B19] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              {isAr ? "اقرأ المقال" : "Read Article"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
        </Link>
      </section>

      {/* ── Posts grid ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-4 pb-20">
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
          {isAr ? "أحدث المقالات" : "Latest Articles"}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length];
            const readMin = calculateReadingTime(
              isAr ? post.content_ar : post.content_en,
              isAr,
            );
            return (
              <Link
                key={post.slug}
                href={`/${lang}/blog/${post.slug}`}
                className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-shadow"
              >
                {/* Color banner */}
                <div
                  className={`${color} h-36 flex items-center justify-center relative overflow-hidden`}
                >
                  <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white to-transparent" />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-14 h-14 text-white opacity-80 drop-shadow-lg"
                    aria-hidden
                  >
                    <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
                  </svg>
                </div>
                {/* Content */}
                <div className="p-5">
                  <h3 className="font-black text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-[#FF4B19] transition-colors line-clamp-2">
                    {isAr ? post.title_ar : post.title_en}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                    {isAr ? post.meta_description_ar : post.meta_description_en}
                  </p>
                  <div className="flex items-center justify-end text-xs text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {readMin} {isAr ? "دقيقة" : "min read"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Newsletter CTA ───────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FF4B19]/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[#FF4B19] text-2xl">
              mail
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            {isAr ? "احصل على أحدث المقالات" : "Get the Latest Articles"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {isAr
              ? "اشترك ليصلك كل جديد عن السيارات والصيانة مباشرة في بريدك."
              : "Subscribe to receive the latest car tips and maintenance advice in your inbox."}
          </p>
          <NewsletterForm isAr={isAr} />
        </div>
      </section>
    </div>
  );
}
