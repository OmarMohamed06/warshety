import type { Metadata } from "next";
import BookingTracker from "@/components/tracking/BookingTracker";
import en from "@/../messages/en.json";
import ar from "@/../messages/ar.json";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const m = lang === "ar" ? ar : en;
  return {
    title: m.tracking.pageTitle,
    robots: { index: false },
  };
}

export default async function TrackBookingPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const m = lang === "ar" ? ar : en;
  const isRTL = lang === "ar";

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8" dir={isRTL ? "rtl" : "ltr"}>
          <a
            href={`/${lang}/bookings`}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#FF4B19] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isRTL ? "arrow_forward" : "arrow_back"}
            </span>
            {m.tracking.backToBookings}
          </a>
          <h1 className="text-2xl font-black mt-3">{m.tracking.heading}</h1>
          <p className="text-slate-500 text-sm mt-1">{m.tracking.subtitle}</p>
        </div>
        <BookingTracker bookingId={id} />
      </div>
    </div>
  );
}
