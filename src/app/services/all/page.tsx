import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ServiceCentersClient from "@/components/services/ServiceCentersClient";
import type { ServiceCenterDisplay } from "@/components/services/ServiceCentersClient";

export const metadata: Metadata = {
  title: "Book a Service — Garage Egypt",
  description:
    "Browse and book certified automotive service centers across Egypt.",
};

const MOCK_CENTERS: ServiceCenterDisplay[] = [
  {
    id: "elite-auto-haus",
    name: "Elite Auto Haus",
    badge: "Elite Partner",
    city: "New Cairo",
    rating: 4.9,
    reviewCount: 312,
    completedBookings: 1840,
    specializations: ["BMW", "Mercedes-Benz"],
    services: ["General Inspection", "Engine Diagnostic", "Brake Inspection"],
    availableToday: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDM6v9903PHEN-dgowhzASd_Obu_HzFJ7mCUcHerHw3cJX0LqY5ygDoaf_XA4Qo1iJxIe5f5QtpxPubE0Dp3VHawyEVTG-IXHrDHfwfL2ntBdJhukmXQ9RqX0F36wQ3yfaiUh9us7kWfGjRW4P12a1Lss-mFF8QbOlsIdnQw3FSHBkhwDb00j2vVhmZNS5pM5qu3WSW_Dt2VCF_wyVyy0aL03aLeGg1hoXiTgIiMiGmMxaMMOwNB6o7VHtdle-RsV5Sd32hu4eo",
  },
  {
    id: "precision-motors",
    name: "Precision Motors",
    badge: null,
    city: "Sheikh Zayed",
    rating: 4.8,
    reviewCount: 198,
    completedBookings: 1020,
    specializations: ["Audi", "Porsche", "VW"],
    services: [
      "AC Diagnostic",
      "Suspension & Steering Check",
      "Transmission Check",
    ],
    availableToday: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4eLV7IKyTrK1YRud09v_2EiFwAqOndh8u_w36Suuv8yTQve9OUsdV8sgn5PkCWdSIh8K473Y4jKPEvPOHrpaDhqLKgF6cBWnZ1-0req1PvUfh5U3IS5mvhWvk2-NUWJGsp82AkqWnWF7XAgpMg0ezdNf5R7fioUuWM0xHD8r6-BGQm1QywM-QHn2heYf7jB7OJm6L8YhuyHLLFWoA9ik8nFfTPbwXOFu4f4dBq1QRTgMhJVDkfih4vV5mTG6QO3-eY_w4o8Mb",
  },
  {
    id: "autocare-cairo",
    name: "AutoCare Cairo — Maadi",
    badge: null,
    city: "Maadi, Cairo",
    rating: 4.8,
    reviewCount: 1200,
    completedBookings: 3100,
    specializations: ["All Makes"],
    services: ["General Inspection", "Brake Inspection", "AC Diagnostic"],
    availableToday: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA854x6qNq8cRXP6u0d4PAggI1K81AIQulp25Y8wXlFVrJwvU42Jc2Vsm5gPgWU1h_VW_dcGmJzs_BTZFyl83yoNoh-P27TWQzq97mLiAONXT4vZYF826-MtKKXpP-gZhQAOX-qIDAeUEMsLXe-xkSl0wTaUHmeIzJz3OQKeCmVoRiS1AZYeQ6Rxax2LH7rCDhykaNsL2ifuVyFtGwj0RscjxZCpRMJKj8GtIW-JjHI7RbXU3_D3MbtHScL4iTUz4rg3Gt6OCEh",
  },
  {
    id: "quickfix-mobile",
    name: "QuickFix Mobile Mechanics",
    badge: "Mobile Service",
    city: "All Cairo & Giza",
    rating: 4.5,
    reviewCount: 850,
    completedBookings: 4200,
    specializations: ["All Makes"],
    services: [
      "General Inspection",
      "Electrical Diagnostic",
      "Accident Assessment",
    ],
    availableToday: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCU_Ql260O28BjYrLPakaEUmyNRRoYWEXNnVAhoRVUr31JZ7kLc2G6VCJr6Ar62NRXAuovy52qNr-zHlb1ydmoLbHwWo9y3jOg7qzx3UAxLaTIQjuUJzkBo-u_4230opPKl0cp_md_HKl0jooJ14tQKI0FbZ6FEIOHK8Q_LSqa5steKdhzVkOKqJf_15gKvD35ephccuDsvFB6s6GGwZbKhEwOOUmM2hmQaCmBEv4XjlNN_adgGbkY17WnVx7PiTRmVwxcV8HDH",
  },
  {
    id: "precision-diagnostics-tagamoa",
    name: "Precision Diagnostics Tagamoa",
    badge: null,
    city: "New Cairo",
    rating: 4.9,
    reviewCount: 420,
    completedBookings: 1750,
    specializations: ["European Cars"],
    services: [
      "Engine Diagnostic",
      "Transmission Check",
      "Suspension & Steering Check",
    ],
    availableToday: false,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDVBz3od8GZjwFzBvbdgsL82WyoKoiX2CMBZjevUsODVIfmRBLZwunDI8ilKP9BIbqK0elmvOAiKiRxvNX3u1fvu0yRaHmU5BEziP4aa-sChzUNEk55_2ReIp63o00KsAS7vaDVXMHfMSGtuORq3prF03iZFpbKq10kmqXN8coqDnNFWsrES-NpMDjodwI44vN39kFuu8XC4PvrdngrxACDy6zE1GzW8auKVUO-NlEdxHhj5j2KB5Ho36cUGArylqieYMp9c4PM",
  },
  {
    id: "alex-garage-pro",
    name: "Alex Garage Pro",
    badge: null,
    city: "Alexandria",
    rating: 5.0,
    reviewCount: 421,
    completedBookings: 2300,
    specializations: ["All Makes"],
    services: [
      "Pre-Purchase Inspection",
      "Accident Assessment",
      "Electrical Diagnostic",
    ],
    availableToday: false,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCjzDT9dn3i1Jm8Xmz7GDDzGvawFrddJxqQu8HddbNSWIyjhktu7LxWcFUO41ALjbNzilHMVWzMvbQ7cHm8Y7vEk9SGkq_JH91bVsEY5-i1uPJt-aGyTlIptLDAbZ-CKSBGSI8eB5iSTTC2vAirSld0Usx7JUFB1DcACbPTrKmDKZyyHF310BUsNYn4vrCuNH0wloeArJzfQ5cvIVzkzG2A_NdODapDSuYbTXdkX9S7hKAxFbfQbSg_5mYM67XU_aBXTN1ee3n-",
  },
];

export default async function AllServiceCentersPage() {
  const supabase = await createClient();

  const { data: vendors } = await supabase
    .from("vendors")
    .select("*, services:services(id, name)")
    .eq("vendor_type", "service_center")
    .eq("status", "approved")
    .order("rating", { ascending: false });

  const dbCenters: ServiceCenterDisplay[] = (vendors ?? []).map((v) => ({
    id: v.id,
    name: v.business_name,
    badge: null,
    city: v.city ?? "Cairo",
    rating: v.rating,
    reviewCount: v.total_reviews,
    completedBookings: v.completed_bookings,
    specializations: ["All Makes"],
    services: (
      (v.services as unknown as { id: string; name: string }[] | null) ?? []
    ).map((s) => s.name),
    availableToday: true,
    image: v.cover_image_url,
  }));

  // Fall back to mock data when DB is empty (dev / demo mode)
  const centers = dbCenters.length > 0 ? dbCenters : MOCK_CENTERS;

  return <ServiceCentersClient initialCenters={centers} />;
}
