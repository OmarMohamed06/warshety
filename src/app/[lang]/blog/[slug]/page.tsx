import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  getAllArticles,
  getArticleBySlug,
  getRelatedArticles,
  calculateReadingTime,
  extractFAQ,
} from "@/lib/blog";
import { generateSeoMeta, BASE_URL } from "@/utils/seo";
import BlogContent from "@/components/blog/BlogContent";
import BlogFAQ from "@/components/blog/BlogFAQ";
import BlogCTA from "@/components/blog/BlogCTA";
import RelatedArticles from "@/components/blog/RelatedArticles";
import ShareButtons from "@/components/blog/ShareButtons";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ lang: string; slug: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC PARAMS — pre-generate all /en/blog/[slug] and /ar/blog/[slug] routes
// ─────────────────────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return getAllArticles().flatMap((article) => [
    { lang: "en", slug: article.slug },
    { lang: "ar", slug: article.slug },
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO METADATA
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const isAr = lang === "ar";
  const locale = isAr ? ("ar" as const) : ("en" as const);

  const base = generateSeoMeta({
    title: isAr ? article.meta_title_ar : article.meta_title_en,
    description: isAr
      ? article.meta_description_ar
      : article.meta_description_en,
    path: `/blog/${slug}`,
    locale,
    // Both language alternates point to the SAME slug — same URL for both langs
    altPath: `/blog/${slug}`,
  });

  return {
    ...base,
    openGraph: {
      ...(base.openGraph as object),
      type: "article",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: Props) {
  const { lang, slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const isAr = lang === "ar";
  const rawContent = isAr ? article.content_ar : article.content_en;
  const { mainContent, faqs } = extractFAQ(rawContent);
  const readingTime = calculateReadingTime(rawContent, isAr);
  const title = isAr ? article.title_ar : article.title_en;
  const description = isAr
    ? article.meta_description_ar
    : article.meta_description_en;
  const pageUrl = `${BASE_URL}/${lang}/blog/${slug}`;
  const relatedArticles = getRelatedArticles(slug, 3);

  // ── Article JSON-LD schema ─────────────────────────────────────────────
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: pageUrl,
    inLanguage: isAr ? "ar-EG" : "en-US",
    author: {
      "@type": "Organization",
      name: isAr ? "ورشتي" : "Warshety",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: isAr ? "ورشتي" : "Warshety",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/og-default.jpg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
  };

  // ── FAQ JSON-LD schema ─────────────────────────────────────────────────
  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      {/* ── Structured data ─────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div
        className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]"
        dir={isAr ? "rtl" : "ltr"}
        lang={lang}
      >
        {/* ── Article header ───────────────────────────────────────────── */}
        <header className="bg-slate-950 text-white">
          <div className="max-w-3xl mx-auto px-6 py-12 md:py-14">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs text-slate-400 mb-7 flex-wrap"
            >
              <Link
                href={`/${lang}`}
                className="hover:text-[#FF4B19] transition-colors"
              >
                {isAr ? "الرئيسية" : "Home"}
              </Link>
              <span aria-hidden>/</span>
              <Link
                href={`/${lang}/blog`}
                className="hover:text-[#FF4B19] transition-colors"
              >
                {isAr ? "المدونة" : "Blog"}
              </Link>
              <span aria-hidden>/</span>
              <span className="text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                {title}
              </span>
            </nav>

            {/* Warshety brand label */}
            <span className="inline-block text-[#FF4B19] text-xs font-semibold tracking-widest uppercase mb-3">
              {isAr ? "ورشتي تكتب" : "Warshety Blog"}
            </span>

            {/* Title */}
            <h1 className="text-3xl md:text-[2.4rem] font-black leading-tight mb-5 text-white">
              {title}
            </h1>

            {/* Meta row: reading time + share */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              {/* Reading time */}
              <span className="flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-4 h-4 text-slate-500"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                {isAr
                  ? `${readingTime} دقيقة قراءة`
                  : `${readingTime} min read`}
              </span>

              <span className="text-slate-700" aria-hidden>
                ·
              </span>

              {/* Share buttons */}
              <ShareButtons url={pageUrl} title={title} isAr={isAr} />
            </div>
          </div>
        </header>

        {/* ── Article body ─────────────────────────────────────────────── */}
        <main className="max-w-3xl mx-auto px-6 py-10">
          {/* Main prose content */}
          <article>
            <BlogContent content={mainContent} />

            {/* FAQ accordion — extracted from the FAQ section */}
            <BlogFAQ faqs={faqs} isAr={isAr} />
          </article>

          {/* CTA — book service / find parts */}
          <BlogCTA isAr={isAr} lang={lang} />

          {/* Related articles grid */}
          <RelatedArticles articles={relatedArticles} isAr={isAr} lang={lang} />

          {/* Bottom share row */}
          <div
            className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4"
            dir={isAr ? "rtl" : "ltr"}
          >
            <Link
              href={`/${lang}/blog`}
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-[#FF4B19] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z"
                  clipRule="evenodd"
                />
              </svg>
              {isAr ? "العودة للمدونة" : "Back to Blog"}
            </Link>

            <ShareButtons url={pageUrl} title={title} isAr={isAr} />
          </div>
        </main>
      </div>
    </>
  );
}
