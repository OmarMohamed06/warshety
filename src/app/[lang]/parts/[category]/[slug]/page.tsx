import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import PartsListingClient from "@/components/parts/PartsListingClient";
import { generateSeoMeta } from "@/utils/seo";
import { createClient } from "@/lib/supabase/server";
import type { Part } from "@/types";
import type { DbProduct } from "@/types/database";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Props {
  params: Promise<{ lang: string; category: string; slug: string }>;
}

type ProductWithVendor = DbProduct & {
  vendor: { business_name: string; rating: number; city: string | null } | null;
  product_vehicles:
    | {
        make: string;
        model: string;
        year_from: number | null;
        year_to: number | null;
      }[]
    | null;
};

function mapProductToPart(p: ProductWithVendor): Part {
  return {
    id: p.id,
    slug: p.slug ?? p.id,
    name: p.name,
    brand: p.brand ?? "",
    price: p.price,
    originalPrice: p.original_price ?? undefined,
    condition: p.condition,
    partType: p.part_type ?? undefined,
    make: p.make ?? undefined,
    model: p.model ?? undefined,
    yearFrom: p.year_from ?? undefined,
    yearTo: p.year_to ?? undefined,
    oemNumber: p.oem_number ?? undefined,
    partNumber: p.part_number ?? undefined,
    images:
      p.images && p.images.length > 0
        ? p.images
        : p.image_url
          ? [p.image_url]
          : [],
    compatibleVehicles: (p.product_vehicles ?? []).map((v) =>
      [
        v.make,
        v.model,
        v.year_from && v.year_to ? `(${v.year_from}–${v.year_to})` : "",
      ]
        .filter(Boolean)
        .join(" "),
    ),
    vendorId: p.vendor_id,
    vendorName: p.vendor?.business_name ?? "",
    vendorRating: p.vendor?.rating ?? 0,
    stock: p.stock,
    installationAvailable: false,
    rating: 0,
    reviewCount: 0,
    location: p.vendor?.city ?? "Cairo",
    category: p.category,
    subcategory: p.subcategory ?? undefined,
  };
}

/** Maps URL category slug → vendor product category */
const SLUG_TO_CAT: Record<string, string> = {
  // brake
  "brake-system": "Brakes",
  // filters
  filters: "Filters",
  // suspension
  suspension: "Suspension",
  // engine (both slugs used across pages)
  engine: "Engine",
  "engine-parts": "Engine",
  // electrical
  electrical: "Electrical",
  "electric-system": "Electrical",
  // exhaust
  exhaust: "Exhaust",
  "exhaust-system": "Exhaust",
  // transmission
  transmission: "Transmission",
  "transmission-clutch": "Transmission",
  // cooling
  cooling: "Cooling",
  "engine-cooling": "Cooling",
  // steering
  steering: "Steering",
  // body
  "body-parts": "Body Parts",
  "car-body-interior": "Body Parts",
  // fuel
  "fuel-system": "Fuel System",
};

