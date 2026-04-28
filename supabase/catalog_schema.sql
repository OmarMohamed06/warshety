-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO PARTS CATALOG SCHEMA
-- Run this file AFTER schema.sql in the Supabase SQL editor.
-- Supports millions of parts with dynamic specifications, fitment data,
-- and OE cross-reference numbers.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- CATALOG PRODUCTS
-- Core product identity. Slug is used for SEO-friendly URLs.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.catalog_products (
  id                        uuid primary key default uuid_generate_v4(),
  slug                      text not null unique,
  name                      text not null,
  brand                     text not null,
  manufacturer              text not null,
  manufacturer_part_number  text not null,
  ean                       text,
  brand_class               text,          -- 'Premium' | 'OEM' | 'Aftermarket'
  category                  text not null, -- e.g. 'Timing Belt', 'Brake Pads'
  description               text,
  image_url                 text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.catalog_products is
  'Master catalog of auto parts. One row per SKU. Slug drives the product URL.';

comment on column public.catalog_products.slug is
  'URL-safe identifier, e.g. skf-vkmc-03316. Generated from brand + MPN.';

comment on column public.catalog_products.brand_class is
  'Quality tier: Premium | OEM | Aftermarket.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT SPECIFICATIONS
-- Key-value store for technical attributes. Schema-less by design so any
-- part category (belt, brake pad, shock absorber, spark plug …) can store
-- its own attribute set without changing the database.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.product_specifications (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null
                references public.catalog_products(id) on delete cascade,
  spec_name   text not null,   -- e.g. "Belt Width [mm]"
  spec_value  text not null,   -- e.g. "25.4"
  sort_order  int  not null default 0
);

comment on table public.product_specifications is
  'Dynamic technical attributes per product. Supports any part category.';


-- ─────────────────────────────────────────────────────────────────────────────
-- COMPATIBLE VEHICLES (FITMENT DATA)
-- Each row = one vehicle application for the product.
-- Indexed for fast vehicle-based lookups.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.compatible_vehicles (
  id                      uuid primary key default uuid_generate_v4(),
  product_id              uuid not null
                            references public.catalog_products(id) on delete cascade,
  make                    text not null,   -- e.g. "Alfa Romeo"
  model                   text not null,   -- e.g. "159"
  generation              text,            -- e.g. "939"
  engine                  text,            -- e.g. "1.9 JTDM"
  engine_code             text,            -- e.g. "939A2000"
  fuel_type               text,            -- e.g. "Diesel"
  power_hp                int,
  power_kw                int,
  engine_displacement_cc  int,
  body_type               text,            -- e.g. "Saloon"
  drive_type              text,            -- e.g. "FWD"
  transmission            text,            -- e.g. "Manual"
  year_from               int,
  year_to                 int
);

comment on table public.compatible_vehicles is
  'Vehicle fitment data (applications). Linked to TecDoc-style make/model tree.';


-- ─────────────────────────────────────────────────────────────────────────────
-- OE NUMBERS (CROSS-REFERENCE)
-- Original Equipment numbers from vehicle manufacturers and other suppliers.
-- Multiple OE rows per product, grouped by manufacturer in the UI.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.oe_numbers (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null
                 references public.catalog_products(id) on delete cascade,
  manufacturer text not null,  -- e.g. "ALFA ROMEO"
  oe_number    text not null   -- e.g. "9467643789"
);

comment on table public.oe_numbers is
  'OE cross-reference numbers grouped by vehicle manufacturer or supplier.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Product lookups
create index if not exists idx_catalog_products_slug
  on public.catalog_products(slug);

create index if not exists idx_catalog_products_brand
  on public.catalog_products(brand);

create index if not exists idx_catalog_products_category
  on public.catalog_products(category);

create index if not exists idx_catalog_products_mpn
  on public.catalog_products(manufacturer_part_number);

-- Specification lookups
create index if not exists idx_product_specs_product_id
  on public.product_specifications(product_id);

-- Vehicle fitment lookups (most common: make + model + year range)
create index if not exists idx_compat_vehicles_product_id
  on public.compatible_vehicles(product_id);

create index if not exists idx_compat_vehicles_make_model
  on public.compatible_vehicles(make, model);

create index if not exists idx_compat_vehicles_year_range
  on public.compatible_vehicles(year_from, year_to);

-- OE number cross-reference lookups
create index if not exists idx_oe_numbers_product_id
  on public.oe_numbers(product_id);

create index if not exists idx_oe_numbers_number
  on public.oe_numbers(oe_number);

create index if not exists idx_oe_numbers_manufacturer
  on public.oe_numbers(manufacturer);


-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.catalog_products        enable row level security;
alter table public.product_specifications  enable row level security;
alter table public.compatible_vehicles     enable row level security;
alter table public.oe_numbers              enable row level security;

-- Public read (catalog is publicly browsable)
create policy "Public read catalog_products"
  on public.catalog_products for select using (true);

create policy "Public read product_specifications"
  on public.product_specifications for select using (true);

create policy "Public read compatible_vehicles"
  on public.compatible_vehicles for select using (true);

create policy "Public read oe_numbers"
  on public.oe_numbers for select using (true);

-- Admin write (only admin role can mutate catalog data)
-- Uses the custom JWT claim set in Supabase Auth hooks.
create policy "Admin write catalog_products"
  on public.catalog_products for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin write product_specifications"
  on public.product_specifications for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin write compatible_vehicles"
  on public.compatible_vehicles for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin write oe_numbers"
  on public.oe_numbers for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: updated_at trigger for catalog_products
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_catalog_products_updated_at
  before update on public.catalog_products
  for each row execute procedure public.set_updated_at();
