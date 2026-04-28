-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO PARTS CATALOG — SEED DATA
-- Example product: SKF VKMC 03316 (Timing Belt Kit with Water Pump)
-- Run AFTER catalog_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.catalog_products
  (id, slug, name, brand, manufacturer, manufacturer_part_number, ean,
   brand_class, category, description)
values
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'skf-vkmc-03316',
    'Timing Belt Kit with Water Pump',
    'SKF',
    'SKF',
    'VKMC 03316',
    '7316576060069',
    'Premium',
    'Timing Belt',
    'Complete timing belt kit including water pump for Alfa Romeo, Fiat and Lancia '
    '1.9 JTDM diesel engines. SKF Premium quality with OE-equivalent fit and performance.'
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- SPECIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.product_specifications
  (product_id, spec_name, spec_value, sort_order)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Shape',                         'Oval',                         1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Belt Width [mm]',               '25.4',                         2),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Number of Teeth',               '141',                          3),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Pulleys',                       'with crankshaft pulley',       4),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Belts',                         'with rounded tooth profile',   5),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Water pump impeller material',  'Plastic',                      6),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Number of bolts/screws',        '1',                            7),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Supplementary Article',         'with gaskets/seals',           8);


-- ─────────────────────────────────────────────────────────────────────────────
-- COMPATIBLE VEHICLES
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.compatible_vehicles
  (product_id, make, model, generation, engine, engine_code, fuel_type,
   power_hp, power_kw, engine_displacement_cc, body_type, year_from, year_to)
values
  -- Alfa Romeo 159
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Alfa Romeo', '159', '939', '1.9 JTDM', '939A2000',
   'Diesel', 150, 110, 1910, 'Saloon', 2005, 2011),

  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Alfa Romeo', '159', '939', '1.9 JTDM 16V', '939A3000',
   'Diesel', 120, 88, 1910, 'Saloon', 2005, 2011),

  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Alfa Romeo', '159 Sportwagon', '939', '1.9 JTDM', '939A2000',
   'Diesel', 150, 110, 1910, 'Estate', 2006, 2011),

  -- Alfa Romeo Brera
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Alfa Romeo', 'Brera', '939', '1.9 JTDM', '939A2000',
   'Diesel', 150, 110, 1910, 'Coupe', 2006, 2010),

  -- Alfa Romeo Spider
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Alfa Romeo', 'Spider', '939', '1.9 JTDM', '939A2000',
   'Diesel', 150, 110, 1910, 'Convertible', 2006, 2010),

  -- Fiat Croma
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Fiat', 'Croma', '194', '1.9 D Multijet', '939A2000',
   'Diesel', 150, 110, 1910, 'MPV', 2005, 2011),

  -- Lancia Delta
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Lancia', 'Delta', '844', '1.9 D Multijet', '939A2000',
   'Diesel', 150, 110, 1910, 'Hatchback', 2008, 2014);


-- ─────────────────────────────────────────────────────────────────────────────
-- OE NUMBERS
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.oe_numbers
  (product_id, manufacturer, oe_number)
values
  -- Alfa Romeo
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ALFA ROMEO', '9467643789'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ALFA ROMEO', '9467644089'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ALFA ROMEO', '71775923'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ALFA ROMEO', '9467618089'),

  -- Airtex
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AIRTEX', 'WPK 167802'),

  -- Fiat
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FIAT', '55192843'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FIAT', '71775923'),

  -- Gates (aftermarket cross-ref)
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'GATES', 'KP15631XS'),

  -- Dayco
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'DAYCO', 'KTBWP4830');
