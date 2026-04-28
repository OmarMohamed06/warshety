import type { Metadata } from "next";
import Link from "next/link";
import { generateSeoMeta } from "@/utils/seo";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  return generateSeoMeta({
    title: isAr ? "الشروط والأحكام — ورشتي" : "Terms & Conditions — Warshety",
    description: isAr
      ? "اقرأ الشروط والأحكام الخاصة باستخدام منصة ورشتي لقطع الغيار والخدمات في مصر."
      : "Read the Terms and Conditions for using the Warshety spare parts and services platform in Egypt.",
    path: "/legal/terms",
    locale: isAr ? "ar" : "en",
  });
}

const SECTIONS = [
  {
    numAr: "١",
    numEn: "1",
    titleAr: "مقدمة",
    titleEn: "Introduction",
    bodyAr:
      "مرحبًا بك في ورشتي. بالوصول إلى منصتنا أو استخدامها، فإنك توافق على هذه الشروط والأحكام. إذا كنت لا توافق عليها، يُرجى عدم استخدام الخدمة.",
    bodyEn:
      "Welcome to Warshety. By accessing or using our platform, you agree to these Terms and Conditions. If you do not agree, please do not use the service.",
  },
  {
    numAr: "٢",
    numEn: "2",
    titleAr: "طبيعة الخدمة",
    titleEn: "Nature of Service",
    bodyAr:
      "ورشتي هي منصة تربط المستخدمين بمزودي خدمات السيارات من أطراف ثالثة وتسهّل عمليات الحجز والخدمات ذات الصلة. نحن لا نقدم خدمات الإصلاح بشكل مباشر.",
    bodyEn:
      "Warshety is a platform that connects users with third-party car service providers and facilitates booking and related services. We do not directly provide repair services.",
  },
  {
    numAr: "٣",
    numEn: "3",
    titleAr: "مسؤوليات المستخدم",
    titleEn: "User Responsibilities",
    bodyAr:
      "يتعهد المستخدم بما يلي: تقديم معلومات دقيقة عند الحجز، والالتزام بالمواعيد المحددة، وسداد الرسوم المتفق عليها مقابل الخدمات والقطع، واستخدام المنصة بصورة قانونية.",
    bodyEn:
      "Users must: provide accurate information when booking, respect scheduled appointments, pay agreed fees for services and parts, and use the platform lawfully.",
  },
  {
    numAr: "٤",
    numEn: "4",
    titleAr: "مسؤولية البائع",
    titleEn: "Vendor Responsibility",
    bodyAr:
      "مزودو الخدمة (البائعون) هم أطراف ثالثة مستقلة ويتحملون المسؤولية الكاملة عن: جودة الخدمة، وتسعير الخدمات والقطع، والامتثال للقوانين المحلية.",
    bodyEn:
      "Service providers (vendors) are independent third parties and are solely responsible for: quality of service, pricing of services and parts, and compliance with local laws.",
  },
  {
    numAr: "٥",
    numEn: "5",
    titleAr: "الحجز والمدفوعات",
    titleEn: "Booking & Payments",
    bodyAr:
      "قد يُفرض رسم خدمة على كل حجز. قد تختلف أسعار الخدمات والقطع من بائع لآخر. يمكن سداد المدفوعات إلكترونيًا أو نقدًا حسب التوافر. تخضع جميع الحجوزات المؤكدة لتوافر البائع.",
    bodyEn:
      "A service fee may be charged per booking. Prices for services and parts may vary depending on vendor. Payments may be made online or in cash depending on availability. All confirmed bookings are subject to vendor availability.",
  },
  {
    numAr: "٦",
    numEn: "6",
    titleAr: "الإلغاءات والمبالغ المستردة",
    titleEn: "Cancellations & Refunds",
    bodyAr:
      "يحق للمستخدمين إلغاء الحجوزات وفقًا للشروط المعمول بها. تُعالَج المبالغ المستردة (إن وُجدت) بناءً على الحالة وسياسات المنصة. قد يؤدي إساءة استخدام حق الإلغاء إلى تقييد الحساب.",
    bodyEn:
      "Users may cancel bookings subject to applicable conditions. Refunds (if applicable) are processed based on the situation and platform policies. Abuse of cancellation may result in account restriction.",
  },
  {
    numAr: "٧",
    numEn: "7",
    titleAr: "إخلاء مسؤولية الضمان",
    titleEn: "Warranty Disclaimer",
    bodyAr:
      "لا تضمن ورشتي جودة الخدمات المقدمة من البائعين. غير أننا قد نقدم دعمًا محدودًا في حل النزاعات.",
    bodyEn:
      "We do not guarantee the quality of services provided by vendors. However, we may offer limited support in resolving disputes.",
  },
  {
    numAr: "٨",
    numEn: "8",
    titleAr: "تحديد المسؤولية",
    titleEn: "Limitation of Liability",
    bodyAr:
      "لا تتحمل ورشتي المسؤولية عن: أي أضرار تسببها مزودو الخدمة، أو التأخيرات والأخطاء وإخفاقات الخدمة، أو الخسائر الناجمة عن استخدام خدمات الأطراف الثالثة.",
    bodyEn:
      "Warshety is not liable for: any damage caused by service providers, delays, errors, or service failures, or losses resulting from use of third-party services.",
  },
  {
    numAr: "٩",
    numEn: "9",
    titleAr: "تعليق الحساب",
    titleEn: "Account Suspension",
    bodyAr:
      "نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط، أو تسيء استخدام المنصة، أو تمارس سلوكًا احتياليًا.",
    bodyEn:
      "We reserve the right to suspend or terminate accounts that violate these terms, abuse the platform, or engage in fraudulent behavior.",
  },
  {
    numAr: "١٠",
    numEn: "10",
    titleAr: "الملكية الفكرية",
    titleEn: "Intellectual Property",
    bodyAr:
      "جميع المحتويات والعلامات التجارية والبرامج المتعلقة بورشتي مملوكة لنا ولا يجوز نسخها أو استخدامها دون إذن.",
    bodyEn:
      "All content, branding, and software related to Warshety are owned by us and may not be copied or used without permission.",
  },
  {
    numAr: "١١",
    numEn: "11",
    titleAr: "التغييرات على الشروط",
    titleEn: "Changes to Terms",
    bodyAr:
      "قد نقوم بتحديث هذه الشروط في أي وقت. يُعدّ الاستمرار في استخدام المنصة قبولًا للشروط المحدّثة.",
    bodyEn:
      "We may update these Terms at any time. Continued use of the platform means you accept the updated terms.",
  },
  {
    numAr: "١٢",
    numEn: "12",
    titleAr: "القانون الحاكم",
    titleEn: "Governing Law",
    bodyAr: "تخضع هذه الشروط لقوانين جمهورية مصر العربية.",
    bodyEn:
      "These Terms are governed by the laws of the Arab Republic of Egypt.",
  },
  {
    numAr: "١٣",
    numEn: "13",
    titleAr: "تواصل معنا",
    titleEn: "Contact Us",
    bodyAr: "لأي استفسارات، تواصل معنا على",
    bodyEn: "For any questions, contact us at",
    isContact: true,
  },
];

