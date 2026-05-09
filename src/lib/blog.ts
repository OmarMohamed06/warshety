/**
 * ═══════════════════════════════════════════════════════════════════════
 * BLOG DATA LAYER
 * Loads all bilingual article JSON files, exposes typed helpers.
 * ═══════════════════════════════════════════════════════════════════════
 */

import articles1 from "@/content/blog-articles.json";
import articles2 from "@/content/blog-articles-brakes.json";
import articles3 from "@/content/blog-articles-parts-oil.json";
import articles4 from "@/content/blog-articles-maintenance-fuel.json";
import articles5 from "@/content/blog-articles-engine-oil.json";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface BlogArticle {
  title_en: string;
  title_ar: string;
  slug: string;
  meta_title_en: string;
  meta_title_ar: string;
  meta_description_en: string;
  meta_description_ar: string;
  content_en: string;
  content_ar: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA — aggregate all JSON sources into one canonical list
// ─────────────────────────────────────────────────────────────────────────────

const ALL_ARTICLES: BlogArticle[] = [
  ...(articles1 as BlogArticle[]),
  ...(articles2 as BlogArticle[]),
  ...(articles3 as BlogArticle[]),
  ...(articles4 as BlogArticle[]),
  ...(articles5 as BlogArticle[]),
];

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getAllArticles(): BlogArticle[] {
  return ALL_ARTICLES;
}

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return ALL_ARTICLES.find((a) => a.slug === slug);
}

/**
 * Returns up to `count` articles that are NOT the current slug.
 * Simple strategy: take the next/prev articles for contextual relevance.
 */
export function getRelatedArticles(
  currentSlug: string,
  count = 3,
): BlogArticle[] {
  return ALL_ARTICLES.filter((a) => a.slug !== currentSlug).slice(0, count);
}

// ─────────────────────────────────────────────────────────────────────────────
// READING TIME
// Average: ~200 wpm English, ~180 wpm Arabic
// ─────────────────────────────────────────────────────────────────────────────

export function calculateReadingTime(content: string, isAr = false): number {
  const words = content.trim().split(/\s+/).length;
  const wpm = isAr ? 180 : 200;
  return Math.max(1, Math.round(words / wpm));
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ EXTRACTOR
// Splits content into main body + structured FAQ items.
// Both EN ("## Frequently Asked Questions") and AR ("## أسئلة شائعة") headings
// are detected.  Q&A pairs are identified by **bold question** patterns.
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_HEADINGS_EN = "Frequently Asked Questions";
const FAQ_HEADINGS_AR = "أسئلة شائعة";

export function extractFAQ(content: string): {
  mainContent: string;
  faqs: FAQItem[];
} {
  // Find the FAQ heading (try both languages)
  const enIdx = content.indexOf(`## ${FAQ_HEADINGS_EN}`);
  const arIdx = content.indexOf(`## ${FAQ_HEADINGS_AR}`);

  const faqStart =
    enIdx !== -1 && arIdx !== -1
      ? Math.min(enIdx, arIdx)
      : enIdx !== -1
        ? enIdx
        : arIdx;

  if (faqStart === -1) {
    return { mainContent: content, faqs: [] };
  }

  const headingUsed = enIdx === faqStart ? FAQ_HEADINGS_EN : FAQ_HEADINGS_AR;
  const mainContent = content.slice(0, faqStart).trim();
  const faqSection = content
    .slice(faqStart + `## ${headingUsed}`.length)
    .trim();

  // Parse Q&A pairs: **Question?\n**\nAnswer text\n\n**Next?**\nAnswer...
  const pairs = faqSection.split(/\n\n(?=\*\*)/);
  const faqs: FAQItem[] = [];

  for (const pair of pairs) {
    const match = pair.match(/^\*\*(.+?)\*\*\n([\s\S]+)$/);
    if (match) {
      faqs.push({
        question: match[1].trim(),
        answer: match[2].trim(),
      });
    }
  }

  return { mainContent, faqs };
}
