"use client";

import Link from "next/link";
import { useState } from "react";

const CATEGORIES = [
  {
    slug: "brake-system",
    icon: "minor_crash",
    label: "Brake System",
    labelAr: "نظام الفرامل",
  },
  { slug: "filters", icon: "filter_alt", label: "Filters", labelAr: "الفلاتر" },
  {
    slug: "suspension",
    icon: "shutter_speed",
    label: "Suspension",
    labelAr: "نظام التعليق",
  },
  {
    slug: "steering",
    icon: "directions_car",
    label: "Steering",
    labelAr: "نظام التوجيه",
  },
  {
    slug: "wipers-washers",
    icon: "water_drop",
    label: "Wipers & Washers",
    labelAr: "المساحات والغسيل",
  },
  {
    slug: "engine-parts",
    icon: "earth_engine",
    label: "Engine Parts",
    labelAr: "قطع المحرك",
  },
  {
    slug: "fuel-system",
    icon: "local_gas_station",
    label: "Fuel System",
    labelAr: "نظام الوقود",
  },
  {
    slug: "exhaust-system",
    icon: "blur_circular",
    label: "Exhaust System",
    labelAr: "نظام العادم",
  },
  {
    slug: "electric-system",
    icon: "battery_charging_full",
    label: "Electric System",
    labelAr: "النظام الكهربائي",
  },
  {
    slug: "engine-cooling",
    icon: "thermometer",
    label: "Engine Cooling",
    labelAr: "تبريد المحرك",
  },
  {
    slug: "heating-ventilation",
    icon: "ac_unit",
    label: "Heating & Ventilation",
    labelAr: "التدفئة والتهوية",
  },
  {
    slug: "transmission-clutch",
    icon: "settings",
    label: "Transmission & Clutch",
    labelAr: "ناقل الحركة والكلتش",
  },
  {
    slug: "car-body-interior",
    icon: "drive_eta",
    label: "Car Body & Interior",
    labelAr: "هيكل السيارة والداخلية",
  },
  {
    slug: "lighting",
    icon: "lightbulb",
    label: "Lighting",
    labelAr: "الإضاءة",
  },
  {
    slug: "oils-fluids",
    icon: "oil_barrel",
    label: "Oils & Fluids",
    labelAr: "الزيوت والسوائل",
  },
  {
    slug: "accessories-equipment",
    icon: "build",
    label: "Accessories & Equipment",
    labelAr: "الإكسسوارات والمعدات",
  },
];

export default function CategoriesGrid() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? CATEGORIES : CATEGORIES.slice(0, 6);

  return (
    <section className="py-24 max-w-7xl mx-auto px-6">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black mb-2">Browse by Category</h2>
          <p className="text-slate-500">
            Premium parts for every performance need
          </p>
        </div>
        <Link
          href="/parts"
          className="text-[#FF4B19] font-bold flex items-center gap-1 group"
        >
          View All Categories{" "}
          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
            chevron_right
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {visible.map((cat) => (
          <Link
            key={cat.slug}
            href={`/parts/${cat.slug}`}
            className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19] transition-all group cursor-pointer shadow-sm hover:shadow-xl"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center group-hover:bg-[#FF4B19] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">
                {cat.icon}
              </span>
            </div>
            <h4 className="font-bold text-sm">{cat.label}</h4>
          </Link>
        ))}
      </div>

      <div className="text-center mt-8">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-[#FF4B19] hover:text-[#FF4B19] transition-all"
        >
          <span className="material-symbols-outlined text-sm">
            {expanded ? "expand_less" : "expand_more"}
          </span>
          {expanded ? "Show Less" : `View All ${CATEGORIES.length} Categories`}
        </button>
      </div>
    </section>
  );
}
