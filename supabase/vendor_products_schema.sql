-- ─────────────────────────────────────────────────────────────────────────────
-- Vendor Product Management System (v2)
-- Run AFTER schema.sql and catalog_schema.sql in Supabase SQL Editor.
--
-- Tables:
--   vendor_products        — richer product record owned by a vendor
--   vendor_product_images  — one-to-many images per product
--   product_vehicles       — compatible vehicle fitment rows
--   product_oe_numbers     — OE / cross-reference numbers per manufacturer
-- ─────────────────────────────────────────────────────────────────────────────

-- ── vendor_products ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_products (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id                uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  name                     text NOT NULL,
  brand                    text,
  manufacturer             text,
  manufacturer_part_number text,
  ean                      text,
  category                 text,
  subcategory              text,
  description              text,
  price                    numeric(10, 2) NOT NULL DEFAULT 0,
  stock_quantity           integer        NOT NULL DEFAULT 0,
  created_at               timestamptz    NOT NULL DEFAULT now(),
  updated_at               timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE vendor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own products"
  ON vendor_products FOR SELECT USING (vendor_id = auth.uid());

CREATE POLICY "Vendors insert own products"
  ON vendor_products FOR INSERT WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors update own products"
  ON vendor_products FOR UPDATE USING (vendor_id = auth.uid());

CREATE POLICY "Vendors delete own products"
  ON vendor_products FOR DELETE USING (vendor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor_id
  ON vendor_products (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_products_category
  ON vendor_products (category);

-- ── vendor_product_images ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_product_images (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid    REFERENCES vendor_products(id) ON DELETE CASCADE NOT NULL,
  image_url  text    NOT NULL,
  position   integer NOT NULL DEFAULT 0
);

ALTER TABLE vendor_product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images"
  ON vendor_product_images FOR SELECT USING (true);

CREATE POLICY "Vendor inserts images for own products"
  ON vendor_product_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_products
      WHERE id = vendor_product_images.product_id
        AND vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendor deletes images for own products"
  ON vendor_product_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vendor_products
      WHERE id = vendor_product_images.product_id
        AND vendor_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_vendor_product_images_product_id
  ON vendor_product_images (product_id);

-- ── product_vehicles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_vehicles (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid    REFERENCES vendor_products(id) ON DELETE CASCADE NOT NULL,
  make       text,
  model      text,
  engine     text,
  fuel_type  text,
  power_hp   integer,
  year_from  integer,
  year_to    integer
);

ALTER TABLE product_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product vehicles"
  ON product_vehicles FOR SELECT USING (true);

CREATE POLICY "Vendor manages own product vehicles"
  ON product_vehicles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vendor_products
      WHERE id = product_vehicles.product_id
        AND vendor_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_product_vehicles_product_id
  ON product_vehicles (product_id);

-- ── product_oe_numbers ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_oe_numbers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid REFERENCES vendor_products(id) ON DELETE CASCADE NOT NULL,
  manufacturer text,
  oe_number    text
);

ALTER TABLE product_oe_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view OE numbers"
  ON product_oe_numbers FOR SELECT USING (true);

CREATE POLICY "Vendor manages own OE numbers"
  ON product_oe_numbers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vendor_products
      WHERE id = product_oe_numbers.product_id
        AND vendor_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_product_oe_numbers_product_id
  ON product_oe_numbers (product_id);

-- ── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_vendor_products_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendor_products_updated_at
  BEFORE UPDATE ON vendor_products
  FOR EACH ROW EXECUTE FUNCTION update_vendor_products_updated_at();

-- ── Supabase Storage bucket for product images ───────────────────────────────
-- Run separately in the Storage tab, or uncomment if using the CLI:
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('product-images', 'product-images', true)
--   ON CONFLICT (id) DO NOTHING;