/** Maps URL subcategory slug → vendor product subcategory display name */
const SLUG_TO_SUB: Record<string, string> = {
  // ── Brakes ──────────────────────────────────────────────────────────────
  "brake-pads": "Brake Pads",
  "brake-discs": "Brake Discs",
  "brake-calipers": "Brake Calipers",
  "brake-drums": "Brake Drums",
  "brake-shoes": "Brake Shoes",
  "abs-sensors": "ABS Sensors & Rings",
  "brake-master-cylinders": "Brake Master Cylinders",
  "brake-hoses": "Brake Hoses",
  "brake-boosters": "Brake Boosters",
  "brake-lines": "Brake Lines",
  "parking-brake-cables": "Parking Brake Cables",
  "handbrake-parts": "Handbrake Parts",
  "splash-guards": "Splash Guards",
  // ── Filters ─────────────────────────────────────────────────────────────
  "oil-filters": "Oil Filters",
  "air-filters": "Air Filters",
  "cabin-air-filters": "Cabin Air Filters",
  "fuel-filters": "Fuel Filters",
  "filter-sets": "Filter Sets",
  // ── Suspension ──────────────────────────────────────────────────────────
  "shock-absorbers": "Shock Absorbers",
  "coil-springs": "Coil Springs",
  "wheel-bearings": "Wheel Bearings",
  "wheel-hubs": "Wheel Hubs",
  "control-arms": "Control Arms",
  "ball-joints": "Ball Joints",
  "suspension-bushings": "Suspension Bushings",
  "strut-bearings": "Strut Bearings & Mounts",
  "sway-bar-links": "Sway Bar Links",
  "air-springs": "Air Springs",
  "leaf-springs": "Leaf Springs",
  // ── Engine ──────────────────────────────────────────────────────────────
  "timing-belt-kits": "Timing Belt Kits",
  "timing-belt": "Timing Belt Kits", // legacy compat
  "gaskets-seals": "Engine Gaskets & Seals",
  "timing-chain-sets": "Timing Chain Sets",
  turbochargers: "Turbochargers",
  "engine-mountings": "Engine Mountings",
  "cylinder-head-parts": "Cylinder Head Parts",
  "engine-lubrication": "Engine Lubrication",
  "egr-system": "EGR System",
  "intake-manifolds": "Intake Manifolds",
  "throttle-bodies": "Throttle Bodies",
  // ── Electrical ──────────────────────────────────────────────────────────
  alternators: "Alternators",
  starters: "Starters",
  "spark-plugs": "Spark Plugs",
  ignition: "Spark Plugs", // legacy compat
  "glow-plugs": "Glow Plugs",
  "ignition-coils": "Ignition Coils",
  sensors: "Sensors",
  switches: "Switches",
  "control-units": "Control Units",
  battery: "Batteries",
  charging: "Alternators", // legacy compat
  // ── Exhaust ─────────────────────────────────────────────────────────────
  silencers: "Silencers",
  "exhaust-pipes": "Exhaust Pipes",
  "catalytic-converters": "Catalytic Converters",
  "exhaust-manifolds": "Exhaust Manifolds",
  dpf: "Diesel Particulate Filters (DPF)",
  "lambda-sensors": "Lambda Sensors",
  "exhaust-gaskets": "Exhaust Gaskets",
  // ── Cooling ─────────────────────────────────────────────────────────────
  "water-pumps": "Water Pumps",
  radiators: "Cooling Radiators",
  thermostats: "Thermostats",
  "radiator-hoses": "Radiator Hoses & Pipes",
  "radiator-fans": "Radiator Fans",
  intercoolers: "Intercoolers",
  "expansion-tanks": "Coolant Expansion Tanks",
  // ── Steering ────────────────────────────────────────────────────────────
  "tie-rod-ends": "Tie Rod Ends",
  "tie-rod-assemblies": "Tie Rod Assemblies",
  "steering-racks": "Steering Racks",
  "power-steering-pumps": "Power Steering Pumps",
  "steering-columns": "Steering Columns",
  "steering-hoses": "Steering Hoses",
  // ── Transmission ────────────────────────────────────────────────────────
  "clutch-kits": "Clutch Kits",
  "drive-shafts": "Drive Shafts",
  "cv-joints": "CV Joints",
  flywheels: "Flywheels",
  "differential-parts": "Differential Parts",
  "transmission-gaskets": "Transmission Gaskets & Seals",
  propshafts: "Propshafts",
  // ── Fuel System ─────────────────────────────────────────────────────────
  "injector-nozzles": "Injector Nozzles",
  "fuel-pumps": "Fuel Pumps",
  "fuel-tanks": "Fuel Tanks",
  "fuel-lines-hoses": "Fuel Lines & Hoses",
  "high-pressure-pumps": "High Pressure Pumps",
  "fuel-pressure-regulators": "Fuel Pressure Regulators",
  "carburettor-parts": "Carburettor Parts",
};

