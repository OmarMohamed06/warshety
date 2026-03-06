import type { Metadata } from "next";
import Link from "next/link";
import { servicePageSeo } from "@/utils/seo";

export const metadata: Metadata = servicePageSeo("Car Service", "Cairo");

const POPULAR_SERVICES = [
  {
    icon: "manage_search",
    label: "General Inspection",
    labelAr: "فحص عام",
    slug: "general-inspection",
    recommended: true,
  },
  {
    icon: "warning_amber",
    label: "Engine Diagnostic",
    labelAr: "تشخيص المحرك",
    slug: "engine-diagnostic",
  },
  {
    icon: "ac_unit",
    label: "AC Diagnostic",
    labelAr: "تشخيص تكييف",
    slug: "ac-diagnostic",
  },
  {
    icon: "minor_crash",
    label: "Brake Inspection",
    labelAr: "فحص الفرامل",
    slug: "brake-inspection",
  },
  {
    icon: "shutter_speed",
    label: "Suspension & Steering",
    labelAr: "تعليق وتوجيه",
    slug: "suspension-steering",
  },
  {
    icon: "electrical_services",
    label: "Electrical Diagnostic",
    labelAr: "تشخيص كهربائي",
    slug: "electrical-diagnostic",
  },
  {
    icon: "sync",
    label: "Transmission Check",
    labelAr: "فحص الجير",
    slug: "transmission-check",
  },
  {
    icon: "car_crash",
    label: "Accident Assessment",
    labelAr: "تقييم الحوادث",
    slug: "accident-assessment",
  },
  {
    icon: "fact_check",
    label: "Pre-Purchase Inspection",
    labelAr: "فحص قبل الشراء",
    slug: "pre-purchase-inspection",
  },
];

const SERVICE_CENTERS = [
  {
    id: "elite-auto-haus",
    name: "Elite Auto Haus",
    city: "New Cairo",
    rating: 4.9,
    reviewCount: 312,
    completedBookings: 1840,
    specializations: ["BMW", "Mercedes-Benz"],
    startingPrice: 350,
    availableToday: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDM6v9903PHEN-dgowhzASd_Obu_HzFJ7mCUcHerHw3cJX0LqY5ygDoaf_XA4Qo1iJxIe5f5QtpxPubE0Dp3VHawyEVTG-IXHrDHfwfL2ntBdJhukmXQ9RqX0F36wQ3yfaiUh9us7kWfGjRW4P12a1Lss-mFF8QbOlsIdnQw3FSHBkhwDb00j2vVhmZNS5pM5qu3WSW_Dt2VCF_wyVyy0aL03aLeGg1hoXiTgIiMiGmMxaMMOwNB6o7VHtdle-RsV5Sd32hu4eo",
  },
  {
    id: "precision-motors",
    name: "Precision Motors",
    city: "Sheikh Zayed",
    rating: 4.8,
    reviewCount: 198,
    completedBookings: 1020,
    specializations: ["Audi", "Porsche", "VW"],
    startingPrice: 450,
    availableToday: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4eLV7IKyTrK1YRud09v_2EiFwAqOndh8u_w36Suuv8yTQve9OUsdV8sgn5PkCWdSIh8K473Y4jKPEvPOHrpaDhqLKgF6cBWnZ1-0req1PvUfh5U3IS5mvhWvk2-NUWJGsp82AkqWnWF7XAgpMg0ezdNf5R7fioUuWM0xHD8r6-BGQm1QywM-QHn2heYf7jB7OJm6L8YhuyHLLFWoA9ik8nFfTPbwXOFu4f4dBq1QRTgMhJVDkfih4vV5mTG6QO3-eY_w4o8Mb",
  },
  {
    id: "alex-garage-pro",
    name: "Alex Garage Pro",
    city: "Alexandria",
    rating: 5.0,
    reviewCount: 421,
    completedBookings: 2300,
    specializations: ["All Makes"],
    startingPrice: 300,
    availableToday: false,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCjzDT9dn3i1Jm8Xmz7GDDzGvawFrddJxqQu8HddbNSWIyjhktu7LxWcFUO41ALjbNzilHMVWzMvbQ7cHm8Y7vEk9SGkq_JH91bVsEY5-i1uPJt-aGyTlIptLDAbZ-CKSBGSI8eB5iSTTC2vAirSld0Usx7JUFB1DcACbPTrKmDKZyyHF310BUsNYn4vrCuNH0wloeArJzfQ5cvIVzkzG2A_NdODapDSuYbTXdkX9S7hKAxFbfQbSg_5mYM67XU_aBXTN1ee3n-",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* Hero search */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">
          <h1 className="text-4xl font-black mb-4">Find a Service Center</h1>
          <p className="text-slate-500 mb-8">
            Book trusted workshops in Cairo, Giza, Alexandria &amp; across
            Egypt.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                placeholder="e.g. Oil change, BMW service, brake repair..."
              />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                location_on
              </span>
              <input
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30"
                placeholder="City or area"
              />
            </div>
            <button className="px-8 py-4 bg-[#FF4B19] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined">search</span>
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Popular services */}
        <div className="mb-12">
          <h2 className="text-2xl font-black mb-6">Popular Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {POPULAR_SERVICES.map((svc) => (
              <Link
                key={svc.slug}
                href={`/services?q=${svc.slug}`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19] hover:shadow-lg transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-[#FF4B19] transition-colors">
                  <span className="material-symbols-outlined text-xl group-hover:text-white transition-colors">
                    {svc.icon}
                  </span>
                </div>
                <p className="font-bold text-xs leading-tight">{svc.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Service center listings */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black">Top Rated Service Centers</h2>
            <Link
              href="/services/all"
              className="flex items-center gap-1.5 text-sm font-bold text-[#FF4B19] hover:opacity-80 transition-opacity"
            >
              View All Centers
              <span className="material-symbols-outlined text-base">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {SERVICE_CENTERS.map((sc) => (
              <div
                key={sc.id}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all"
              >
                <div
                  className="h-48 bg-cover bg-center relative"
                  style={{ backgroundImage: `url('${sc.image}')` }}
                >
                  <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <span
                      className="material-symbols-outlined text-[#FF4B19] text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    {sc.rating}
                  </div>
                  {sc.availableToday && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Available Today
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-black mb-1">{sc.name}</h3>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                    <span className="material-symbols-outlined text-base">
                      location_on
                    </span>
                    {sc.city}, Egypt
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        reviews
                      </span>
                      {sc.reviewCount} reviews
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        check_circle
                      </span>
                      {sc.completedBookings.toLocaleString()} bookings
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {sc.specializations.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded uppercase"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-end">
                    <Link
                      href={`/services/${sc.id}`}
                      className="px-5 py-2.5 rounded-xl bg-[#FF4B19] text-white text-sm font-bold hover:opacity-90 transition-all"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
