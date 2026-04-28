/**
 * Supported governorates and their districts/areas.
 * All address pickers across the app draw from this single source of truth.
 */

export const GOVERNORATES = ["Cairo", "Giza"] as const;
export type Governorate = (typeof GOVERNORATES)[number];

export const AREAS: Record<Governorate, string[]> = {
  Cairo: [
    "Downtown Cairo",
    "Heliopolis",
    "Nasr City",
    "New Cairo",
    "5th Settlement",
    "Maadi",
    "Zamalek",
    "Garden City",
    "Ain Shams",
    "Shubra",
    "Helwan",
    "Mokattam",
    "Manial",
    "Abbassia",
    "Matareya",
    "El Marg",
    "Badr City",
    "Rehab City",
    "Shorouk City",
    "El Obour City",
  ],
  Giza: [
    "Mohandessin",
    "Dokki",
    "Agouza",
    "6th of October",
    "Sheikh Zayed",
    "Haram",
    "Faisal",
    "Imbaba",
    "Boulaq El Dakrour",
    "Omraneya",
    "Hadayek El Ahram",
  ],
};

// ── Arabic translations ────────────────────────────────────────────────────

export const GOVERNORATE_AR: Record<string, string> = {
  Cairo: "القاهرة",
  Giza: "الجيزة",
  Alexandria: "الإسكندرية",
  "New Cairo": "القاهرة الجديدة",
  "6th of October": "السادس من أكتوبر",
};

export const AREA_AR: Record<string, string> = {
  // Cairo
  "Downtown Cairo": "وسط البلد",
  Heliopolis: "مصر الجديدة",
  "Nasr City": "مدينة نصر",
  "New Cairo": "القاهرة الجديدة",
  "5th Settlement": "التجمع الخامس",
  Maadi: "المعادي",
  Zamalek: "الزمالك",
  "Garden City": "جاردن سيتي",
  "Ain Shams": "عين شمس",
  Shubra: "شبرا",
  Helwan: "حلوان",
  Mokattam: "المقطم",
  Manial: "المنيل",
  Abbassia: "العباسية",
  Matareya: "المطرية",
  "El Marg": "المرج",
  "Badr City": "مدينة بدر",
  "Rehab City": "مدينة الرحاب",
  "Shorouk City": "مدينة الشروق",
  "El Obour City": "مدينة العبور",
  // Extra Cairo districts
  "El Salam": "السلام",
  Sheraton: "شيراتون",
  // Giza
  Mohandessin: "المهندسين",
  Dokki: "الدقي",
  Agouza: "العجوزة",
  "6th of October": "السادس من أكتوبر",
  "Sheikh Zayed": "الشيخ زايد",
  Haram: "الهرم",
  Faisal: "فيصل",
  Imbaba: "إمبابة",
  "Boulaq El Dakrour": "بولاق الدكرور",
  Omraneya: "عمرانية",
  "Hadayek El Ahram": "حدائق الأهرام",
  // Alexandria
  Miami: "ميامي",
  "San Stefano": "سان ستيفانو",
  Smouha: "سموحة",
  Roushdy: "رشدي",
  "Sidi Bishr": "سيدي بشر",
  Sporting: "سبورتنج",
  Montazah: "المنتزه",
  Maamoura: "المعمورة",
  Gleem: "جليم",
  Azarita: "الأزاريطة",
  "El Raml": "الرمل",
  // New Cairo
  "Third Settlement": "التجمع الثالث",
  Madinaty: "مدينتي",
  // 6th of October
  "Dream Land": "دريم لاند",
  Juhayna: "جهينة",
  "Hadayek October": "حدائق أكتوبر",
};

/** Returns the localised label for a governorate. Falls back to the English key. */
export function tGov(gov: string, locale: string): string {
  return locale === "ar" ? (GOVERNORATE_AR[gov] ?? gov) : gov;
}

/** Returns the localised label for an area/district. Falls back to the English key. */
export function tArea(area: string, locale: string): string {
  return locale === "ar" ? (AREA_AR[area] ?? area) : area;
}

/** Returns the area list for a given governorate string (empty array if not found). */
export function getAreas(governorate: string): string[] {
  return (AREAS as Record<string, string[]>)[governorate] ?? [];
}
