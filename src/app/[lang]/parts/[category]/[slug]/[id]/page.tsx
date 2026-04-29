import type { Metadata } from "next";
import Link from "next/link";
import { productPageSeo, generateSlugEn } from "@/utils/seo";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import AddToCartButton from "@/components/parts/AddToCartButton";
import { CompatibleVehiclesTable } from "@/components/parts/catalog/CompatibleVehiclesTable";
import { OENumbersList } from "@/components/parts/catalog/OENumbersList";
import type { DbCompatibleVehicle, DbOeNumber } from "@/types/database";
import en from "@/../messages/en.json";
import ar from "@/../messages/ar.json";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Star, Package, Truck, Car, Wrench } from "lucide-react";
import { ImageGallery } from "@/components/parts/ImageGallery";

interface Props {
  params: Promise<{ lang: string; category: string; slug: string; id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, lang } = await params;
  const locale = (lang === "ar" ? "ar" : "en") as "ar" | "en";
  const supabase = await createClient();
  const supabaseAny2 = supabase as any;
  const { data: product } = await supabaseAny2
    .from("products")
    .select("name, brand, image_url")
    .or(`id.eq.${id},slug.eq.${id}`)
    .single();
  if (!product) {
    return {
      title:
        locale === "ar"
          ? "القطعة غير موجودة | ورشتي"
          : "Part Not Found | Warshety",
    };
  }
  return productPageSeo({
    partName: product.name,
    brand: product.brand ?? "Unknown",
    imageUrl: product.image_url,
    slugEn: generateSlugEn(`${product.name}-${product.brand ?? ""}-${id}`),
    locale,
  });
}

