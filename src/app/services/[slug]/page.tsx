import type { Metadata } from "next";
import Link from "next/link";
import { servicePageSeo } from "@/utils/seo";
import { createClient } from "@/lib/supabase/server";
import BookingSidebar from "@/components/services/BookingSidebar";
import type { DbService } from "@/types/database";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("business_name, city")
    .eq("id", slug)
    .single();
  const name =
    vendor?.business_name ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return servicePageSeo(name, vendor?.city ?? "Cairo");
}

// ── Mock fallback (dev / demo mode) ─────────────────────────────────────────
const MOCK_VENDOR = {
  id: "elite-auto-haus",
  business_name: "Elite Auto Haus",
  address: "12 Ring Road, New Cairo, Egypt",
  city: "New Cairo",
  phone: "+20 100 123 4567",
  rating: 4.9,
  total_reviews: 312,
  completed_bookings: 1840,
  cover_image_url:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDM6v9903PHEN-dgowhzASd_Obu_HzFJ7mCUcHerHw3cJX0LqY5ygDoaf_XA4Qo1iJxIe5f5QtpxPubE0Dp3VHawyEVTG-IXHrDHfwfL2ntBdJhukmXQ9RqX0F36wQ3yfaiUh9us7kWfGjRW4P12a1Lss-mFF8QbOlsIdnQw3FSHBkhwDb00j2vVhmZNS5pM5qu3WSW_Dt2VCF_wyVyy0aL03aLeGg1hoXiTgIiMiGmMxaMMOwNB6o7VHtdle-RsV5Sd32hu4eo",
  description:
    "Cairo's premier European car specialist. BMW and Mercedes-Benz certified technicians, ISO 9001 quality management, and Bosch diagnostic equipment for precision repairs.",
};

const MOCK_SERVICES: DbService[] = [
  {
    id: "svc-1",
    vendor_id: "elite-auto-haus",
    name: "General Inspection",
    description: "Full vehicle health check",
    price: 350,
    duration_minutes: 60,
    active: true,
    created_at: "",
  },
  {
    id: "svc-2",
    vendor_id: "elite-auto-haus",
    name: "Engine Diagnostic",
    description: "OBD-II scan and analysis",
    price: 500,
    duration_minutes: 45,
    active: true,
    created_at: "",
  },
  {
    id: "svc-3",
    vendor_id: "elite-auto-haus",
    name: "AC Diagnostic",
    description: "Air conditioning system check",
    price: 250,
    duration_minutes: 30,
    active: true,
    created_at: "",
  },
  {
    id: "svc-4",
    vendor_id: "elite-auto-haus",
    name: "Brake Inspection",
    description: "Brake pads, discs and fluid check",
    price: 200,
    duration_minutes: 30,
    active: true,
    created_at: "",
  },
  {
    id: "svc-5",
    vendor_id: "elite-auto-haus",
    name: "Suspension & Steering Check",
    description: null,
    price: 300,
    duration_minutes: 45,
    active: true,
    created_at: "",
  },
  {
    id: "svc-6",
    vendor_id: "elite-auto-haus",
    name: "Electrical Diagnostic",
    description: null,
    price: 450,
    duration_minutes: 60,
    active: true,
    created_at: "",
  },
  {
    id: "svc-7",
    vendor_id: "elite-auto-haus",
    name: "Transmission Check",
    description: null,
    price: 400,
    duration_minutes: 45,
    active: true,
    created_at: "",
  },
  {
    id: "svc-8",
    vendor_id: "elite-auto-haus",
    name: "Pre-Purchase Inspection",
    description: null,
    price: 600,
    duration_minutes: 90,
    active: true,
    created_at: "",
  },
];

export default async function ServiceCenterPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: vendorData }, { data: rawServices }] = await Promise.all([
    supabase
      .from("vendors")
      .select("*")
      .eq("id", slug)
      .eq("vendor_type", "service_center")
      .single(),
    supabase
      .from("services")
      .select("*")
      .eq("vendor_id", slug)
      .eq("active", true)
      .order("name"),
  ]);

  // Fall back to mock data when DB record doesn't exist (dev / demo mode)
  const vendor = vendorData ?? MOCK_VENDOR;
  const services: DbService[] =
    rawServices && rawServices.length > 0 ? rawServices : MOCK_SERVICES;

  const center = {
    id: vendor.id,
    name: vendor.business_name,
    address: vendor.address ?? "Cairo, Egypt",
    city: vendor.city ?? "Cairo",
    phone: vendor.phone ?? "N/A",
    rating: vendor.rating,
    reviewCount: vendor.total_reviews,
    completedBookings: vendor.completed_bookings,
    certifications: [] as string[],
    specializations: ["All Makes"],
    image: vendor.cover_image_url,
    description: vendor.description ?? "",
    hours: "Sat\u2013Thu: 8:00 AM \u2013 8:00 PM",
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* Hero */}
      <div
        className="h-72 bg-cover bg-center relative"
        style={
          center.image
            ? { backgroundImage: `url('${center.image}')` }
            : undefined
        }
      >
        {!center.image && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-6 left-6">
          <Link
            href="/services/all"
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Back to Centers
          </Link>
        </div>
        <div className="absolute bottom-6 left-6 text-white">
          <h1 className="text-4xl font-black mb-1">{center.name}</h1>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1">
              <span
                className="material-symbols-outlined text-[#FF4B19] text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              {center.rating.toFixed(1)} ({center.reviewCount} reviews)
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                location_on
              </span>
              {center.city}, Egypt
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
              {center.completedBookings.toLocaleString()} bookings
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-black mb-4">About</h2>
              {center.description && (
                <p className="text-slate-500 text-sm mb-5 leading-relaxed">
                  {center.description}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#FF4B19] mt-0.5">
                    location_on
                  </span>
                  <div>
                    <p className="font-semibold">Address</p>
                    <p className="text-slate-500">{center.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#FF4B19] mt-0.5">
                    schedule
                  </span>
                  <div>
                    <p className="font-semibold">Working Hours</p>
                    <p className="text-slate-500">{center.hours}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#FF4B19] mt-0.5">
                    phone
                  </span>
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="text-slate-500">{center.phone}</p>
                  </div>
                </div>
                {center.certifications.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#FF4B19] mt-0.5">
                      verified
                    </span>
                    <div>
                      <p className="font-semibold">Certifications</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {center.certifications.map((c) => (
                          <span
                            key={c}
                            className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 font-bold px-2 py-0.5 rounded"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-black mb-6">Services Offered</h2>
              {services.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-4xl block mb-2">
                    build_circle
                  </span>
                  <p className="text-sm">No services listed yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <p className="font-bold">{svc.name}</p>
                        {svc.duration_minutes && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 rounded-full">
                            {svc.duration_minutes} min
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {svc.price > 0 && (
                          <span className="text-sm font-black text-[#FF4B19]">
                            EGP {svc.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Specializations */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-black mb-4">Specializations</h2>
              <div className="flex flex-wrap gap-2">
                {center.specializations.map((s) => (
                  <span
                    key={s}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 font-semibold text-sm rounded-xl"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Booking sidebar */}
          <div>
            <BookingSidebar
              vendorId={center.id}
              vendorName={center.name}
              services={services}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
