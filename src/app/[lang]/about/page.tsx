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
    title: isAr
      ? "عن ورشتي — أكبر سوق سيارات في مصر"
      : "About Warshety — Egypt's #1 Automotive Marketplace",
    description: isAr
      ? "ورشتي هي منصة مصرية رائدة لقطع غيار السيارات وخدمات الميكانيكا. نربط أصحاب السيارات بأفضل البائعين والكراجات المعتمدة في مصر."
      : "Warshety is Egypt's leading automotive marketplace connecting car owners with verified spare parts vendors and certified service centers.",
    path: "/about",
    locale: isAr ? "ar" : "en",
  });
}

const STATS = [
  {
    valueAr: "+٥٠,٠٠٠",
    valueEn: "50,000+",
    labelAr: "قطعة غيار",
    labelEn: "Spare Parts",
  },
  {
    valueAr: "+١,٢٠٠",
    valueEn: "1,200+",
    labelAr: "بائع موثوق",
    labelEn: "Verified Vendors",
  },
  { valueAr: "+٢٧", valueEn: "27", labelAr: "محافظة", labelEn: "Governorates" },
  {
    valueAr: "+١٠٠,٠٠٠",
    valueEn: "100,000+",
    labelAr: "عميل سعيد",
    labelEn: "Happy Customers",
  },
];

const TEAM = [
  {
    nameAr: "أحمد الشريف",
    nameEn: "Ahmed El-Sherif",
    roleAr: "الرئيس التنفيذي والمؤسس",
    roleEn: "CEO & Co-founder",
    avatar: "AE",
    color: "bg-orange-500",
  },
  {
    nameAr: "سارة محمد",
    nameEn: "Sara Mohamed",
    roleAr: "مدير المنتج",
    roleEn: "Head of Product",
    avatar: "SM",
    color: "bg-blue-500",
  },
  {
    nameAr: "كريم حسن",
    nameEn: "Karim Hassan",
    roleAr: "مدير التقنية",
    roleEn: "CTO",
    avatar: "KH",
    color: "bg-emerald-500",
  },
  {
    nameAr: "نور إبراهيم",
    nameEn: "Nour Ibrahim",
    roleAr: "مدير التسويق",
    roleEn: "Head of Marketing",
    avatar: "NI",
    color: "bg-purple-500",
  },
];

const VALUES = [
  {
    icon: "verified",
    titleAr: "الجودة والأصالة",
    titleEn: "Quality & Authenticity",
    descAr:
      "نتحقق من كل بائع وكل قطعة لضمان منتجات أصلية ومعتمدة تصل إليك بأمان.",
    descEn:
      "Every vendor and product is verified to ensure you receive only genuine, certified parts.",
  },
  {
    icon: "handshake",
    titleAr: "الثقة والشفافية",
    titleEn: "Trust & Transparency",
    descAr: "أسعار واضحة، تقييمات حقيقية، وضمان استرداد — لأن ثقتك تهمنا.",
    descEn:
      "Clear pricing, real reviews, and a money-back guarantee — because your trust matters.",
  },
  {
    icon: "local_shipping",
    titleAr: "التوصيل السريع",
    titleEn: "Fast Delivery",
    descAr: "شبكة لوجستية تغطي جميع محافظات مصر من القاهرة إلى أسوان.",
    descEn: "A logistics network covering all of Egypt — from Cairo to Aswan.",
  },
  {
    icon: "support_agent",
    titleAr: "الدعم المتواصل",
    titleEn: "Always-On Support",
    descAr: "فريق دعم متخصص في السيارات على أهبة الاستعداد للإجابة على أسئلتك.",
    descEn:
      "A dedicated automotive support team ready to answer your questions.",
  },
];