/** Arabic display names for subcategory slugs */
const SLUG_TO_NAME_AR: Record<string, string> = {
  // Brakes
  "brake-pads": "تيل الفرامل",
  "brake-discs": "أقراص الفرامل",
  "brake-calipers": "قلاوظات الفرامل",
  "brake-drums": "طبول الفرامل",
  "brake-shoes": "أحذية الفرامل",
  "abs-sensors": "حساسات ABS",
  "brake-master-cylinders": "أسطوانة الفرامل الرئيسية",
  "brake-hoses": "خراطيم الفرامل",
  "brake-boosters": "معززات الفرامل",
  "brake-lines": "خطوط الفرامل",
  "parking-brake-cables": "كابلات فرامل الانتظار",
  "handbrake-parts": "أجزاء فرامل اليد",
  "splash-guards": "واقيات الرذاذ",
  "brake-system-accessories": "إكسسوارات الفرامل",
  "brake-pad-wear-indicators": "مؤشرات تآكل الفرامل",
  "caliper-parts": "أجزاء قلاوظ الفرامل",
  "wheel-brake-cylinders": "أسطوانات فرامل العجلة",
  "drum-brake-parts": "أجزاء فرامل الطبل",
  "brake-line-fittings": "تركيبات خطوط الفرامل",
  "brake-power-regulator": "منظم قوة الفرامل",
  "brake-vacuum-pumps": "مضخات تفريغ الفرامل",
  // Filters
  "oil-filters": "فلاتر الزيت",
  "air-filters": "فلاتر الهواء",
  "cabin-air-filters": "فلاتر هواء الكابينة",
  "fuel-filters": "فلاتر الوقود",
  "filter-sets": "مجموعات الفلاتر",
  "hydraulic-filters": "فلاتر هيدروليكية",
  "coolant-filters": "فلاتر سائل التبريد",
  "power-steering-filters": "فلاتر التوجيه المعزز",
  // Suspension
  "shock-absorbers": "مساعدات",
  "coil-springs": "زنبركات",
  "wheel-bearings": "تحميل العجلة",
  "wheel-hubs": "مراكز العجلة",
  "control-arms": "ذراع التعليق",
  "ball-joints": "كرة التوجيه",
  "suspension-bushings": "بوشيات التعليق",
  "strut-bearings": "تحميل الدعامة",
  "strut-boots": "أغطية الدعامة",
  "sway-bar-links": "وصلات بار الاستقرار",
  "air-springs": "وسادات هوائية",
  "leaf-springs": "زنبرك ورقي",
  "wheel-nuts-bolts": "صواميل وبراغي العجلة",
  stabilizers: "أجهزة تثبيت",
  "spring-caps": "أغطية الزنبرك",
  "pitman-arms": "ذراع بيتمان",
  "steering-knuckles": "مفصل التوجيه",
  "stub-axles": "محاور قصيرة",
  "suspension-repair-kits": "طقم إصلاح التعليق",
  "wheel-spacers": "فواصل العجلات",
  // Steering
  "tie-rod-ends": "نهايات ذراع التوجيه",
  "tie-rod-assemblies": "تجميعات ذراع التوجيه",
  "steering-racks": "رف التوجيه",
  "power-steering-pumps": "مضخة التوجيه المعزز",
  "rack-bellows": "أغطية رف التوجيه",
  "steering-arms": "أذرعة التوجيه",
  "steering-hoses": "خراطيم التوجيه",
  "steering-columns": "عمود التوجيه",
  "steering-dampers": "مخففات التوجيه",
  "power-steering-tanks": "خزان التوجيه المعزز",
  "steering-locks": "قفل التوجيه",
  "rack-mountings": "تثبيت رف التوجيه",
  // Wipers
  "wiper-blades": "أوراق المساحات",
  "wiper-motors": "موتور المساحة",
  "washer-pumps": "مضخة غسيل الزجاج",
  "wiper-linkage": "تجميعة رابط المساحة",
  "headlight-washers": "مضخات غسيل المصابيح",
  "wiper-arms": "أذرعة المساحات",
  "washer-nozzles": "فوهات سائل الغسيل",
  "washer-tanks": "خزانات سائل الغسيل",
  // Engine
  "timing-belt-kits": "طقم سير التوقيت",
  "gaskets-seals": "جوانات وأختام المحرك",
  "timing-chain-sets": "طقم سلسلة التوقيت",
  "throttle-bodies": "جسم الخانق",
  "engine-belts-chains": "سيور وسلاسل المحرك",
  "tensioners-pulleys": "شادات وبكرات",
  turbochargers: "تيربو",
  "turbo-hoses": "خراطيم التيربو",
  "turbo-parts": "أجزاء التيربو",
  "cylinder-head-parts": "أجزاء رأس الأسطوانة",
  "engine-block": "كتلة المحرك والعمود المرفقي",
  "engine-lubrication": "تشحيم المحرك",
  "egr-system": "نظام EGR",
  "intake-manifolds": "مشعب السحب",
  "air-supply-hoses": "خراطيم إمداد الهواء",
  "engine-mountings": "تثبيتات المحرك",
  "accelerator-cables": "كابلات الوقود",
  "idle-control-valves": "صمامات التحكم في الخمول",
  // Electrical
  alternators: "دينامو",
  starters: "مارش",
  "spark-plugs": "بوجيهات",
  "glow-plugs": "شمعات التسخين",
  "ignition-coils": "ملفات الإشعال",
  sensors: "حساسات",
  switches: "مفاتيح",
  "control-units": "وحدات التحكم",
  "alternator-clutches": "كلتش الدينامو",
  "spark-plug-wires": "أسلاك البوجيه",
  "ignition-distributor": "أجزاء الدلكو",
  "alternator-parts": "أجزاء الدينامو",
  "alternator-regulators": "منظمات الدينامو",
  "starter-parts": "أجزاء المارش",
  "solenoid-switches": "مفاتيح سولينويد",
  "air-horns": "أبواق هوائية",
  harnesses: "أحزمة الكابلات",
  "airbag-clock-springs": "زنبركات ساعة الوسادة الهوائية",
  // Exhaust
  silencers: "كاتم الصوت",
  "exhaust-pipes": "ماسورة العادم",
  "catalytic-converters": "محول حفاز",
  "exhaust-manifolds": "مشعب العادم",
  dpf: "فلتر الجسيمات الديزل",
  "lambda-sensors": "حساسات لامبدا",
  "exhaust-gaskets": "جوانات العادم",
  "exhaust-mountings": "تثبيتات العادم",
  "exhaust-sensors": "حساسات نظام العادم",
  "exhaust-valves": "صمامات نظام العادم",
  // Cooling
  "water-pumps": "طلمبات الماء",
  radiators: "رادياتير",
  thermostats: "ترموستات",
  "radiator-hoses": "خراطيم الرادياتير",
  "radiator-fans": "مراوح الرادياتير",
  intercoolers: "انتركولر",
  "expansion-tanks": "خزانات تمدد سائل التبريد",
  antifreeze: "سائل مضاد للتجمد",
  "cooling-sensors": "حساسات نظام التبريد",
  "radiator-mountings": "تثبيتات الرادياتير",
  "oil-cooler": "مبرد الزيت",
  "coolant-flanges": "فلنجات سائل التبريد",
  "cooling-gaskets": "جوانات نظام التبريد",
  "water-pump-pulleys": "بكرات طلمبة الماء",
  // HVAC
  "ac-compressors": "ضاغط التكييف",
  "ac-condensers": "مكثف التكييف",
  "ac-dryers": "مجفف التكييف",
  "blower-motors": "موتور مروحة التدفئة",
  "heater-cores": "قلب المدفأة",
  "heater-hoses": "خراطيم المدفأة",
  "parking-heaters": "سخانات الانتظار",
  evaporators: "مبخر التكييف",
  "ac-hoses-pipes": "خراطيم وأنابيب التكييف",
  "ac-relays": "ريليهات التكييف",
  "ac-switches": "مفاتيح ومحركات التكييف",
  "temp-sensors": "حساسات الحرارة",
  "ac-control-units": "وحدات تحكم التكييف",
  "heater-control-units": "وحدات تحكم التدفئة",
  // Transmission
  "clutch-kits": "طقم الكلتش",
  "drive-shafts": "أعمدة الدفع",
  flywheels: "عجلة الحدافة",
  "cv-joints": "مفاصل CV",
  "cv-boots": "أغطية CV",
  "clutch-parts": "أجزاء الكلتش المفردة",
  "transmission-oil-kits": "طقم تغيير زيت ناقل الحركة",
  "universal-joints": "مفاصل عالمية ومرنة",
  "transmission-gaskets": "جوانات وأختام ناقل الحركة",
  propshafts: "أعمدة الإدارة",
  "propshaft-bearings": "تحميل منتصف عمود الإدارة",
  "clutch-master-cylinders": "أسطوانة الكلتش الرئيسية",
  "gear-selector-rods": "قضبان اختيار التروس",
  "transmission-mountings": "تثبيتات ناقل الحركة",
  "transmission-oil-coolers": "مبردات زيت ناقل الحركة",
  "differential-parts": "أجزاء الديفرنسيال",
  // Body
  "door-handles-locks": "مقابض وأقفال الأبواب",
  "window-lifts": "رافعات الزجاج",
  "gas-springs": "زنبركات غازية",
  "bumper-parts": "أجزاء البامبر",
  fenders: "رفرفات",
  mirrors: "مرايا",
  mudguards: "واقيات الطين",
  "interior-parts": "أجزاء الداخلية",
  "front-grilles": "شبكات أمامية",
  "door-parts": "أجزاء الباب",
  "bonnet-parts": "كبوت وأجزاؤه",
  "tailgate-lift-motor": "موتور رفع الصندوق الخلفي",
  "trim-strips": "أشرطة زينة وحماية",
  "floor-panels": "ألواح الأرضية",
  "window-seals": "أختام النوافذ",
  "license-plate-holders": "حوامل لوحات الترخيص",
  "engine-covers": "أغطية المحرك",
  "seat-adjustment-parts": "أجزاء ضبط المقاعد",
  antennas: "هوائيات",
  // Lighting
  "tail-lights": "مصابيح خلفية",
  headlights: "مصابيح أمامية",
  "headlight-parts": "أجزاء المصابيح الأمامية",
  "tail-light-parts": "أجزاء المصابيح الخلفية",
  "car-bulbs": "لمبات السيارة",
  "turn-signal-lights": "مصابيح الإشارة",
  "lighting-switches": "مفاتيح الإضاءة",
  "front-fog-lights": "مصابيح الضباب الأمامية",
  "rear-fog-lights": "مصابيح الضباب الخلفية",
  "license-plate-lights": "مصابيح لوحة الترخيص",
  "reverse-lights": "مصابيح الرجوع",
  "daytime-running-lights": "مصابيح النهار",
  "stop-lights": "مصابيح الوقوف",
  // Oils & Fluids
  "engine-oil": "زيت المحرك",
  "coolant-antifreeze": "سائل تبريد / مضاد تجمد",
  "brake-fluid": "سائل الفرامل",
  "transmission-fluid": "سائل ناقل الحركة",
  "power-steering-fluid": "سائل التوجيه المعزز",
  "washer-fluid": "سائل غسيل الزجاج",
  // Fuel System
  "injector-nozzles": "فوهات الحاقن",
  "injector-parts": "أجزاء الحاقن",
  "fuel-pumps": "مضخات الوقود",
  "fuel-gaskets": "جوانات نظام الوقود",
  "fuel-tanks": "خزانات الوقود",
  "high-pressure-pumps": "مضخات ضغط عالي",
  "fuel-lines-hoses": "خطوط وخراطيم الوقود",
  "fuel-valves": "صمامات نظام الوقود",
  "fuel-pressure-regulators": "منظمات ضغط الوقود",
  "carburettor-parts": "أجزاء الكاربريتر",
  "water-in-fuel-sensors": "حساسات الماء في الوقود",
  "air-injection-pumps": "مضخات حقن هواء ثانوي",
};

