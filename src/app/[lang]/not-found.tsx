"use client";

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useLanguage } from "@/context/LanguageContext";

/** 404 for anything under /[lang]/ — plain language, with a way forward. */
export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#f6f6f8] px-4 text-center dark:bg-[#111621]">
      <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
        travel_explore
      </span>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {t("common.pageNotFound")}
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t("common.pageNotFoundDesc")}
      </p>
      <Link
        href="/"
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#FF4B19] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e63f10]"
      >
        <span className="material-symbols-outlined text-[18px]">home</span>
        {t("common.goHome")}
      </Link>
    </div>
  );
}
