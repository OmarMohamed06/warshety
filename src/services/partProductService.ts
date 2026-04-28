/**
 * partProductService.ts
 *
 * Server-side service for creating and managing seller car-part products.
 * Implements the createProduct() flow with full validation as per spec.
 */

import { createClient } from "@/lib/supabase/server";
import type { PartType } from "@/types/vendor-products";

// ─────────────────────────────────────────────────────────────────────────────
// Input / Output types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateProductInput {
  // Required
  title: string;
  category: string;
  price: number;
  condition: "new" | "used";
  part_type: PartType;
  brand: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number;
  images: string[]; // minimum 2 URLs

  // Optional
  description?: string;
  part_number?: string;
  oem_number?: string;
  subcategory?: string;
  stock?: number;
}

export interface CreateProductResult {
  success: true;
  productId: string;
}

export interface CreateProductError {
  success: false;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1980;
const MAX_YEAR = CURRENT_YEAR + 1;

const VALID_CONDITIONS = ["new", "used"] as const;
const VALID_PART_TYPES: PartType[] = ["oem", "aftermarket", "original"];

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateInput(input: CreateProductInput): string[] {
  const errors: string[] = [];

  // Required text fields
  if (!input.title?.trim()) errors.push("Title is required.");
  if (!input.category?.trim()) errors.push("Category is required.");
  if (!input.brand?.trim()) errors.push("Brand is required.");
  if (!input.make?.trim()) errors.push("Car make is required.");
  if (!input.model?.trim()) errors.push("Car model is required.");

  // Price
  if (typeof input.price !== "number" || input.price <= 0)
    errors.push("Price must be a positive number.");

  // Condition
  if (!VALID_CONDITIONS.includes(input.condition as "new" | "used"))
    errors.push("Condition must be 'new' or 'used'.");

  // Part type
  if (!VALID_PART_TYPES.includes(input.part_type))
    errors.push("Part type must be 'oem', 'original', or 'aftermarket'.");

  // Year validation
  const yFrom = input.year_from;
  const yTo = input.year_to;

  if (!Number.isInteger(yFrom) || !Number.isInteger(yTo)) {
    errors.push("Year from and year to must be integers.");
  } else {
    if (yFrom < MIN_YEAR)
      errors.push(`Year from must be ${MIN_YEAR} or later.`);
    if (yTo > MAX_YEAR) errors.push(`Year to must be ${MAX_YEAR} or earlier.`);
    if (yFrom > yTo)
      errors.push("Year from must be less than or equal to year to.");
  }

  // Images — minimum 2
  if (!Array.isArray(input.images) || input.images.length < 2)
    errors.push("At least 2 product images are required.");

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalizer — trim strings, standardize casing
// ─────────────────────────────────────────────────────────────────────────────

function normalizeInput(input: CreateProductInput): CreateProductInput {
  return {
    ...input,
    title: input.title.trim(),
    category: input.category.trim(),
    brand: input.brand.trim(),
    make: input.make.trim(),
    model: input.model.trim(),
    description: input.description?.trim() || undefined,
    part_number: input.part_number?.trim() || undefined,
    oem_number: input.oem_number?.trim() || undefined,
    subcategory: input.subcategory?.trim() || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// createProduct — main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new active product listing for a seller.
 *
 * Rules:
 * - All required fields must be present and valid.
 * - year_from >= 1980, year_to <= currentYear+1, year_from <= year_to.
 * - At least 2 images required.
 * - Does NOT require engine, VIN, or trim.
 * - Product is saved with status = "active".
 *
 * @param input  Product data from the seller form.
 * @param sellerId  Authenticated vendor / seller id.
 */
export async function createProduct(
  input: CreateProductInput,
  sellerId: string,
): Promise<CreateProductResult | CreateProductError> {
  // 1. Validate
  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  // 2. Normalize
  const data = normalizeInput(input);

  // 3. Persist
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      vendor_id: sellerId,
      name: data.title,
      brand: data.brand,
      category: data.category,
      subcategory: data.subcategory ?? null,
      description: data.description ?? null,
      price: data.price,
      original_price: null,
      condition: data.condition,
      part_type: data.part_type,
      make: data.make,
      model: data.model,
      year_from: data.year_from,
      year_to: data.year_to,
      oem_number: data.oem_number ?? null,
      part_number: data.part_number ?? null,
      images: data.images,
      image_url: data.images[0],
      stock: data.stock ?? 1,
      active: true,
    })
    .select("id")
    .single();

  if (error || !product) {
    return {
      success: false,
      errors: [error?.message ?? "Failed to save product to database."],
    };
  }

  return { success: true, productId: product.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Year-range filter helper (used in search/listing queries)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if a product's year range includes the given year.
 * year_from and year_to are both inclusive.
 */
export function isYearCompatible(
  yearFrom: number | null,
  yearTo: number | null,
  selectedYear: number,
): boolean {
  if (yearFrom === null || yearTo === null) return true; // no restriction
  return selectedYear >= yearFrom && selectedYear <= yearTo;
}