/** Arabic display names for category slugs */
const SLUG_TO_CAT_AR: Record<string, string> = {
  "brake-system": "نظام الفرامل",
  filters: "الفلاتر",
  suspension: "نظام التعليق",
  steering: "نظام التوجيه",
  "wipers-washers": "المساحات والغسيل",
  "engine-parts": "قطع المحرك",
  "fuel-system": "نظام الوقود",
  "exhaust-system": "نظام العادم",
  "electric-system": "النظام الكهربائي",
  "engine-cooling": "تبريد المحرك",
  "heating-ventilation": "التدفئة والتهوية",
  "transmission-clutch": "ناقل الحركة والكلتش",
  "car-body-interior": "هيكل السيارة والداخلية",
  lighting: "الإضاءة",
  "oils-fluids": "الزيوت والسوائل",
  "accessories-equipment": "الإكسسوارات والمعدات",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, category, slug } = await params;
  const locale = (lang === "ar" ? "ar" : "en") as "en" | "ar";
  const name = slug.replace(/-/g, " ");
  const isAr = locale === "ar";
  return generateSeoMeta({
    title: isAr
      ? `${name} — قطع غيار متوافقة في مصر`
      : `${name} — Compatible Parts in Egypt`,
    description: isAr
      ? `اشتر ${name} من بائعين معتمدين في مصر. توافق معتمد OEM. توصيل سريع.`
      : `Buy ${name} from verified vendors in Egypt. OEM compatibility guaranteed. Fast delivery.`,
    path: `/${locale}/parts/${category}/${slug}`,
    locale,
  });
}

