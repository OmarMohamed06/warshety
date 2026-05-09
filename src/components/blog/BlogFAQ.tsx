"use client";

import { useState } from "react";
import type { FAQItem } from "@/lib/blog";

interface Props {
  faqs: FAQItem[];
  isAr: boolean;
}

export default function BlogFAQ({ faqs, isAr }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (faqs.length === 0) return null;

  return (
    <section className="mt-12 mb-4" aria-label={isAr ? "أسئلة شائعة" : "FAQ"}>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">
        {isAr ? "أسئلة شائعة" : "Frequently Asked Questions"}
      </h2>

      <div className="space-y-2">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-start justify-between gap-4 px-5 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-start transition-colors"
              >
                <span className="font-semibold text-slate-900 dark:text-white text-[0.95rem] leading-snug">
                  {faq.question}
                </span>
                <span
                  className={`flex-shrink-0 mt-0.5 text-[#FF4B19] text-xl font-light transition-transform duration-200 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                  aria-hidden
                >
                  +
                </span>
              </button>

              {isOpen && (
                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[0.9rem] leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
