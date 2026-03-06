import Link from "next/link";

const FEATURED_PARTS = [
  {
    id: "1",
    name: "Brembo Front Brake Pads",
    brand: "Brembo",
    category: "Brake System",
    price: 1250,
    originalPrice: 1600,
    rating: 4.8,
    reviews: 124,
    badge: "Best Seller",
    badgeColor: "bg-[#FF4B19]",
    icon: "minor_crash",
    href: "/parts/brake-system",
  },
  {
    id: "2",
    name: "Mann Oil Filter",
    brand: "Mann",
    category: "Filters",
    price: 180,
    originalPrice: 220,
    rating: 4.7,
    reviews: 89,
    badge: "Top Rated",
    badgeColor: "bg-blue-500",
    icon: "filter_alt",
    href: "/parts/filters",
  },
  {
    id: "3",
    name: "Bosch Spark Plugs Set",
    brand: "Bosch",
    category: "Engine Parts",
    price: 420,
    originalPrice: null,
    rating: 4.9,
    reviews: 213,
    badge: "New",
    badgeColor: "bg-emerald-500",
    icon: "bolt",
    href: "/parts/engine-parts",
  },
  {
    id: "4",
    name: "NGK Air Filter",
    brand: "NGK",
    category: "Filters",
    price: 290,
    originalPrice: 350,
    rating: 4.6,
    reviews: 67,
    badge: "Sale",
    badgeColor: "bg-purple-500",
    icon: "air",
    href: "/parts/filters",
  },
  {
    id: "5",
    name: "KYB Shock Absorber",
    brand: "KYB",
    category: "Suspension",
    price: 2100,
    originalPrice: 2600,
    rating: 4.8,
    reviews: 45,
    badge: "Best Seller",
    badgeColor: "bg-[#FF4B19]",
    icon: "shutter_speed",
    href: "/parts/suspension",
  },
  {
    id: "6",
    name: "Castrol Engine Oil 5W-40",
    brand: "Castrol",
    category: "Engine Parts",
    price: 750,
    originalPrice: null,
    rating: 4.9,
    reviews: 302,
    badge: "Top Rated",
    badgeColor: "bg-blue-500",
    icon: "oil_barrel",
    href: "/parts/engine-parts",
  },
];

export default function FeaturedParts() {
  return (
    <section className="w-full px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Featured <span className="text-[#FF4B19]">Parts</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Top-selling parts trusted by Egyptian drivers
          </p>
        </div>
        <Link
          href="/parts"
          className="flex items-center gap-1.5 text-sm font-bold text-[#FF4B19] hover:underline"
        >
          View All
          <span className="material-symbols-outlined text-base">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {FEATURED_PARTS.map((part) => (
          <Link
            key={part.id}
            href={part.href}
            className="group bg-white dark:bg-slate-800 rounded-2xl p-4 flex flex-col gap-3 border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:border-[#FF4B19]/30 transition-all"
          >
            {/* Icon + Badge */}
            <div className="relative">
              <div className="w-full aspect-square bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center group-hover:bg-[#FF4B19]/8 transition-colors">
                <span
                  className="material-symbols-outlined text-slate-400 dark:text-slate-300 group-hover:text-[#FF4B19] transition-colors"
                  style={{ fontSize: "36px" }}
                >
                  {part.icon}
                </span>
              </div>
              <span
                className={`absolute top-2 left-2 ${part.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}
              >
                {part.badge}
              </span>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {part.brand}
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug line-clamp-2">
                {part.name}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className="material-symbols-outlined text-amber-400"
                  style={{ fontSize: "13px" }}
                >
                  star
                </span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {part.rating}
                </span>
                <span className="text-[11px] text-slate-400">
                  ({part.reviews})
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  EGP {part.price.toLocaleString("en-EG")}
                </span>
                {part.originalPrice && (
                  <span className="text-[11px] text-slate-400 line-through">
                    {part.originalPrice.toLocaleString("en-EG")}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