const MOCK_PARTS: Part[] = []; // eslint-disable-line @typescript-eslint/no-unused-vars

export default async function ProductListPage({ params }: Props) {
  const { lang, category, slug } = await params;
  const isAr = lang === "ar";

  const supabase = await createClient();

  // Resolve exact DB values using the slug→name maps (avoids ilike mismatches)
  const categoryTerm = SLUG_TO_CAT[category] ?? category.replace(/-/g, " ");
  const subcategoryTerm = SLUG_TO_SUB[slug] ?? slug.replace(/-/g, " ");

  // Subcategory-specific query — exact match on both category and subcategory
  const { data: products } = await supabase
    .from("products")
    .select(
      "*, vendor:vendors(business_name, rating, city), product_vehicles(make, model, year_from, year_to)",
    )
    .eq("active", true)
    .eq("category", categoryTerm)
    .eq("subcategory", subcategoryTerm)
    .order("created_at", { ascending: false })
    .limit(60);

  // No products for this subcategory → real 404 (prevents Google soft 404)
  if (!products || products.length === 0) {
    notFound();
  }

  const parts: Part[] = (
    (products ?? []) as unknown as ProductWithVendor[]
  ).map(mapProductToPart);

  const displayName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const displayNameAr = SLUG_TO_NAME_AR[slug] ?? displayName;
  const categoryNameAr =
    SLUG_TO_CAT_AR[category] ??
    category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const categoryNameEn = category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${lang}`}>{isAr ? "الرئيسية" : "Home"}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${lang}/parts`}>
                    {isAr ? "متجر القطع" : "Parts Shop"}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href={`/${lang}/parts/${category}`}
                    className="capitalize"
                  >
                    {isAr ? categoryNameAr : categoryNameEn}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {isAr ? displayNameAr : displayName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-black mb-1">
            {isAr ? displayNameAr : displayName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isAr
              ? `${parts.length.toLocaleString("ar-EG")} قطعة متاحة`
              : `${parts.length} parts available`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <PartsListingClient
          parts={parts}
          categorySlug={category}
          subcategorySlug={slug}
        />
      </div>
    </div>
  );
}
