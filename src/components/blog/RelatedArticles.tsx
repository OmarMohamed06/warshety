import Link from "next/link";
import type { BlogArticle } from "@/lib/blog";

interface Props {
  articles: BlogArticle[];
  isAr: boolean;
  lang: string;
}

export default function RelatedArticles({ articles, isAr, lang }: Props) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-slate-200 dark:border-slate-800">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        {isAr ? "مقالات ذات صلة" : "Related Articles"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => {
          const title = isAr ? article.title_ar : article.title_en;
          const desc = isAr
            ? article.meta_description_ar
            : article.meta_description_en;

          return (
            <Link
              key={article.slug}
              href={`/${lang}/blog/${article.slug}`}
              className="group flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg hover:border-[#FF4B19]/30 dark:hover:border-[#FF4B19]/30 transition-all duration-200"
            >
              {/* Accent bar */}
              <span className="block w-8 h-1 rounded-full bg-[#FF4B19] mb-4 opacity-60 group-hover:opacity-100 group-hover:w-14 transition-all duration-300" />

              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-[#FF4B19] dark:group-hover:text-[#FF4B19] transition-colors leading-snug mb-2 text-[0.95rem]">
                {title}
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 flex-1">
                {desc}
              </p>

              <span className="mt-4 text-[#FF4B19] text-xs font-semibold flex items-center gap-1">
                {isAr ? "اقرأ المقال" : "Read article"}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className={`w-3 h-3 transition-transform duration-200 ${isAr ? "group-hover:-translate-x-1 rotate-180" : "group-hover:translate-x-1"}`}
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
