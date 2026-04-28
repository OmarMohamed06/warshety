import type { Metadata } from "next";
import Link from "next/link";
import {
  categoryPageSeo,
  buildCategoryContentAr,
  buildCategoryContentEn,
  buildBreadcrumbJsonLd,
  BASE_URL,
} from "@/utils/seo";
import { createClient } from "@/lib/supabase/server";

// Maps URL slug (SUBCATEGORY_DATA key) → DB category name in the products table
const SLUG_TO_DB_CATEGORY: Record<string, string> = {
  "brake-system": "Brakes",
  filters: "Filters",
  suspension: "Suspension",
  steering: "Steering",
  "wipers-washers": "Wipers",
  "engine-parts": "Engine",
  "fuel-system": "Fuel System",
  "exhaust-system": "Exhaust",
  "electric-system": "Electrical",
  "engine-cooling": "Cooling",
  "heating-ventilation": "HVAC",
  "transmission-clutch": "Transmission",
  "car-body-interior": "Body Parts",
  lighting: "Lighting",
  "oils-fluids": "Oils & Fluids",
};

interface Props {
  params: Promise<{ lang: string; category: string }>;
}

// Subcategory data per category
const SUBCATEGORY_DATA: Record<
  string,
  {
    name: string;
    nameAr: string;
    subs: Array<{ slug: string; name: string; nameAr: string; count: number }>;
  }