export default async function PartDetailPage({ params }: Props) {
  const { category, slug, id, lang } = await params;
  const isAr = lang === "ar";
  const messages = lang === "ar" ? ar : en;
  const t = (key: string) => {
    const parts = key.split(".");
    let val: unknown = messages;
    for (const p of parts) val = (val as Record<string, unknown>)?.[p];
    return typeof val === "string" ? val : key;
  };

  // ── Display names for breadcrumb ────────────────────────────────────────
  const CATEGORY_NAMES_AR: Record<string, string> = {
    "brake-system": "نظام الفرامل",
    filters: "الفلاتر",
    suspension: "نظام التعليق",
    steering: "نظام التوجيه",
    "wipers-washers": "المساحات والغسيل",
    // engine variants
    engine: "قطع المحرك",
    "engine-parts": "قطع المحرك",
    // electrical variants
    electrical: "النظام الكهربائي",
    "electric-system": "النظام الكهربائي",
    // exhaust variants
    exhaust: "نظام العادم",
    "exhaust-system": "نظام العادم",
    // cooling variants
    cooling: "تبريد المحرك",
    "engine-cooling": "تبريد المحرك",
    // transmission variants
    transmission: "ناقل الحركة والكلتش",
    "transmission-clutch": "ناقل الحركة والكلتش",
    // body variants
    "body-parts": "هيكل السيارة والداخلية",
    "car-body-interior": "هيكل السيارة والداخلية",
    "heating-ventilation": "التدفئة والتهوية",
    lighting: "الإضاءة",
    "oils-fluids": "الزيوت والسوائل",
    "fuel-system": "نظام الوقود",
    "accessories-equipment": "الإكسسوارات والمعدات",
  };

  const SUBCATEGORY_NAMES_AR: Record<string, string> = {
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

  const categoryDisplayEn = category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const categoryDisplayAr = CATEGORY_NAMES_AR[category] ?? categoryDisplayEn;
  const subcategoryDisplayEn = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const subcategoryDisplayAr =
    SUBCATEGORY_NAMES_AR[slug] ?? subcategoryDisplayEn;

  // ── Resolve product from live DB ────────────────────────────────────────
  type VendorField = {
    id: string;
    business_name: string;
    rating: number;
    total_reviews: number;
    city: string | null;
  };

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  const { data: rawProduct } = (await supabaseAny
    .from("products")
    .select("*, vendor:vendors(id, business_name, rating, total_reviews, city)")
    .or(`id.eq.${id},slug.eq.${id}`)
    .single()) as {
    data:
      | (Record<string, unknown> & {
          id: string;
          vendor_id: string;
          name: string;
          description: string | null;
          price: number;
          original_price: number | null;
          category: string;
          subcategory: string | null;
          part_number: string | null;
          oem_number: string | null;
          brand: string | null;
          condition: "new" | "used" | "refurbished";
          part_type: "oem" | "aftermarket" | "original" | null;
          make: string | null;
          model: string | null;
          year_from: number | null;
          year_to: number | null;
          stock: number;
          image_url: string | null;
          images: string[];
          vendor: unknown;
        })
      | null;
    error: unknown;
  };

  if (!rawProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Part not found.</p>
      </div>
    );
  }

  const vendor = rawProduct.vendor as unknown as VendorField | null;

  // ── Fetch compatible vehicles and OE numbers ─────────────────────────────
  let compatibleVehicles: DbCompatibleVehicle[] = [];
  let oeNumbers: DbOeNumber[] = [];

  const { data: cvData } = await supabaseAny
    .from("product_vehicles")
    .select("*")
    .eq("product_id", id);
  compatibleVehicles = (cvData ?? []) as DbCompatibleVehicle[];
  const { data: oeData } = await supabaseAny
    .from("product_oe_numbers")
    .select("*")
    .eq("product_id", id);
  oeNumbers = (oeData ?? []) as DbOeNumber[];

  // Images are stored in the products.images array
  const uploadedImages: string[] = Array.isArray(rawProduct.images)
    ? (rawProduct.images as string[])
    : [];

  const part = {
    id: rawProduct.id,
    name: rawProduct.name,
    brand: rawProduct.brand ?? "",
    oemNumber: rawProduct.oem_number ?? undefined,
    partNumber: rawProduct.part_number ?? undefined,
    price: rawProduct.price,
    originalPrice: rawProduct.original_price ?? undefined,
    condition: rawProduct.condition,
    partType:
      (rawProduct.part_type as "oem" | "aftermarket" | "original" | null) ??
      undefined,
    make: rawProduct.make ?? undefined,
    model: rawProduct.model ?? undefined,
    yearFrom: rawProduct.year_from ?? undefined,
    yearTo: rawProduct.year_to ?? undefined,
    warrantyMonths: undefined as number | undefined,
    stock: rawProduct.stock,
    deliveryDays: 3 as number | undefined,
    installationAvailable: false,
    images:
      uploadedImages.length > 0
        ? uploadedImages
        : rawProduct.images && rawProduct.images.length > 0
          ? rawProduct.images
          : rawProduct.image_url
            ? [rawProduct.image_url]
            : [],
    description: rawProduct.description ?? "",
    compatibleVehicles: compatibleVehicles.map((v) =>
      [
        v.make,
        v.model,
        v.year_from && v.year_to ? `(${v.year_from}\u2013${v.year_to})` : "",
      ]
        .filter(Boolean)
        .join(" "),
    ),
    vendorName: vendor?.business_name ?? "",
    vendorRating: vendor?.rating ?? 0,
    vendorReviewCount: vendor?.total_reviews ?? 0,
    vendorCity: vendor?.city ?? "Cairo",
    vendorId: rawProduct.vendor_id,
    rating: 0,
    reviewCount: 0,
  };

  return (
    <div className="min-h-screen bg-muted/40" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${lang}`}>{t("parts.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${lang}/parts`}>{t("parts.partsShop")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${lang}/parts/${category}`}
                  className="capitalize"
                >
                  {isAr ? categoryDisplayAr : categoryDisplayEn}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${lang}/parts/${category}/${slug}`}>
                  {isAr ? subcategoryDisplayAr : subcategoryDisplayEn}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[200px]">
                {part.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── Product Identity Card (TecDoc-style header) ─────────────────────── */}
        <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-sm p-6 mb-8">
          {/* Category / subcategory badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
              {isAr ? categoryDisplayAr : categoryDisplayEn}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
              {isAr ? subcategoryDisplayAr : subcategoryDisplayEn}
            </span>
          </div>

          {/* Product name */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2">
            {part.name}
          </h1>

          {/* Description */}
          {part.description && (
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">
              {part.description}
            </p>
          )}

          {/* Part Number — prominent display */}
          {(part.partNumber ?? part.oemNumber) && (
            <div className="inline-flex items-center gap-2 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t("parts.partNumber")}
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                {part.partNumber ?? part.oemNumber}
              </span>
            </div>
          )}

          {/* Identity grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm border-t border-slate-100 dark:border-border pt-5">
            {part.brand && (
              <div>
                <dt className="text-slate-400 dark:text-slate-500 font-medium">
                  {t("parts.brand")}
                </dt>
                <dd className="text-slate-800 dark:text-slate-100 font-semibold mt-0.5">
                  {part.brand}
                </dd>
              </div>
            )}
            {part.condition && (
              <div>
                <dt className="text-slate-400 dark:text-slate-500 font-medium">
                  {t("parts.condition")}
                </dt>
                <dd className="text-slate-800 dark:text-slate-100 font-semibold mt-0.5 capitalize">
                  {part.condition === "new"
                    ? t("parts.new")
                    : part.condition === "used"
                      ? t("parts.used")
                      : t("parts.refurbished")}
                </dd>
              </div>
            )}
            {part.partType && (
              <div>
                <dt className="text-slate-400 dark:text-slate-500 font-medium">
                  {t("parts.partType")}
                </dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                      part.partType === "oem"
                        ? "bg-blue-100 text-blue-700"
                        : part.partType === "original"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {part.partType}
                  </span>
                </dd>
              </div>
            )}
            {part.warrantyMonths && (
              <div>
                <dt className="text-slate-400 dark:text-slate-500 font-medium">
                  {t("parts.warranty")}
                </dt>
                <dd className="text-slate-800 dark:text-slate-100 font-semibold mt-0.5">
                  {t("parts.warrantyMonths").replace(
                    "{count}",
                    String(part.warrantyMonths),
                  )}
                </dd>
              </div>
            )}
          </dl>

          {/* Vehicle compatibility banner */}
          {part.make && part.model && part.yearFrom && part.yearTo && (
            <div className="mt-5 flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: "22px" }}
              >
                directions_car
              </span>
              <div>
                <p className="text-xs font-bold text-primary">
                  {t("parts.fitsLabel")
                    .replace("{make}", part.make!)
                    .replace("{model}", part.model!)
                    .replace("{from}", String(part.yearFrom))
                    .replace("{to}", String(part.yearTo))}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("parts.modelYears")
                    .replace("{from}", String(part.yearFrom))
                    .replace("{to}", String(part.yearTo))}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <ImageGallery images={part.images} alt={part.name} />
          </div>

          {/* Part info */}
          <div className="space-y-6">
            {/* Compact name / brand in commerce column */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {part.brand}
              </p>
              <p className="text-xl font-black leading-snug">{part.name}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-primary fill-primary" />
              ))}
              <span className="font-bold text-sm">{part.rating}</span>
              <span className="text-muted-foreground text-sm">
                (
                {t("parts.reviews").replace(
                  "{count}",
                  String(part.reviewCount),
                )}
                )
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-primary">
                {formatPrice(part.price)}
              </span>
              {part.originalPrice && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(part.originalPrice)}
                  </span>
                  <Badge variant="destructive" className="text-[11px]">
                    -
                    {Math.round(
                      ((part.originalPrice - part.price) / part.originalPrice) *
                        100,
                    )}
                    % OFF
                  </Badge>
                </>
              )}
            </div>

            {/* Stock & delivery */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900/50">
                <Package className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-green-700 dark:text-green-400">
                    {t("parts.inStockLabel")}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {t("parts.unitsLabel").replace(
                      "{count}",
                      String(part.stock),
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                    {t("parts.fastDelivery")}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">
                    {t("parts.deliveryDays").replace(
                      "{count}",
                      String(part.deliveryDays),
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <AddToCartButton
              id={part.id}
              name={part.name}
              vendorName={part.vendorName}
              vendorId={part.vendorId}
              sku={part.partNumber ?? part.oemNumber ?? part.id}
              price={part.price}
              image={part.images?.[0]}
              stock={part.stock}
              compatible={
                compatibleVehicles[0]
                  ? `${compatibleVehicles[0].make} ${compatibleVehicles[0].model}`
                  : undefined
              }
              installationAvailable={part.installationAvailable}
            />

            {/* Vendor info */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{part.vendorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {part.vendorCity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="font-bold text-sm">
                      {part.vendorRating}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({part.vendorReviewCount})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compatible vehicles — rich table when structured data is available */}
        {compatibleVehicles.length > 0 ? (
          <div className="mt-12">
            <CompatibleVehiclesTable
              vehicles={compatibleVehicles}
              productLabel={`${part.brand} ${part.oemNumber ?? part.name}`}
            />
          </div>
        ) : null}

        {/* OE / Cross-reference Numbers */}
        {oeNumbers.length > 0 && (
          <div className="mt-6">
            <OENumbersList
              oeNumbers={oeNumbers}
              productLabel={`${part.brand} ${part.oemNumber ?? part.name}`}
              isAr={lang === "ar"}
            />
          </div>
        )}

        {/* Additional notes / long description */}
        {part.description && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("parts.additionalNotes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {part.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