export default async function TermsPage({ params }: Props) {
  const { lang } = await params;
  const isAr = lang === "ar";

  return (
    <div
      className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]"
      dir={isAr ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* Hero */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <nav className="text-xs text-slate-400 mb-6 flex items-center gap-2">
            <Link
              href={`/${lang}`}
              className="hover:text-[#FF4B19] transition-colors"
            >
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <span>/</span>
            <span className="text-slate-300">
              {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
            </span>
          </nav>
          <span className="inline-block text-[#FF4B19] text-xs font-semibold tracking-widest uppercase mb-3">
            {isAr ? "قانوني" : "Legal"}
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-3">
            {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
          </h1>
          <p className="text-slate-400 text-sm">
            {isAr ? "آخر تحديث: أبريل ٢٠٢٦" : "Last updated: April 2026"}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-14 grid md:grid-cols-[240px_1fr] gap-12">
        {/* Sidebar TOC */}
        <aside className="hidden md:block">
          <div className="sticky top-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              {isAr ? "المحتويات" : "Contents"}
            </p>
            <ul className="space-y-2">
              {SECTIONS.map((s) => (
                <li key={s.numEn}>
                  <a
                    href={`#section-${s.numEn}`}
                    className="text-xs text-slate-500 hover:text-[#FF4B19] transition-colors flex gap-2"
                  >
                    <span className="text-[#FF4B19] font-bold">
                      {isAr ? s.numAr : s.numEn}.
                    </span>
                    {isAr ? s.titleAr : s.titleEn}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Sections */}
        <main className="space-y-8">
          {SECTIONS.map((s) => (
            <section
              key={s.numEn}
              id={`section-${s.numEn}`}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-7"
            >
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-9 h-9 rounded-xl bg-[#FF4B19]/10 text-[#FF4B19] font-black text-sm flex items-center justify-center">
                  {isAr ? s.numAr : s.numEn}
                </span>
                <div>
                  <h2 className="font-black text-slate-900 dark:text-white mb-2">
                    {isAr ? s.titleAr : s.titleEn}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isAr ? s.bodyAr : s.bodyEn}
                    {s.isContact && (
                      <>
                        {" "}
                        <a
                          href="mailto:support@warshety.com"
                          className="text-[#FF4B19] hover:underline"
                        >
                          support@warshety.com
                        </a>
                        .
                      </>
                    )}
                  </p>
                </div>
              </div>
            </section>
          ))}

          {/* Link to Privacy */}
          <div className="bg-slate-950 text-white rounded-2xl p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold mb-1">
                {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
              </p>
              <p className="text-sm text-slate-400">
                {isAr
                  ? "تعرف على كيفية جمعنا لبياناتك واستخدامها وحمايتها."
                  : "Learn how we collect, use, and protect your data."}
              </p>
            </div>
            <Link
              href={`/${lang}/legal/privacy`}
              className="shrink-0 bg-[#FF4B19] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#e04316] transition-colors"
            >
              {isAr ? "اقرأ السياسة" : "Read Policy"}
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
