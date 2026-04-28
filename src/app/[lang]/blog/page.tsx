import type { Metadata } from "next";
import Link from "next/link";
import { generateSeoMeta } from "@/utils/seo";
import NewsletterForm from "@/components/blog/NewsletterForm";

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

const FEATURED_POST = {
  slug: "top-5-maintenance-tips-egypt",
  categoryAr: "الصيانة",
  categoryEn: "Maintenance",
  titleAr: "أهم ٥ نصائح لصيانة سيارتك في الطقس الحار بمصر",
  titleEn: "Top 5 Car Maintenance Tips for Egypt's Hot Weather",
  excerptAr:
    "الحرارة الشديدة تؤثر بشكل مباشر على أداء سيارتك. اكتشف كيف تحافظ على مبرد المياه، البطارية، والإطارات خلال فصل الصيف.",
  excerptEn:
    "Extreme heat directly impacts your car's performance. Learn how to maintain your coolant, battery, and tires through Egypt's summer months.",
  date: "2025-06-01",
  readMinAr: "٥ دقائق",
  readMinEn: "5 min read",
  color: "from-orange-600 to-red-700",
};

const POSTS = [
  {
    slug: "how-to-choose-brake-pads",
    categoryAr: "قطع الغيار",
    categoryEn: "Spare Parts",
    titleAr: "كيف تختار تيل الفرامل المناسب لسيارتك",
    titleEn: "How to Choose the Right Brake Pads for Your Car",
    excerptAr: "دليل شامل لاختيار تيل الفرامل حسب نوع سيارتك وأسلوب قيادتك.",
    excerptEn:
      "A complete guide to selecting brake pads based on your car model and driving style.",
    date: "2025-05-22",
    readMinAr: "٤ دقائق",
    readMinEn: "4 min read",
    icon: "tire_repair",
    color: "bg-blue-500",
  },
  {
    slug: "engine-oil-change-guide",
    categoryAr: "الصيانة",
    categoryEn: "Maintenance",
    titleAr: "متى تغير زيت المحرك؟ — الدليل الكامل",
    titleEn: "When to Change Your Engine Oil — The Complete Guide",
    excerptAr:
      "تعرف على علامات الحاجة لتغيير الزيت وكيف تختار النوع الصحيح لموديل سيارتك.",
    excerptEn:
      "Learn the signs you need an oil change and how to pick the right grade for your car.",
    date: "2025-05-15",
    readMinAr: "٦ دقائق",
    readMinEn: "6 min read",
    icon: "water_drop",
    color: "bg-amber-500",
  },
  {
    slug: "oem-vs-aftermarket-parts",
    categoryAr: "قطع الغيار",
    categoryEn: "Spare Parts",
    titleAr: "قطع OEM مقابل القطع البديلة — أيهما تختار؟",
    titleEn: "OEM vs Aftermarket Parts — Which Should You Choose?",
    excerptAr:
      "مقارنة شاملة بين قطع المصنع الأصلية وقطع الشركات البديلة من ناحية السعر والجودة والضمان.",
    excerptEn:
      "A full comparison of OEM vs aftermarket parts in terms of price, quality, and warranty.",
    date: "2025-05-08",
    readMinAr: "٧ دقائق",
    readMinEn: "7 min read",
    icon: "build",
    color: "bg-emerald-500",
  },
  {
    slug: "ac-refrigerant-egypt-summer",
    categoryAr: "تكييف",
    categoryEn: "Air Conditioning",
    titleAr: "شحن فريون التكييف — كل ما تحتاج معرفته قبل الصيف",
    titleEn: "AC Refrigerant Recharge — Everything You Need Before Summer",
    excerptAr:
      "أعراض نقص الفريون وكيف تجهز تكييف سيارتك قبل حرارة الصيف المصري.",
    excerptEn:
      "Symptoms of low refrigerant and how to prep your AC before Egypt's brutal summer heat.",
    date: "2025-04-28",
    readMinAr: "٥ دقائق",
    readMinEn: "5 min read",
    icon: "ac_unit",
    color: "bg-cyan-500",
  },
  {
    slug: "warshety-vendor-success-story",
    categoryAr: "قصص نجاح",
    categoryEn: "Success Stories",
    titleAr: "قصة نجاح: كيف زاد محمد مبيعاته ٣ أضعاف مع ورشتي",
    titleEn: "Success Story: How Mohamed Tripled Sales with Warshety",
    excerptAr:
      "بائع قطع غيار من الإسكندرية يحكي كيف أحدثت ورشتي تحولًا في مشروعه.",
    excerptEn:
      "An Alexandria spare parts dealer shares how Warshety transformed his business.",
    date: "2025-04-18",
    readMinAr: "٤ دقائق",
    readMinEn: "4 min read",
    icon: "store",
    color: "bg-purple-500",
  },
  {
    slug: "tire-pressure-guide-egypt",
    categoryAr: "السلامة",
    categoryEn: "Safety",
    titleAr: "ضغط الإطارات الصحيح — أهميته وكيفية فحصه",
    titleEn: "Correct Tire Pressure — Why It Matters and How to Check",
    excerptAr:
      "الضغط الصحيح للإطارات يحسن الأمان ويقلل استهلاك الوقود ويطيل عمر الإطار.",
    excerptEn:
      "Correct tire pressure improves safety, reduces fuel consumption, and extends tire life.",
    date: "2025-04-10",
    readMinAr: "٣ دقائق",
    readMinEn: "3 min read",
    icon: "tire_repair",
    color: "bg-rose-500",
  },
];

