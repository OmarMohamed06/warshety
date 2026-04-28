"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { globalSearch, type SearchResult } from "@/services/searchService";
import { Search, Wrench, Settings, Store, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const TYPE_LABELS: Record<
  string,
  { ar: string; en: string; icon: React.ReactNode }
> = {
  all: { ar: "الكل", en: "All", icon: <Search className="w-3.5 h-3.5" /> },
  part: {
    ar: "قطع الغيار",
    en: "Parts",
    icon: <Settings className="w-3.5 h-3.5" />,
  },
  vendor: {
    ar: "مراكز الخدمة",
    en: "Service Centers",
    icon: <Store className="w-3.5 h-3.5" />,
  },
  service: {
    ar: "الخدمات",
    en: "Services",
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
};

const TYPE_EMOJI: Record<string, string> = {
  vendor: "🏪",
  service: "🔧",
  part: "⚙️",
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale, t } = useLanguage();
  const isAr = locale === "ar";

  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [activeType, setActiveType] = useState<
    "all" | "part" | "vendor" | "service"
  >("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = useCallback(async (q: string, type: typeof activeType) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await globalSearch(q, {
        type: type === "all" ? undefined : type,
      });
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run on mount with ?q= param
  useEffect(() => {
    if (initialQ) runSearch(initialQ, activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run when type filter changes
  useEffect(() => {
    if (query.trim()) runSearch(query, activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.replace(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
    runSearch(query, activeType);
  }

  function navigate(href: string) {
    router.push(`/${locale}${href}`);
  }

  const filtered =
    activeType === "all"
      ? results
      : results.filter((r) => r.type === activeType);
  const counts = {
    all: results.length,
    part: results.filter((r) => r.type === "part").length,
    vendor: results.filter((r) => r.type === "vendor").length,
    service: results.filter((r) => r.type === "service").length,
  };

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      {/* Search Header */}
      <div className="border-b bg-background sticky top-16 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isAr
                  ? "ابحث عن قطع غيار، مراكز خدمة، خدمات..."
                  : "Search parts, service centers, services..."
              }
              className="pl-10 rtl:pl-3 rtl:pr-10 pr-10 rtl:pr-3 h-12 text-base bg-muted border-transparent focus-visible:ring-primary/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setHasSearched(false);
                }}
                className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Type Filter Tabs */}
          {hasSearched && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
              {(["all", "part", "vendor", "service"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                    activeType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {TYPE_LABELS[type].icon}
                  {isAr ? TYPE_LABELS[type].ar : TYPE_LABELS[type].en}
                  {counts[type] > 0 && (
                    <span
                      className={`ml-0.5 rtl:ml-0 rtl:mr-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        activeType === type
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {counts[type]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex gap-3 p-4 rounded-xl border bg-card animate-pulse"
              >
                <div className="w-14 h-14 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && filtered.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground mb-2">
              {isAr
                ? `${filtered.length} نتيجة`
                : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
              {query ? (isAr ? ` لـ "${query}"` : ` for "${query}"`) : ""}
            </p>
            {filtered.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => navigate(r.href)}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary hover:shadow-sm transition-all text-start w-full group"
              >
                {r.image ? (
                  <img
                    src={r.image}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted"
                  />
                ) : (
                  <span className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl shrink-0">
                    {TYPE_EMOJI[r.type]}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-snug truncate group-hover:text-primary transition-colors">
                    {r.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {r.subtitle}
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-1.5 text-[10px] capitalize"
                  >
                    {isAr ? TYPE_LABELS[r.type].ar : TYPE_LABELS[r.type].en}
                  </Badge>
                </div>
                <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && hasSearched && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
              🔍
            </div>
            <div>
              <p className="font-bold text-lg">
                {isAr ? "لا توجد نتائج" : "No results found"}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {isAr
                  ? `لم نجد أي نتائج لـ "${query}". جرّب كلمات مختلفة.`
                  : `We couldn't find anything for "${query}". Try different keywords.`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Link
                href={`/${locale}/parts`}
                className="text-sm text-primary font-semibold hover:underline"
              >
                {isAr ? "تصفح قطع الغيار" : "Browse Parts"}
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link
                href={`/${locale}/services`}
                className="text-sm text-primary font-semibold hover:underline"
              >
                {isAr ? "تصفح مراكز الخدمة" : "Browse Service Centers"}
              </Link>
            </div>
          </div>
        )}

        {/* Initial empty state */}
        {!loading && !hasSearched && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg">
                {isAr ? "ابحث عن أي شيء" : "Search for anything"}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {isAr
                  ? "قطع غيار، مراكز صيانة، خدمات متخصصة في مصر"
                  : "Spare parts, service centers, specialist services across Egypt"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