> = {
  "brake-system": {
    name: "Brake System",
    nameAr: "نظام الفرامل",
    subs: [
      {
        slug: "brake-discs",
        name: "Brake Discs",
        nameAr: "أقراص الفرامل",
        count: 320,
      },
      {
        slug: "brake-pads",
        name: "Brake Pads",
        nameAr: "تيل الفرامل",
        count: 480,
      },
      {
        slug: "brake-calipers",
        name: "Brake Calipers",
        nameAr: "قلاوظات الفرامل",
        count: 180,
      },
      {
        slug: "splash-guards",
        name: "Splash Guards",
        nameAr: "واقيات الرذاذ",
        count: 95,
      },
      {
        slug: "brake-system-accessories",
        name: "Brake System Accessories",
        nameAr: "إكسسوارات الفرامل",
        count: 120,
      },
      {
        slug: "brake-pad-wear-indicators",
        name: "Brake Pad Wear Indicators",
        nameAr: "مؤشرات تآكل الفرامل",
        count: 60,
      },
      {
        slug: "caliper-parts",
        name: "Brake Caliper Parts",
        nameAr: "أجزاء قلاوظ الفرامل",
        count: 90,
      },
      {
        slug: "handbrake-parts",
        name: "Handbrake Parts",
        nameAr: "أجزاء فرامل اليد",
        count: 75,
      },
      {
        slug: "brake-drums",
        name: "Brake Drums",
        nameAr: "طبول الفرامل",
        count: 140,
      },
      {
        slug: "brake-shoes",
        name: "Brake Shoes",
        nameAr: "أحذية الفرامل",
        count: 160,
      },
      {
        slug: "wheel-brake-cylinders",
        name: "Wheel Brake Cylinders",
        nameAr: "أسطوانات فرامل العجلة",
        count: 85,
      },
      {
        slug: "drum-brake-parts",
        name: "Drum Brake Parts",
        nameAr: "أجزاء فرامل الطبل",
        count: 70,
      },
      {
        slug: "abs-sensors",
        name: "ABS Sensors & Rings",
        nameAr: "حساسات ABS",
        count: 210,
      },
      {
        slug: "brake-master-cylinders",
        name: "Brake Master Cylinders",
        nameAr: "أسطوانة الفرامل الرئيسية",
        count: 95,
      },
      {
        slug: "brake-hoses",
        name: "Brake Hoses",
        nameAr: "خراطيم الفرامل",
        count: 130,
      },
      {
        slug: "parking-brake-cables",
        name: "Parking Brake Cables",
        nameAr: "كابلات فرامل الانتظار",
        count: 80,
      },
      {
        slug: "brake-line-fittings",
        name: "Brake Line Fittings",
        nameAr: "تركيبات خطوط الفرامل",
        count: 65,
      },
      {
        slug: "brake-boosters",
        name: "Brake Boosters",
        nameAr: "معززات الفرامل",
        count: 55,
      },
      {
        slug: "brake-power-regulator",
        name: "Brake Power Regulator",
        nameAr: "منظم قوة الفرامل",
        count: 40,
      },
      {
        slug: "brake-lines",
        name: "Brake Lines",
        nameAr: "خطوط الفرامل",
        count: 110,
      },
      {
        slug: "brake-vacuum-pumps",
        name: "Brake Vacuum Pumps",
        nameAr: "مضخات تفريغ الفرامل",
        count: 45,
      },
    ],
  },
  filters: {
    name: "Filters",
    nameAr: "الفلاتر",
    subs: [
      {
        slug: "oil-filters",
        name: "Oil Filters",
        nameAr: "فلاتر الزيت",
        count: 180,
      },
      {
        slug: "air-filters",
        name: "Air Filters",
        nameAr: "فلاتر الهواء",
        count: 150,
      },
      {
        slug: "cabin-air-filters",
        name: "Cabin Air Filters",
        nameAr: "فلاتر هواء الكابينة",
        count: 120,
      },
      {
        slug: "fuel-filters",
        name: "Fuel Filters",
        nameAr: "فلاتر الوقود",
        count: 90,
      },
      {
        slug: "filter-sets",
        name: "Filter Sets",
        nameAr: "مجموعات الفلاتر",
        count: 60,
      },
      {
        slug: "hydraulic-filters",
        name: "Hydraulic Filters",
        nameAr: "فلاتر هيدروليكية",
        count: 35,
      },
      {
        slug: "coolant-filters",
        name: "Coolant Filters",
        nameAr: "فلاتر سائل التبريد",
        count: 25,
      },
      {
        slug: "power-steering-filters",
        name: "Power Steering Filters",
        nameAr: "فلاتر التوجيه المعزز",
        count: 20,
      },
    ],
  },
  suspension: {
    name: "Suspension",
    nameAr: "نظام التعليق",
    subs: [
      {
        slug: "shock-absorbers",
        name: "Shock Absorbers",
        nameAr: "مساعدات",
        count: 280,
      },
      {
        slug: "coil-springs",
        name: "Coil Springs",
        nameAr: "زنبركات",
        count: 160,
      },
      {
        slug: "strut-bearings",
        name: "Strut Bearings & Mounts",
        nameAr: "تحميل الدعامة",
        count: 110,
      },
      {
        slug: "strut-boots",
        name: "Strut Boots",
        nameAr: "أغطية الدعامة",
        count: 70,
      },
      {
        slug: "wheel-bearings",
        name: "Wheel Bearings",
        nameAr: "تحميل العجلة",
        count: 200,
      },
      {
        slug: "wheel-hubs",
        name: "Wheel Hubs",
        nameAr: "مراكز العجلة",
        count: 130,
      },
      {
        slug: "control-arms",
        name: "Control Arms",
        nameAr: "ذراع التعليق",
        count: 175,
      },
      {
        slug: "wheel-nuts-bolts",
        name: "Wheel Nuts, Bolts & Studs",
        nameAr: "صواميل وبراغي العجلة",
        count: 95,
      },
      {
        slug: "pitman-arms",
        name: "Pitman Arms",
        nameAr: "ذراع بيتمان",
        count: 45,
      },
      {
        slug: "sway-bar-links",
        name: "Sway Bar Links",
        nameAr: "وصلات بار الاستقرار",
        count: 85,
      },
      {
        slug: "stabilizers",
        name: "Stabilizers",
        nameAr: "أجهزة تثبيت",
        count: 60,
      },
      {
        slug: "spring-caps",
        name: "Spring Caps",
        nameAr: "أغطية الزنبرك",
        count: 40,
      },
      {
        slug: "ball-joints",
        name: "Ball Joints",
        nameAr: "كرة التوجيه",
        count: 150,
      },
      {
        slug: "suspension-bushings",
        name: "Suspension Bushings",
        nameAr: "بوشيات التعليق",
        count: 190,
      },
      {
        slug: "air-springs",
        name: "Air Springs",
        nameAr: "وسادات هوائية",
        count: 55,
      },
      {
        slug: "steering-knuckles",
        name: "Steering Knuckles",
        nameAr: "مفصل التوجيه",
        count: 75,
      },
      {
        slug: "leaf-springs",
        name: "Leaf Springs",
        nameAr: "زنبرك ورقي",
        count: 65,
      },
      {
        slug: "stub-axles",
        name: "Stub Axles",
        nameAr: "محاور قصيرة",
        count: 50,
      },
      {
        slug: "suspension-repair-kits",
        name: "Suspension Repair Kits",
        nameAr: "طقم إصلاح التعليق",
        count: 80,
      },
      {
        slug: "wheel-spacers",
        name: "Wheel Spacers",
        nameAr: "فواصل العجلات",
        count: 35,
      },
    ],
  },
  steering: {
    name: "Steering",
    nameAr: "نظام التوجيه",
    subs: [
      {
        slug: "tie-rod-ends",
        name: "Tie Rod Ends",
        nameAr: "نهايات ذراع التوجيه",
        count: 180,
      },
      {
        slug: "tie-rod-assemblies",
        name: "Tie Rod Assemblies",
        nameAr: "تجميعات ذراع التوجيه",
        count: 90,
      },
      {
        slug: "steering-racks",
        name: "Steering Racks",
        nameAr: "رف التوجيه",
        count: 75,
      },
      {
        slug: "power-steering-pumps",
        name: "Power Steering Pumps",
        nameAr: "مضخة التوجيه المعزز",
        count: 110,
      },
      {
        slug: "rack-bellows",
        name: "Steering Rack Bellows",
        nameAr: "أغطية رف التوجيه",
        count: 60,
      },
      {
        slug: "steering-arms",
        name: "Steering Arms",
        nameAr: "أذرع التوجيه",
        count: 55,
      },
      {
        slug: "steering-hoses",
        name: "Steering Hoses",
        nameAr: "خراطيم التوجيه",
        count: 70,
      },
      {
        slug: "steering-columns",
        name: "Steering Columns",
        nameAr: "عمود التوجيه",
        count: 45,
      },
      {
        slug: "steering-dampers",
        name: "Steering Dampers",
        nameAr: "مخففات التوجيه",
        count: 40,
      },
      {
        slug: "power-steering-tanks",
        name: "Power Steering Tanks",
        nameAr: "خزان التوجيه المعزز",
        count: 35,
      },
      {
        slug: "steering-locks",
        name: "Steering Locks",
        nameAr: "قفل التوجيه",
        count: 25,
      },
      {
        slug: "rack-mountings",
        name: "Steering Rack Mountings",
        nameAr: "تثبيت رف التوجيه",
        count: 30,
      },
    ],
  },
  "wipers-washers": {
    name: "Wipers & Washers",
    nameAr: "المساحات والغسيل",
    subs: [
      {
        slug: "wiper-blades",
        name: "Wiper Blades",
        nameAr: "أوراق المساحات",
        count: 120,
      },
      {
        slug: "wiper-motors",
        name: "Wiper Motors",
        nameAr: "موتور المساحة",
        count: 65,
      },
      {
        slug: "washer-pumps",
        name: "Windscreen Washer Pumps",
        nameAr: "مضخة غسيل الزجاج",
        count: 55,
      },
      {
        slug: "wiper-linkage",
        name: "Wiper Linkage Assemblies",
        nameAr: "تجميعة رابط المساحة",
        count: 40,
      },
      {
        slug: "headlight-washers",
        name: "Headlight Washer Pumps & Nozzles",
        nameAr: "مضخات غسيل المصابيح",
        count: 30,
      },
      {
        slug: "wiper-arms",
        name: "Wiper Arms",
        nameAr: "أذرع المساحات",
        count: 50,
      },
      {
        slug: "washer-nozzles",
        name: "Washer Fluid Nozzles",
        nameAr: "فوهات سائل الغسيل",
        count: 35,
      },
      {
        slug: "washer-tanks",
        name: "Washer Fluid Tanks",
        nameAr: "خزانات سائل الغسيل",
        count: 45,
      },
    ],
  },
  "engine-parts": {
    name: "Engine Parts",
    nameAr: "قطع المحرك",
    subs: [
      {
        slug: "timing-belt-kits",
        name: "Timing Belt Kits",
        nameAr: "طقم سير التوقيت",
        count: 390,
      },
      {
        slug: "gaskets-seals",
        name: "Engine Gaskets & Seals",
        nameAr: "جوانات وأختام المحرك",
        count: 870,
      },
      {
        slug: "timing-chain-sets",
        name: "Timing Chain Sets",
        nameAr: "طقم سلسلة التوقيت",
        count: 220,
      },
      {
        slug: "throttle-bodies",
        name: "Throttle Bodies",
        nameAr: "جسم الخانق",
        count: 140,
      },
      {
        slug: "engine-belts-chains",
        name: "Engine Belts & Chains",
        nameAr: "سيور وسلاسل المحرك",
        count: 310,
      },
      {
        slug: "tensioners-pulleys",
        name: "Tensioners, Pulleys & Dampers",
        nameAr: "شادات وبكرات",
        count: 265,
      },
      {
        slug: "turbochargers",
        name: "Turbochargers",
        nameAr: "تيربو",
        count: 180,
      },
      {
        slug: "turbo-hoses",
        name: "Turbocharger Hoses",
        nameAr: "خراطيم التيربو",
        count: 95,
      },
      {
        slug: "turbo-parts",
        name: "Turbocharger Parts",
        nameAr: "أجزاء التيربو",
        count: 110,
      },
      {
        slug: "cylinder-head-parts",
        name: "Cylinder Head Parts",
        nameAr: "أجزاء رأس الأسطوانة",
        count: 340,
      },
      {
        slug: "engine-block",
        name: "Engine Block & Crankshaft",
        nameAr: "كتلة المحرك والعمود المرفقي",
        count: 190,
      },
      {
        slug: "engine-lubrication",
        name: "Engine Lubrication",
        nameAr: "تشحيم المحرك",
        count: 150,
      },
      { slug: "egr-system", name: "EGR System", nameAr: "نظام EGR", count: 85 },
      {
        slug: "intake-manifolds",
        name: "Intake Manifolds",
        nameAr: "مشعب السحب",
        count: 120,
      },
      {
        slug: "air-supply-hoses",
        name: "Air Supply Hoses",
        nameAr: "خراطيم إمداد الهواء",
        count: 100,
      },
      {
        slug: "engine-mountings",
        name: "Engine Mountings",
        nameAr: "تثبيتات المحرك",
        count: 160,
      },
      {
        slug: "accelerator-cables",
        name: "Accelerator Cables",
        nameAr: "كابلات الوقود",
        count: 75,
      },
      {
        slug: "idle-control-valves",
        name: "Idle Control Valves",
        nameAr: "صمامات التحكم في الخمول",
        count: 65,
      },
    ],
  },
  "fuel-system": {
    name: "Fuel System",
    nameAr: "نظام الوقود",
    subs: [
      {
        slug: "injector-nozzles",
        name: "Injector Nozzles",
        nameAr: "فوهات الحاقن",
        count: 160,
      },
      {
        slug: "injector-parts",
        name: "Injector & Nozzle Parts",
        nameAr: "أجزاء الحاقن",
        count: 90,
      },
      {
        slug: "fuel-pumps",
        name: "Fuel Pumps",
        nameAr: "مضخات الوقود",
        count: 140,
      },
      {
        slug: "fuel-gaskets",
        name: "Fuel System Gaskets & Seals",
        nameAr: "جوانات نظام الوقود",
        count: 70,
      },
      {
        slug: "fuel-tanks",
        name: "Fuel Tanks",
        nameAr: "خزانات الوقود",
        count: 55,
      },
      {
        slug: "high-pressure-pumps",
        name: "High Pressure Pumps",
        nameAr: "مضخات ضغط عالي",
        count: 80,
      },
      {
        slug: "fuel-lines-hoses",
        name: "Fuel Lines & Hoses",
        nameAr: "خطوط وخراطيم الوقود",
        count: 110,
      },
      {
        slug: "fuel-valves",
        name: "Fuel System Valves",
        nameAr: "صمامات نظام الوقود",
        count: 65,
      },
      {
        slug: "fuel-pressure-regulators",
        name: "Fuel Pressure Regulators",
        nameAr: "منظمات ضغط الوقود",
        count: 50,
      },
      {
        slug: "carburettor-parts",
        name: "Carburettor Parts",
        nameAr: "أجزاء الكاربريتر",
        count: 85,
      },
      {
        slug: "water-in-fuel-sensors",
        name: "Water in Fuel Sensors",
        nameAr: "حساسات الماء في الوقود",
        count: 30,
      },
      {
        slug: "air-injection-pumps",
        name: "Secondary Air Injection Pumps",
        nameAr: "مضخات حقن هواء ثانوي",
        count: 25,
      },
    ],
  },
  "exhaust-system": {
    name: "Exhaust System",
    nameAr: "نظام العادم",
    subs: [
      {
        slug: "silencers",
        name: "Silencers",
        nameAr: "كاتم الصوت",
        count: 120,
      },
      {
        slug: "exhaust-pipes",
        name: "Exhaust Pipes",
        nameAr: "ماسورة العادم",
        count: 95,
      },
      {
        slug: "catalytic-converters",
        name: "Catalytic Converters",
        nameAr: "محول حفاز",
        count: 80,
      },
      {
        slug: "exhaust-manifolds",
        name: "Exhaust Manifolds",
        nameAr: "مشعب العادم",
        count: 70,
      },
      {
        slug: "dpf",
        name: "Diesel Particulate Filters (DPF)",
        nameAr: "فلتر الجسيمات الديزل",
        count: 45,
      },
      {
        slug: "exhaust-gaskets",
        name: "Exhaust Gaskets",
        nameAr: "جوانات العادم",
        count: 90,
      },
      {
        slug: "lambda-sensors",
        name: "Lambda Sensors",
        nameAr: "حساسات لامبدا",
        count: 110,
      },
      {
        slug: "exhaust-mountings",
        name: "Exhaust Mounting Parts",
        nameAr: "تثبيتات العادم",
        count: 60,
      },
      {
        slug: "exhaust-sensors",
        name: "Exhaust System Sensors",
        nameAr: "حساسات نظام العادم",
        count: 50,
      },
      {
        slug: "exhaust-valves",
        name: "Exhaust System Valves",
        nameAr: "صمامات نظام العادم",
        count: 35,
      },
    ],
  },
  "electric-system": {
    name: "Electric System",
    nameAr: "النظام الكهربائي",
    subs: [
      {
        slug: "alternators",
        name: "Alternators",
        nameAr: "دينامو",
        count: 150,
      },
      {
        slug: "alternator-clutches",
        name: "Alternator Freewheel Clutches",
        nameAr: "كلتش الدينامو",
        count: 55,
      },
      { slug: "sensors", name: "Sensors", nameAr: "حساسات", count: 420 },
      {
        slug: "spark-plugs",
        name: "Spark Plugs",
        nameAr: "بوجيهات",
        count: 200,
      },
      { slug: "starters", name: "Starters", nameAr: "مارش", count: 130 },
      {
        slug: "glow-plugs",
        name: "Glow Plugs",
        nameAr: "شمعات التسخين",
        count: 110,
      },
      {
        slug: "ignition-coils",
        name: "Ignition Coils",
        nameAr: "ملفات الإشعال",
        count: 160,
      },
      { slug: "switches", name: "Switches", nameAr: "مفاتيح", count: 180 },
      {
        slug: "spark-plug-wires",
        name: "Spark Plug Wires",
        nameAr: "أسلاك البوجيه",
        count: 90,
      },
      {
        slug: "ignition-distributor",
        name: "Ignition Distributor Parts",
        nameAr: "أجزاء الدلكو",
        count: 70,
      },
      {
        slug: "alternator-parts",
        name: "Alternator Parts",
        nameAr: "أجزاء الدينامو",
        count: 85,
      },
      {
        slug: "alternator-regulators",
        name: "Alternator Regulators",
        nameAr: "منظمات الدينامو",
        count: 50,
      },
      {
        slug: "starter-parts",
        name: "Starter Parts",
        nameAr: "أجزاء المارش",
        count: 65,
      },
      {
        slug: "control-units",
        name: "Control Units",
        nameAr: "وحدات التحكم",
        count: 140,
      },
      {
        slug: "solenoid-switches",
        name: "Solenoid Switches",
        nameAr: "مفاتيح سولينويد",
        count: 45,
      },
      {
        slug: "air-horns",
        name: "Air Horns",
        nameAr: "أبواق هوائية",
        count: 35,
      },
      {
        slug: "harnesses",
        name: "Harnesses",
        nameAr: "أحزمة الكابلات",
        count: 95,
      },
      {
        slug: "airbag-clock-springs",
        name: "Airbag Clock Springs",
        nameAr: "زنبركات ساعة الوسادة الهوائية",
        count: 40,
      },
    ],
  },
  "engine-cooling": {
    name: "Engine Cooling",
    nameAr: "تبريد المحرك",
    subs: [
      {
        slug: "water-pumps",
        name: "Water Pumps",
        nameAr: "طلمبات الماء",
        count: 160,
      },
      {
        slug: "cooling-gaskets",
        name: "Cooling System Gaskets & Seals",
        nameAr: "جوانات نظام التبريد",
        count: 90,
      },
      {
        slug: "water-pump-pulleys",
        name: "Water Pump Pulleys",
        nameAr: "بكرات طلمبة الماء",
        count: 55,
      },
      {
        slug: "radiators",
        name: "Cooling Radiators",
        nameAr: "رادياتير",
        count: 140,
      },
      {
        slug: "radiator-hoses",
        name: "Radiator Hoses & Pipes",
        nameAr: "خراطيم الرادياتير",
        count: 120,
      },
      {
        slug: "radiator-fans",
        name: "Radiator Fans",
        nameAr: "مراوح الرادياتير",
        count: 95,
      },
      {
        slug: "intercoolers",
        name: "Intercoolers",
        nameAr: "انتركولر",
        count: 60,
      },
      {
        slug: "thermostats",
        name: "Thermostats",
        nameAr: "ترموستات",
        count: 110,
      },
      {
        slug: "expansion-tanks",
        name: "Coolant Expansion Tanks",
        nameAr: "خزانات تمدد سائل التبريد",
        count: 75,
      },
      {
        slug: "antifreeze",
        name: "Antifreeze",
        nameAr: "سائل مضاد للتجمد",
        count: 50,
      },
      {
        slug: "cooling-sensors",
        name: "Cooling System Sensors & Relays",
        nameAr: "حساسات نظام التبريد",
        count: 85,
      },
      {
        slug: "radiator-mountings",
        name: "Radiator Mountings",
        nameAr: "تثبيتات الرادياتير",
        count: 40,
      },
      {
        slug: "oil-cooler",
        name: "Oil Cooler & Pipes",
        nameAr: "مبرد الزيت وأنابيبه",
        count: 65,
      },
      {
        slug: "coolant-flanges",
        name: "Coolant Flanges",
        nameAr: "فلنجات سائل التبريد",
        count: 35,
      },
    ],
  },
  "heating-ventilation": {
    name: "Heating & Ventilation",
    nameAr: "التدفئة والتهوية",
    subs: [
      {
        slug: "ac-compressors",
        name: "A/C Compressors",
        nameAr: "ضاغط التكييف",
        count: 110,
      },
      {
        slug: "ac-condensers",
        name: "A/C Condensers",
        nameAr: "مكثف التكييف",
        count: 80,
      },
      {
        slug: "ac-dryers",
        name: "A/C Dryers",
        nameAr: "مجفف التكييف",
        count: 60,
      },
      {
        slug: "blower-motors",
        name: "Interior Blower Motors",
        nameAr: "موتور مروحة التدفئة",
        count: 90,
      },
      {
        slug: "heater-cores",
        name: "Heater Cores",
        nameAr: "قلب المدفأة",
        count: 70,
      },
      {
        slug: "heater-hoses",
        name: "Heater Hoses",
        nameAr: "خراطيم المدفأة",
        count: 55,
      },
      {
        slug: "parking-heaters",
        name: "Parking Heaters",
        nameAr: "سخانات الانتظار",
        count: 30,
      },
      {
        slug: "evaporators",
        name: "Evaporators",
        nameAr: "مبخر التكييف",
        count: 65,
      },
      {
        slug: "ac-hoses-pipes",
        name: "A/C Hoses & Pipes",
        nameAr: "خراطيم وأنابيب التكييف",
        count: 85,
      },
      {
        slug: "ac-relays",
        name: "A/C Relays",
        nameAr: "ريليهات التكييف",
        count: 40,
      },
      {
        slug: "ac-switches",
        name: "A/C Switches & Actuators",
        nameAr: "مفاتيح ومحركات التكييف",
        count: 50,
      },
      {
        slug: "temp-sensors",
        name: "Temperature Sensors",
        nameAr: "حساسات الحرارة",
        count: 75,
      },
      {
        slug: "ac-control-units",
        name: "A/C Control Units & Valves",
        nameAr: "وحدات تحكم التكييف",
        count: 45,
      },
      {
        slug: "heater-control-units",
        name: "Heater Control Units & Valves",
        nameAr: "وحدات تحكم التدفئة",
        count: 35,
      },
    ],
  },
  "transmission-clutch": {
    name: "Transmission & Clutch",
    nameAr: "ناقل الحركة والكلتش",
    subs: [
      {
        slug: "clutch-kits",
        name: "Clutch Kits",
        nameAr: "طقم الكلتش",
        count: 180,
      },
      {
        slug: "drive-shafts",
        name: "Drive Shafts",
        nameAr: "أعمدة الدفع",
        count: 140,
      },
      {
        slug: "flywheels",
        name: "Flywheels",
        nameAr: "عجلة الحدافة",
        count: 90,
      },
      { slug: "cv-joints", name: "CV Joints", nameAr: "مفاصل CV", count: 160 },
      { slug: "cv-boots", name: "CV Boots", nameAr: "أغطية CV", count: 120 },
      {
        slug: "clutch-parts",
        name: "Individual Clutch Parts",
        nameAr: "أجزاء الكلتش المفردة",
        count: 95,
      },
      {
        slug: "transmission-oil-kits",
        name: "Transmission Oil Change Kits",
        nameAr: "طقم تغيير زيت ناقل الحركة",
        count: 55,
      },
      {
        slug: "universal-joints",
        name: "Universal & Flex Joints",
        nameAr: "مفاصل عالمية ومرنة",
        count: 75,
      },
      {
        slug: "transmission-gaskets",
        name: "Transmission Gaskets & Seals",
        nameAr: "جوانات وأختام ناقل الحركة",
        count: 85,
      },
      {
        slug: "propshafts",
        name: "Propshafts",
        nameAr: "أعمدة الإدارة",
        count: 65,
      },
      {
        slug: "propshaft-bearings",
        name: "Propshaft Centre Bearings",
        nameAr: "تحميل منتصف عمود الإدارة",
        count: 45,
      },
      {
        slug: "clutch-master-cylinders",
        name: "Clutch Master Cylinders",
        nameAr: "أسطوانة الكلتش الرئيسية",
        count: 70,
      },
      {
        slug: "gear-selector-rods",
        name: "Gear Selector Rods & Repair Kits",
        nameAr: "قضبان اختيار التروس",
        count: 40,
      },
      {
        slug: "transmission-mountings",
        name: "Transmission Mountings",
        nameAr: "تثبيتات ناقل الحركة",
        count: 60,
      },
      {
        slug: "transmission-oil-coolers",
        name: "Transmission Oil Coolers",
        nameAr: "مبردات زيت ناقل الحركة",
        count: 35,
      },
      {
        slug: "differential-parts",
        name: "Differential Parts",
        nameAr: "أجزاء الديفرنسيال",
        count: 80,
      },
    ],
  },
  "car-body-interior": {
    name: "Car Body & Interior",
    nameAr: "هيكل السيارة والداخلية",
    subs: [
      {
        slug: "door-handles-locks",
        name: "Door Handles & Locks",
        nameAr: "مقابض وأقفال الأبواب",
        count: 220,
      },
      {
        slug: "window-lifts",
        name: "Window Lifts",
        nameAr: "رافعات الزجاج",
        count: 180,
      },
      {
        slug: "gas-springs",
        name: "Gas Springs",
        nameAr: "زنبركات غازية",
        count: 90,
      },
      {
        slug: "bumper-parts",
        name: "Bumper Parts",
        nameAr: "أجزاء البامبر",
        count: 160,
      },
      { slug: "fenders", name: "Fenders", nameAr: "رفرفات", count: 140 },
      { slug: "mirrors", name: "Mirrors", nameAr: "مرايا", count: 195 },
      {
        slug: "mudguards",
        name: "Mudguards",
        nameAr: "واقيات الطين",
        count: 85,
      },
      {
        slug: "interior-parts",
        name: "Interior Parts",
        nameAr: "أجزاء الداخلية",
        count: 250,
      },
      {
        slug: "front-grilles",
        name: "Front Grilles",
        nameAr: "شبكات أمامية",
        count: 110,
      },
      {
        slug: "door-parts",
        name: "Door Parts",
        nameAr: "أجزاء الباب",
        count: 175,
      },
      {
        slug: "bonnet-parts",
        name: "Bonnet & Parts",
        nameAr: "كبوت وأجزاؤه",
        count: 120,
      },
      {
        slug: "tailgate-lift-motor",
        name: "Tailgate Lift Motor",
        nameAr: "موتور رفع الصندوق الخلفي",
        count: 45,
      },
      {
        slug: "trim-strips",
        name: "Trim & Protective Strips",
        nameAr: "أشرطة زينة وحماية",
        count: 95,
      },
      {
        slug: "floor-panels",
        name: "Floor Panels",
        nameAr: "ألواح الأرضية",
        count: 60,
      },
      {
        slug: "window-seals",
        name: "Window Seals",
        nameAr: "أختام النوافذ",
        count: 130,
      },
      {
        slug: "license-plate-holders",
        name: "License Plate Holders",
        nameAr: "حوامل لوحات الترخيص",
        count: 55,
      },
      {
        slug: "engine-covers",
        name: "Engine Covers",
        nameAr: "أغطية المحرك",
        count: 70,
      },
      {
        slug: "seat-adjustment-parts",
        name: "Seat Adjustment Parts",
        nameAr: "أجزاء ضبط المقاعد",
        count: 80,
      },
      { slug: "antennas", name: "Antennas", nameAr: "هوائيات", count: 40 },
    ],
  },
  lighting: {
    name: "Lighting",
    nameAr: "الإضاءة",
    subs: [
      {
        slug: "tail-lights",
        name: "Tail Lights",
        nameAr: "مصابيح خلفية",
        count: 180,
      },
      {
        slug: "headlights",
        name: "Headlights",
        nameAr: "مصابيح أمامية",
        count: 200,
      },
      {
        slug: "headlight-parts",
        name: "Headlight Parts",
        nameAr: "أجزاء المصابيح الأمامية",
        count: 120,
      },
      {
        slug: "tail-light-parts",
        name: "Tail Light Parts",
        nameAr: "أجزاء المصابيح الخلفية",
        count: 90,
      },
      {
        slug: "car-bulbs",
        name: "Car Bulbs",
        nameAr: "لمبات السيارة",
        count: 250,
      },
      {
        slug: "turn-signal-lights",
        name: "Turn Signal Lights",
        nameAr: "مصابيح الإشارة",
        count: 130,
      },
      {
        slug: "lighting-switches",
        name: "Lighting Switches",
        nameAr: "مفاتيح الإضاءة",
        count: 70,
      },
      {
        slug: "front-fog-lights",
        name: "Front Fog Lights",
        nameAr: "مصابيح الضباب الأمامية",
        count: 110,
      },
      {
        slug: "rear-fog-lights",
        name: "Rear Fog Lights",
        nameAr: "مصابيح الضباب الخلفية",
        count: 75,
      },
      {
        slug: "license-plate-lights",
        name: "License Plate Lights",
        nameAr: "مصابيح لوحة الترخيص",
        count: 60,
      },
      {
        slug: "reverse-lights",
        name: "Reverse Lights",
        nameAr: "مصابيح الرجوع",
        count: 55,
      },
      {
        slug: "daytime-running-lights",
        name: "Daytime Running Lights",
        nameAr: "مصابيح النهار",
        count: 80,
      },
      {
        slug: "stop-lights",
        name: "Stop Lights",
        nameAr: "مصابيح الوقوف",
        count: 65,
      },
    ],
  },
  "oils-fluids": {
    name: "Oils & Fluids",
    nameAr: "الزيوت والسوائل",
    subs: [
      {
        slug: "engine-oil",
        name: "Engine Oil",
        nameAr: "زيت المحرك",
        count: 200,
      },
      {
        slug: "coolant-antifreeze",
        name: "Coolant / Antifreeze",
        nameAr: "سائل تبريد / مضاد تجمد",
        count: 90,
      },
      {
        slug: "brake-fluid",
        name: "Brake Fluid",
        nameAr: "سائل الفرامل",
        count: 70,
      },
      {
        slug: "transmission-fluid",
        name: "Transmission Fluid",
        nameAr: "سائل ناقل الحركة",
        count: 85,
      },
      {
        slug: "power-steering-fluid",
        name: "Power Steering Fluid",
        nameAr: "سائل التوجيه المعزز",
        count: 55,
      },
      {
        slug: "washer-fluid",
        name: "Windscreen Washer Fluid",
        nameAr: "سائل غسيل الزجاج",
        count: 60,
      },
    ],
  },
  "accessories-equipment": {
    name: "Accessories & Equipment",
    nameAr: "الإكسسوارات والمعدات",
    subs: [
      {
        slug: "interior-comfort",
        name: "Interior Comfort & Protection",
        nameAr: "راحة وحماية الداخلية",
        count: 180,
      },
      {
        slug: "additional-lighting",
        name: "Additional Lighting",
        nameAr: "إضاءة إضافية",
        count: 90,
      },
      {
        slug: "towbars",
        name: "Towbars & Wiring Kits",
        nameAr: "خطافات سحب وطقم أسلاك",
        count: 55,
      },
      {
        slug: "car-mats",
        name: "Car Mats",
        nameAr: "سجادات السيارة",
        count: 150,
      },
      {
        slug: "trunk-mats",
        name: "Trunk Mats",
        nameAr: "سجادات الصندوق",
        count: 80,
      },
      {
        slug: "snow-chains",
        name: "Snow Chains & Socks",
        nameAr: "سلاسل وجوارب الثلج",
        count: 40,
      },
      {
        slug: "jump-start-cables",
        name: "Jump Start Cables",
        nameAr: "كابلات تشغيل الطوارئ",
        count: 65,
      },
      {
        slug: "parking-sensors",
        name: "Universal Parking Sensors",
        nameAr: "حساسات ركن عالمية",
        count: 75,
      },
      {
        slug: "reversing-cameras",
        name: "Reversing Cameras",
        nameAr: "كاميرات الرجوع",
        count: 60,
      },
      {
        slug: "roof-bars",
        name: "Roof Bars & Accessories",
        nameAr: "حوامل السقف وإكسسواراتها",
        count: 45,
      },
      {
        slug: "bike-carriers",
        name: "Bike Carriers",
        nameAr: "حوامل الدراجات",
        count: 30,
      },
      {
        slug: "car-covers",
        name: "Car Covers",
        nameAr: "أغطية السيارات",
        count: 70,
      },
      {
        slug: "wheel-trims",
        name: "Wheel Trims",
        nameAr: "أطواق العجلات",
        count: 85,
      },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, category } = await params;
  const locale = (lang === "ar" ? "ar" : "en") as "ar" | "en";
  const data = SUBCATEGORY_DATA[category];
  return categoryPageSeo({
    categoryNameEn: data?.name ?? category.replace(/-/g, " "),
    categoryNameAr: data?.nameAr ?? category,
    slugEn: category,
    locale,
    productCount: data?.subs.reduce((s, sub) => s + sub.count, 0),
  });
}

export default async function CategoryPage({ params }: Props) {
  const { lang, category } = await params;
  const data = SUBCATEGORY_DATA[category] ?? {
    name: category.replace(/-/g, " "),
    nameAr: "",
    subs: [],
  };
  const isAr = lang === "ar";

  // Fetch real subcategory counts from the DB
  const dbCategory = SLUG_TO_DB_CATEGORY[category];
  let countMap: Record<string, number> = {};
  if (dbCategory) {
    try {
      const supabase = await createClient();
      const { data: rows } = await supabase
        .from("products")
        .select("subcategory")
        .eq("category", dbCategory)
        .eq("active", true);
      if (rows) {
        for (const row of rows as { subcategory: string }[]) {
          if (row.subcategory) {
            countMap[row.subcategory] = (countMap[row.subcategory] ?? 0) + 1;
          }
        }
      }
    } catch {
      // fall back to static counts silently
    }
  }

  const hasCounts = Object.keys(countMap).length > 0;
  const subs = data.subs.map((sub) => ({
    ...sub,
    count: hasCounts ? (countMap[sub.name] ?? 0) : sub.count,
  }));
  const mergedData = { ...data, subs };

  const locale = isAr ? "ar" : "en";

  // JSON-LD: BreadcrumbList
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: isAr ? "الرئيسية" : "Home", url: `${BASE_URL}/${locale}` },
    { name: isAr ? "قطع الغيار" : "Parts", url: `${BASE_URL}/${locale}/parts` },
    {
      name: isAr && data.nameAr ? data.nameAr : data.name,
      url: `${BASE_URL}/${locale}/parts/${category}`,
    },
  ]);

  // SEO content layer paragraph (boosts ranking heavily)
  const seoContent = isAr
    ? buildCategoryContentAr(data.nameAr || data.name)
    : buildCategoryContentEn(data.name);

  return (
    <div
      className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]"
      dir={isAr ? "rtl" : "ltr"}
      lang={locale}
    >
      {/* JSON-LD: Breadcrumb structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <nav
            className="text-xs text-slate-400 mb-4 flex items-center gap-2"
            aria-label={isAr ? "مسار التنقل" : "Breadcrumb"}
          >
            <Link href={`/${lang}`} className="hover:text-[#FF4B19]">
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <span
              className="material-symbols-outlined text-sm"
              aria-hidden="true"
            >
              chevron_right
            </span>
            <Link href={`/${lang}/parts`} className="hover:text-[#FF4B19]">
              {isAr ? "قطع الغيار" : "Parts"}
            </Link>
            <span
              className="material-symbols-outlined text-sm"
              aria-hidden="true"
            >
              chevron_right
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">
              {isAr && data.nameAr ? data.nameAr : data.name}
            </span>
          </nav>
          {/* H1 — Primary SEO heading */}
          <h1 className="text-4xl font-black mb-1">
            {isAr && data.nameAr ? data.nameAr : data.name}
          </h1>
          {/* SEO Content Layer — Arabic-first ranking paragraph */}
          <p className="text-slate-500 max-w-2xl">{seoContent}</p>
        </div>
      </div>

      {/* Subcategories */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {mergedData.subs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mergedData.subs.map((sub) => (
              <Link
                key={sub.slug}
                href={`/${lang}/parts/${category}/${sub.slug}`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19] hover:shadow-xl transition-all group flex items-center gap-5"
              >
                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-[#FF4B19] transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl group-hover:text-white transition-colors">
                    minor_crash
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base mb-0.5">
                    {isAr && sub.nameAr ? sub.nameAr : sub.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {isAr
                      ? `${sub.count.toLocaleString("ar-EG")} قطعة`
                      : `${sub.count} parts`}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-[#FF4B19] transition-colors">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">
              category
            </span>
            <h3 className="text-xl font-bold text-slate-500">
              {isAr ? "لم يتم العثور على فئات فرعية" : "No subcategories found"}
            </h3>
            <Link
              href={`/${lang}/parts`}
              className="mt-4 inline-block text-[#FF4B19] font-semibold"
            >
              {isAr ? "← العودة إلى جميع الفئات" : "← Back to all categories"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
