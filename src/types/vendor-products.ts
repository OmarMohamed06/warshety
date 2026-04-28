/**
 * Vendor product management types.
 * Tables: vendor_products, vendor_product_images, product_vehicles, product_oe_numbers
 *
 * These are separate from the old `DbProduct` marketplace table and the
 * catalog_products TecDoc-style table. This is the vendor-side management
 * system where sellers create and maintain their product listings.
 */

// ── Database row types ────────────────────────────────────────────────────────

export interface VendorProduct {
  id: string;
  vendor_id: string;
  name: string;
  name_en: string | null;
  name_ar: string | null;
  brand: string | null;
  manufacturer: string | null;
  manufacturer_part_number: string | null;
  part_number: string | null;
  ean: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  condition: "new" | "used" | null;
  part_type: PartType | null;
  make: string | null;
  model: string | null;
  year_from: number | null;
  year_to: number | null;
  price: number;
  discount_percent: number;
  /** DB-computed: price * (1 - discount_percent/100). Always use this as the selling price. */
  effective_price: number;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface VendorProductImage {
  id: string;
  product_id: string;
  image_url: string;
  position: number;
}

export interface ProductVehicle {
  id: string;
  product_id: string;
  make: string | null;
  model: string | null;
  engine: string | null;
  fuel_type: string | null;
  power_hp: number | null;
  year_from: number | null;
  year_to: number | null;
}

export interface ProductOeNumber {
  id: string;
  product_id: string;
  manufacturer: string | null;
  oe_number: string | null;
}

/** Lightweight form row used when editing OE numbers in the UI */
export interface OeNumberFormRow {
  _key: string;
  manufacturer: string;
  oe_number: string;
}

/** Full product with all related data joined */
export interface VendorProductFull extends VendorProduct {
  images: VendorProductImage[];
  vehicles: ProductVehicle[];
  oe_numbers: ProductOeNumber[];
}

// ── Form state types ──────────────────────────────────────────────────────────

export type PartType = "oem" | "aftermarket" | "original";

export const PART_TYPES: {
  value: PartType;
  label: string;
  description: string;
}[] = [
  {
    value: "oem",
    label: "OEM",
    description: "Original Equipment Manufacturer — matches factory spec",
  },
  {
    value: "original",
    label: "Original",
    description: "Genuine part from the car brand",
  },
  {
    value: "aftermarket",
    label: "Aftermarket",
    description: "Third-party replacement part",
  },
];

export interface ProductFormData {
  name_en: string;
  name_ar: string;
  brand: string;
  part_number: string;
  category: string;
  subcategory: string;
  description: string;
  condition: string;
  part_type: string;
}

export interface PricingFormData {
  price: string;
  discount_percent: string;
  // stock_quantity is the 3rd field below
  stock_quantity: string;
}

export interface VehicleFormRow {
  _key: string; // local-only React key
  make: string;
  model: string;
  engine: string;
  fuel_type: string;
  power_hp: string;
  year_from: string;
  year_to: string;
}

// ── Wizard state ──────────────────────────────────────────────────────────────

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  productInfo: ProductFormData;
  pricing: PricingFormData;
  vehicles: VehicleFormRow[];
  imageFiles: File[];
  submitting: boolean;
  error: string | null;
}

export const PRODUCT_CATEGORIES = [
  "Brakes",
  "Engine",
  "Filters",
  "Suspension",
  "Electrical",
  "Exhaust",
  "Transmission",
  "Cooling",
  "Steering",
  "Body Parts",
  "Lighting",
  "Fuel System",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Per-category subcategory lists — names match the public parts catalog */
export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  Brakes: [
    "Brake Pads",
    "Brake Discs",
    "Brake Calipers",
    "Brake Drums",
    "Brake Shoes",
    "ABS Sensors & Rings",
    "Brake Master Cylinders",
    "Brake Hoses",
    "Brake Boosters",
    "Brake Lines",
    "Parking Brake Cables",
    "Handbrake Parts",
    "Splash Guards",
  ],
  Filters: [
    "Oil Filters",
    "Air Filters",
    "Cabin Air Filters",
    "Fuel Filters",
    "Filter Sets",
  ],
  Suspension: [
    "Shock Absorbers",
    "Coil Springs",
    "Wheel Bearings",
    "Wheel Hubs",
    "Control Arms",
    "Ball Joints",
    "Suspension Bushings",
    "Strut Bearings & Mounts",
    "Sway Bar Links",
    "Air Springs",
    "Leaf Springs",
  ],
  Engine: [
    "Timing Belt Kits",
    "Engine Gaskets & Seals",
    "Timing Chain Sets",
    "Turbochargers",
    "Engine Mountings",
    "Throttle Bodies",
    "Cylinder Head Parts",
    "Engine Lubrication",
    "EGR System",
    "Intake Manifolds",
  ],
  Electrical: [
    "Alternators",
    "Starters",
    "Batteries",
    "Spark Plugs",
    "Glow Plugs",
    "Ignition Coils",
    "Sensors",
    "Switches",
    "Control Units",
    "Alternator Parts",
  ],
  Exhaust: [
    "Silencers",
    "Exhaust Pipes",
    "Catalytic Converters",
    "Exhaust Manifolds",
    "Diesel Particulate Filters (DPF)",
    "Lambda Sensors",
    "Exhaust Gaskets",
  ],
  Transmission: [
    "Clutch Kits",
    "Drive Shafts",
    "CV Joints",
    "Flywheels",
    "Differential Parts",
    "Transmission Gaskets & Seals",
    "Propshafts",
  ],
  Cooling: [
    "Water Pumps",
    "Cooling Radiators",
    "Thermostats",
    "Radiator Hoses & Pipes",
    "Radiator Fans",
    "Intercoolers",
    "Coolant Expansion Tanks",
  ],
  Steering: [
    "Tie Rod Ends",
    "Tie Rod Assemblies",
    "Steering Racks",
    "Power Steering Pumps",
    "Steering Columns",
    "Steering Hoses",
  ],
  "Body Parts": [
    "Bumper Parts",
    "Mirrors",
    "Fenders",
    "Front Grilles",
    "Door Parts",
    "Bonnet Parts",
    "Door Handles & Locks",
    "Window Lifts",
    "Interior Parts",
  ],
  Lighting: [
    "Headlights",
    "Taillights",
    "Fog Lights",
    "Indicators",
    "Bulbs",
    "Interior Lights",
  ],
  "Fuel System": [
    "Injector Nozzles",
    "Fuel Pumps",
    "Fuel Tanks",
    "Fuel Lines & Hoses",
    "High Pressure Pumps",
    "Fuel Pressure Regulators",
    "Carburettor Parts",
  ],
  Other: [],
};

export const FUEL_TYPES = [
  "Petrol",
  "Diesel",
  "Hybrid",
  "Electric",
  "LPG",
  "CNG",
] as const;