export default async function AboutPage({ params }: Props) {
  const { lang } = await params;
  const isAr = lang === "ar";

  return (
    <div
      className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]"
      dir={isAr ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF4B19]/20 via-slate-950 to-slate-900 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          {/* Breadcrumb */}
          <nav className="text-xs text-slate-400 mb-8 flex items-center gap-2">
            <Link
              href={`/${lang}`}
              className="hover:text-[#FF4B19] transition-colors"
            >
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <span>/</span>
            <span className="text-slate-300">
              {isAr ? "عن ورشتي" : "About Us"}
            </span>
          </nav>

          <div className="max-w-3xl">
            <span className="inline-block text-[#FF4B19] text-sm font-semibold tracking-widest uppercase mb-4">
              {isAr ? "قصتنا" : "Our Story"}
            </span>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
              {isAr ? (
                <>
                  نبني مستقبل
                  <br />
                  <span className="text-[#FF4B19]">السيارات في مصر</span>
                </>
              ) : (
                <>
                  Building the Future of
                  <br />
                  <span className="text-[#FF4B19]">Automotive in Egypt</span>
                </>
              )}
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
              {isAr
                ? "بدأت ورشتي برؤية بسيطة: جعل إصلاح السيارات وصيانتها أسهل وأكثر شفافية لكل مصري. اليوم نحن أكبر سوق إلكتروني للسيارات في مصر."
                : "Warshety started with a simple vision: make car repair and maintenance easier and more transparent for every Egyptian. Today we're Egypt's largest automotive marketplace."}
            </p>
          </div>
        </div>

        {/* Decorative orange bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF4B19] via-orange-400 to-[#FF4B19]" />
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.labelEn} className="text-center">
                <p className="text-4xl font-black text-[#FF4B19] mb-1">
                  {isAr ? stat.valueAr : stat.valueEn}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {isAr ? stat.labelAr : stat.labelEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-block text-[#FF4B19] text-xs font-semibold tracking-widest uppercase mb-3">
              {isAr ? "مهمتنا" : "Our Mission"}
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-slate-900 dark:text-white leading-tight">
              {isAr
                ? "نربط أصحاب السيارات بأفضل الخدمات"
                : "Connecting Car Owners with the Best Services"}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {isAr
                ? "في مصر، إصلاح السيارة كان دائمًا أمرًا مرهقًا — أسعار غير واضحة، قطع مزيفة، وصعوبة في إيجاد كراج موثوق. ورشتي ولدت لتغيير هذا الواقع."
                : "In Egypt, car repair has always been stressful — unclear prices, counterfeit parts, difficulty finding a trusted workshop. Warshety was born to change that reality."}
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
              {isAr
                ? "نوفر منصة شفافة تجمع أصحاب السيارات ببائعين موثوقين وكراجات معتمدة، مع ضمان الجودة والتوصيل لجميع محافظات مصر."
                : "We provide a transparent platform connecting car owners with verified vendors and certified workshops, guaranteeing quality and delivery to all Egyptian governorates."}
            </p>
            <Link
              href={`/${lang}/parts`}
              className="inline-flex items-center gap-2 bg-[#FF4B19] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#e04316] transition-colors"
            >
              {isAr ? "تسوق الآن" : "Start Shopping"}
              <span className="material-symbols-outlined text-base">
                {isAr ? "arrow_back" : "arrow_forward"}
              </span>
            </Link>
          </div>

          {/* Visual card */}
          <div className="relative">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#FF4B19] flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-lg">
                    directions_car
                  </span>
                </div>
                <div>
                  <p className="font-bold">
                    {isAr ? "ورشتي مصر" : "Warshety Egypt"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isAr ? "منذ ٢٠٢٢" : "Since 2022"}
                  </p>
                </div>
              </div>
              {[
                {
                  icon: "check_circle",
                  textAr: "قطع غيار أصلية ومعتمدة",
                  textEn: "Genuine & certified parts",
                },
                {
                  icon: "check_circle",
                  textAr: "بائعون خضعوا لتحقق صارم",
                  textEn: "Strictly verified vendors",
                },
                {
                  icon: "check_circle",
                  textAr: "توصيل لجميع المحافظات",
                  textEn: "Delivery to all governorates",
                },
                {
                  icon: "check_circle",
                  textAr: "دعم متخصص في السيارات",
                  textEn: "Automotive specialist support",
                },
                {
                  icon: "check_circle",
                  textAr: "ضمان استرداد الأموال",
                  textEn: "Money-back guarantee",
                },
              ].map((item) => (
                <div
                  key={item.textEn}
                  className="flex items-center gap-3 mb-3 last:mb-0"
                >
                  <span className="material-symbols-outlined text-[#FF4B19] text-base">
                    {item.icon}
                  </span>
                  <span className="text-sm text-slate-300">
                    {isAr ? item.textAr : item.textEn}
                  </span>
                </div>
              ))}
            </div>
            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-[#FF4B19] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              {isAr ? "٤.٩ ⭐ تقييم" : "4.9 ⭐ Rated"}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <span className="inline-block text-[#FF4B19] text-xs font-semibold tracking-widest uppercase mb-3">
              {isAr ? "قيمنا" : "Our Values"}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              {isAr ? "ما الذي يميزنا" : "What Sets Us Apart"}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {VALUES.map((v) => (
              <div
                key={v.titleEn}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#f6f6f8] dark:bg-slate-800 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FF4B19]/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#FF4B19] text-2xl">
                    {v.icon}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                  {isAr ? v.titleAr : v.titleEn}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr ? v.descAr : v.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="inline-block text-[#FF4B19] text-xs font-semibold tracking-widest uppercase mb-3">
            {isAr ? "الفريق" : "The Team"}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            {isAr ? "الأشخاص وراء ورشتي" : "The People Behind Warshety"}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM.map((member) => (
            <div
              key={member.nameEn}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 text-center hover:shadow-md transition-shadow"
            >
              <div
                className={`w-16 h-16 rounded-full ${member.color} flex items-center justify-center mx-auto mb-4 text-white font-black text-xl`}
              >
                {member.avatar}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {isAr ? member.nameAr : member.nameEn}
              </h3>
              <p className="text-sm text-[#FF4B19] font-medium mt-1">
                {isAr ? member.roleAr : member.roleEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            {isAr ? "انضم إلى مجتمع ورشتي" : "Join the Warshety Community"}
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            {isAr
              ? "سواء كنت صاحب سيارة أو بائع قطع أو كراج — ورشتي مكانك."
              : "Whether you're a car owner, parts vendor, or workshop — Warshety is your home."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${lang}/parts`}
              className="bg-[#FF4B19] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#e04316] transition-colors"
            >
              {isAr ? "تسوق قطع الغيار" : "Shop Car Parts"}
            </Link>
            <Link
              href={`/${lang}/vendor/apply`}
              className="bg-white/10 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20"
            >
              {isAr ? "انضم كبائع" : "Become a Vendor"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
