import { APP_CONFIG } from "@/config/app-download";
import { AppStoreBadges } from "./AppStoreBadges";

const WEB_FEATURES = [
  "Browse service centers",
  "Book appointments",
  "Manage your account",
  "View booking history",
];

const APP_FEATURES = [
  "Everything on the website",
  "Live booking tracking",
  "Push notifications",
  "Rewards & Loyalty program",
  "My Garage",
  "Exclusive app promotions",
  "Faster booking (2 taps)",
  "Offline booking history",
  "Face ID / Fingerprint login",
  "Better mobile experience",
];

const WEB_FEATURES_AR = [
  "تصفح مراكز الخدمة",
  "حجز المواعيد",
  "إدارة حسابك",
  "عرض سجل الحجوزات",
];

const APP_FEATURES_AR = [
  "كل ما في الموقع",
  "تتبع الحجز مباشرة",
  "إشعارات فورية",
  "برنامج المكافآت والولاء",
  "كراجي",
  "عروض حصرية للتطبيق",
  "حجز أسرع (نقرتان)",
  "سجل حجوزات بدون إنترنت",
  "تسجيل دخول ببصمة / Face ID",
  "تجربة موبايل أفضل",
];

interface Props {
  locale?: "en" | "ar";
}

export function AppFeatureComparison({ locale = "en" }: Props) {
  if (!APP_CONFIG.enabled || !APP_CONFIG.features.featureComparison)
    return null;
  const isAr = locale === "ar";

  const webFeats = isAr ? WEB_FEATURES_AR : WEB_FEATURES;
  const appFeats = isAr ? APP_FEATURES_AR : APP_FEATURES;

  return (
    <section
      className="py-20 bg-white dark:bg-slate-950"
      dir={isAr ? "rtl" : "ltr"}
      aria-label={isAr ? "مقارنة الموقع والتطبيق" : "Website vs App comparison"}
    >
      <div className="max-w-5xl mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-[#FF4B19] text-sm font-bold uppercase tracking-widest mb-3">
            {isAr ? "لماذا تستخدم التطبيق؟" : "Why use the mobile app?"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-black">
            {isAr
              ? "التطبيق مقابل الموقع الإلكتروني"
              : "Mobile App vs. Website"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto text-sm">
            {isAr
              ? "الموقع رائع، لكن التطبيق يعطيك تجربة أفضل وأسرع وأكثر قدرات."
              : "The website is great, but the app gives you a faster, smarter, and more powerful experience."}
          </p>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Website column */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-slate-500"
                  style={{ fontSize: 20 }}
                >
                  language
                </span>
              </div>
              <h3 className="font-black text-lg">
                {isAr ? "الموقع الإلكتروني" : "Website"}
              </h3>
            </div>
            <ul className="space-y-3">
              {webFeats.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span
                    className="material-symbols-outlined text-green-500 shrink-0"
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* App column */}
          <div className="bg-gradient-to-br from-slate-900 to-[#1a0800] rounded-3xl p-6 border border-[#FF4B19]/20 relative overflow-hidden shadow-2xl">
            {/* Popular badge */}
            <div className="absolute top-4 end-4 bg-[#FF4B19] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              {isAr ? "الأفضل" : "Best"}
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-[#FF4B19] flex items-center justify-center shadow-lg shadow-[#FF4B19]/30">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontSize: 20 }}
                >
                  phone_iphone
                </span>
              </div>
              <h3 className="font-black text-lg text-white">
                {isAr ? "تطبيق ورشتي" : "Warshety App"}
              </h3>
            </div>
            <ul className="space-y-3">
              {appFeats.map((f, i) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm text-white/90"
                >
                  <span
                    className="material-symbols-outlined shrink-0"
                    style={{
                      fontSize: 16,
                      fontVariationSettings: "'FILL' 1",
                      color: i < 4 ? "#4ade80" : "#FF4B19",
                    }}
                  >
                    {i < 4 ? "check_circle" : "stars"}
                  </span>
                  <span className={i >= 4 ? "font-semibold text-white" : ""}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <AppStoreBadges size="sm" source="comparison" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