const CATEGORIES = [
  { slugKey: "all", labelAr: "الكل", labelEn: "All" },
  { slugKey: "maintenance", labelAr: "الصيانة", labelEn: "Maintenance" },
  { slugKey: "parts", labelAr: "قطع الغيار", labelEn: "Spare Parts" },
  { slugKey: "safety", labelAr: "السلامة", labelEn: "Safety" },
  { slugKey: "success", labelAr: "قصص نجاح", labelEn: "Success Stories" },
];

function formatDate(dateStr: string, isAr: boolean) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPage({ params }: Props) {
  const { lang } = await params;
  const isAr = lang === "ar";

  return (
    <div
      className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]"
      dir={isAr ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          {/* Breadcrumb */}
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
          href={`/${lang}/blog/${FEATURED_POST.slug}`}
          className="group block rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-2xl transition-shadow"
        >
          {/* Banner */}
          <div
            className={`bg-gradient-to-r ${FEATURED_POST.color} p-10 md:p-14 text-white relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />
            <div className="relative">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {isAr ? FEATURED_POST.categoryAr : FEATURED_POST.categoryEn}
              </span>
              <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">
                {isAr ? FEATURED_POST.titleAr : FEATURED_POST.titleEn}
              </h2>
              <p className="text-white/80 text-base leading-relaxed max-w-2xl">
                {isAr ? FEATURED_POST.excerptAr : FEATURED_POST.excerptEn}
              </p>
            </div>
          </div>
          {/* Footer */}
          <div className="px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  calendar_today
                </span>
                {formatDate(FEATURED_POST.date, isAr)}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  schedule
                </span>
                {isAr ? FEATURED_POST.readMinAr : FEATURED_POST.readMinEn}
              </span>
            </div>
            <span className="text-[#FF4B19] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              {isAr ? "اقرأ المقال" : "Read Article"}
              <span className="material-symbols-outlined text-base">
                {isAr ? "arrow_back" : "arrow_forward"}
              </span>
            </span>
          </div>
        </Link>
      </section>

      {/* ── Category pills ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slugKey}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-colors border ${
                cat.slugKey === "all"
                  ? "bg-[#FF4B19] text-white border-[#FF4B19]"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#FF4B19] hover:text-[#FF4B19]"
              }`}
            >
              {isAr ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>
      </section>

      {/* ── Posts grid ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-8 pb-20">
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
          {isAr ? "أحدث المقالات" : "Latest Articles"}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/${lang}/blog/${post.slug}`}
              className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-shadow"
            >
              {/* Icon banner */}
              <div
                className={`${post.color} h-36 flex items-center justify-center relative overflow-hidden`}
              >
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white to-transparent" />
                <span className="material-symbols-outlined text-white text-6xl opacity-90 drop-shadow-lg">
                  {post.icon}
                </span>
              </div>
              {/* Content */}
              <div className="p-5">
                <span className="inline-block text-xs font-semibold text-[#FF4B19] bg-[#FF4B19]/10 px-2.5 py-0.5 rounded-full mb-3">
                  {isAr ? post.categoryAr : post.categoryEn}
                </span>
                <h3 className="font-black text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-[#FF4B19] transition-colors line-clamp-2">
                  {isAr ? post.titleAr : post.titleEn}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                  {isAr ? post.excerptAr : post.excerptEn}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>{formatDate(post.date, isAr)}</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">
                      schedule
                    </span>
                    {isAr ? post.readMinAr : post.readMinEn}
                  </span>
                </div>
              </div>
            </Link>
          ))}
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
