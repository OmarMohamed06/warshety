import Link from "next/link";

interface Props {
  isAr: boolean;
  lang: string;
}

export default function BlogCTA({ isAr, lang }: Props) {
  return (
    <section
      className="my-14 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-xl"
      aria-label={
        isAr ? "احجز خدمة أو ابحث عن قطع غيار" : "Book a service or find parts"
      }
    >
      <div className="px-8 py-10 md:px-12 md:py-12 flex flex-col md:flex-row md:items-center gap-8">
        {/* Text */}
        <div className="flex-1">
          <span className="inline-block text-[#FF4B19] text-xs font-semibold tracking-widest uppercase mb-3">
            {isAr ? "ورشتي" : "Warshety"}
          </span>
          <h3 className="text-2xl md:text-3xl font-black leading-tight mb-3">
            {isAr ? "مستعد تصلح عربيتك؟" : "Ready to fix your car?"}
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            {isAr
              ? "ورشتي بتوصلك بأقرب مراكز خدمة موثوقة وتوصلك قطع الغيار الأصلية على بيتك في مصر."
              : "Warshety connects you with trusted service centers and delivers genuine parts to your door across Egypt."}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <Link
            href={`/${lang}/services`}
            className="inline-flex items-center justify-center gap-2 bg-[#FF4B19] hover:bg-[#e04316] text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-orange-900/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 flex-shrink-0"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                clipRule="evenodd"
              />
            </svg>
            {isAr ? "احجز خدمة الآن" : "Book a Service"}
          </Link>
        </div>
      </div>
    </section>
  );
}
