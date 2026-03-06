import type { Metadata } from "next";
import BookingTracker from "@/components/tracking/BookingTracker";

export const metadata: Metadata = {
  title: "Track Your Service — Garage Egypt",
  robots: { index: false },
};

export default async function TrackBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <a
            href="/bookings"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#FF4B19] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            My Bookings
          </a>
          <h1 className="text-2xl font-black mt-3">Live Service Tracking</h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time updates on your vehicle&apos;s service status.
          </p>
        </div>
        <BookingTracker bookingId={id} />
      </div>
    </div>
  );
}
