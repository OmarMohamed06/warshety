import Link from "next/link";

const SERVICE_CENTERS = [
  {
    id: "elite-auto-haus",
    name: "Elite Auto Haus",
    city: "New Cairo, Egypt",
    rating: 4.9,
    specializations: ["BMW Specialist", "Mercedes-Benz"],
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDM6v9903PHEN-dgowhzASd_Obu_HzFJ7mCUcHerHw3cJX0LqY5ygDoaf_XA4Qo1iJxIe5f5QtpxPubE0Dp3VHawyEVTG-IXHrDHfwfL2ntBdJhukmXQ9RqX0F36wQ3yfaiUh9us7kWfGjRW4P12a1Lss-mFF8QbOlsIdnQw3FSHBkhwDb00j2vVhmZNS5pM5qu3WSW_Dt2VCF_wyVyy0aL03aLeGg1hoXiTgIiMiGmMxaMMOwNB6o7VHtdle-RsV5Sd32hu4eo",
  },
  {
    id: "precision-motors",
    name: "Precision Motors",
    city: "Sheikh Zayed, Egypt",
    rating: 4.8,
    specializations: ["Audi", "Porsche"],
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4eLV7IKyTrK1YRud09v_2EiFwAqOndh8u_w36Suuv8yTQve9OUsdV8sgn5PkCWdSIh8K473Y4jKPEvPOHrpaDhqLKgF6cBWnZ1-0req1PvUfh5U3IS5mvhWvk2-NUWJGsp82AkqWnWF7XAgpMg0ezdNf5R7fioUuWM0xHD8r6-BGQm1QywM-QHn2heYf7jB7OJm6L8YhuyHLLFWoA9ik8nFfTPbwXOFu4f4dBq1QRTgMhJVDkfih4vV5mTG6QO3-eY_w4o8Mb",
  },
  {
    id: "alex-garage-pro",
    name: "Alex Garage Pro",
    city: "Alexandria, Egypt",
    rating: 5.0,
    specializations: ["All Luxury Makes"],
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCjzDT9dn3i1Jm8Xmz7GDDzGvawFrddJxqQu8HddbNSWIyjhktu7LxWcFUO41ALjbNzilHMVWzMvbQ7cHm8Y7vEk9SGkq_JH91bVsEY5-i1uPJt-aGyTlIptLDAbZ-CKSBGSI8eB5iSTTC2vAirSld0Usx7JUFB1DcACbPTrKmDKZyyHF310BUsNYn4vrCuNH0wloeArJzfQ5cvIVzkzG2A_NdODapDSuYbTXdkX9S7hKAxFbfQbSg_5mYM67XU_aBXTN1ee3n-",
  },
];

export default function FeaturedServiceCenters() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-black mb-2">Featured Service Centers</h2>
          <p className="text-slate-500">
            Certified excellence in Cairo, Giza &amp; Alexandria
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          {SERVICE_CENTERS.map((center) => (
            <div
              key={center.id}
              className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 group shadow-md hover:shadow-2xl transition-all"
            >
              <div
                className="h-56 bg-center bg-cover relative"
                style={{ backgroundImage: `url('${center.image}')` }}
              >
                <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                  <span
                    className="material-symbols-outlined text-[#FF4B19] text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  {center.rating}
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-xl font-bold mb-2">{center.name}</h4>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <span className="material-symbols-outlined text-base">
                    location_on
                  </span>
                  {center.city}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {center.specializations.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold uppercase text-slate-500"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/services/${center.id}`}
                  className="block w-full py-3 rounded-xl border-2 border-[#FF4B19] text-[#FF4B19] font-bold text-center hover:bg-[#FF4B19] hover:text-white transition-all"
                >
                  Book Inspection
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#FF4B19] text-white font-bold rounded-xl hover:bg-[#e03d10] transition-all shadow-md hover:shadow-lg"
          >
            View All Service Centers
            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
