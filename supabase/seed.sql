-- ═══════════════════════════════════════════════════════════════════════════
-- GARAGE EGYPT — FULL SEED DATA
-- Run this AFTER schema.sql.
-- Populates all tables so every page has real data immediately.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.categories (id, slug, name, parent_id, type, icon, sort_order) values
  -- ── Parts top-level ────────────────────────────────────────────────────
  ('c0000001-0000-0000-0000-000000000001', 'brake-system',      'Brake System',       null, 'parts', 'minor_crash',       1),
  ('c0000001-0000-0000-0000-000000000002', 'engine-parts',      'Engine Parts',       null, 'parts', 'settings',          2),
  ('c0000001-0000-0000-0000-000000000003', 'filters',           'Filters',            null, 'parts', 'filter_alt',        3),
  ('c0000001-0000-0000-0000-000000000004', 'suspension',        'Suspension & Steering', null, 'parts', 'shutter_speed',  4),
  ('c0000001-0000-0000-0000-000000000005', 'electric-system',   'Electrical System',  null, 'parts', 'bolt',              5),
  ('c0000001-0000-0000-0000-000000000006', 'body-parts',        'Body Parts',         null, 'parts', 'directions_car',    6),
  ('c0000001-0000-0000-0000-000000000007', 'tyres-wheels',      'Tyres & Wheels',     null, 'parts', 'tire_repair',       7),
  ('c0000001-0000-0000-0000-000000000008', 'cooling-system',    'Cooling System',     null, 'parts', 'thermostat',        8),
  -- ── Parts sub-categories ───────────────────────────────────────────────
  ('c0000002-0000-0000-0000-000000000001', 'brake-pads',        'Brake Pads',         'c0000001-0000-0000-0000-000000000001', 'parts', null, 1),
  ('c0000002-0000-0000-0000-000000000002', 'brake-discs',       'Brake Discs',        'c0000001-0000-0000-0000-000000000001', 'parts', null, 2),
  ('c0000002-0000-0000-0000-000000000003', 'brake-calipers',    'Brake Calipers',     'c0000001-0000-0000-0000-000000000001', 'parts', null, 3),
  ('c0000002-0000-0000-0000-000000000004', 'oil-filters',       'Oil Filters',        'c0000001-0000-0000-0000-000000000003', 'parts', null, 1),
  ('c0000002-0000-0000-0000-000000000005', 'air-filters',       'Air Filters',        'c0000001-0000-0000-0000-000000000003', 'parts', null, 2),
  ('c0000002-0000-0000-0000-000000000006', 'fuel-filters',      'Fuel Filters',       'c0000001-0000-0000-0000-000000000003', 'parts', null, 3),
  ('c0000002-0000-0000-0000-000000000007', 'cabin-filters',     'Cabin Filters',      'c0000001-0000-0000-0000-000000000003', 'parts', null, 4),
  ('c0000002-0000-0000-0000-000000000008', 'shock-absorbers',   'Shock Absorbers',    'c0000001-0000-0000-0000-000000000004', 'parts', null, 1),
  ('c0000002-0000-0000-0000-000000000009', 'timing-belt-kits',  'Timing Belt Kits',   'c0000001-0000-0000-0000-000000000002', 'parts', null, 1),
  ('c0000002-0000-0000-0000-000000000010', 'spark-plugs',       'Spark Plugs',        'c0000001-0000-0000-0000-000000000005', 'parts', null, 1),
  -- ── Service parent categories (9) ────────────────────────────────────
  ('c0000003-0000-0000-0000-000000000001', 'mechanical',            'Core Mechanical & Repair',    null, 'service', 'build',                 1),
  ('c0000003-0000-0000-0000-000000000002', 'electrical',            'Electrical & Diagnostics',    null, 'service', 'electrical_services',   2),
  ('c0000003-0000-0000-0000-000000000003', 'maintenance',           'Maintenance Services',        null, 'service', 'oil_barrel',            3),
  ('c0000003-0000-0000-0000-000000000004', 'cooling-ac',            'Cooling & AC Services',       null, 'service', 'ac_unit',               4),
  ('c0000003-0000-0000-0000-000000000005', 'body-exterior',         'Body & Exterior',             null, 'service', 'car_crash',             5),
  ('c0000003-0000-0000-0000-000000000006', 'tires-wheels',          'Tires & Wheels',              null, 'service', 'tire_repair',           6),
  ('c0000003-0000-0000-0000-000000000007', 'batteries-accessories', 'Batteries & Accessories',     null, 'service', 'battery_charging_full', 7),
  ('c0000003-0000-0000-0000-000000000008', 'car-care',              'Car Care & Enhancement',      null, 'service', 'cleaning_services',     8),
  ('c0000003-0000-0000-0000-000000000009', 'inspection',            'Inspection Services',         null, 'service', 'fact_check',            9)
on conflict (slug) do nothing;

-- ── Service sub-categories (34) ────────────────────────────────────────────
insert into public.categories (id, slug, name, name_ar, parent_id, type, sort_order) values
  -- mechanical
  ('c0000004-0000-0000-0000-000000000001', 'mechanical-repair',       'Mechanical Repair',               'إصلاح ميكانيكي',                    'c0000003-0000-0000-0000-000000000001', 'service', 1),
  ('c0000004-0000-0000-0000-000000000002', 'transmission-repair',     'Transmission Repair',             'إصلاح ناقل الحركة',                 'c0000003-0000-0000-0000-000000000001', 'service', 2),
  ('c0000004-0000-0000-0000-000000000003', 'suspension-repair',       'Suspension Repair',               'إصلاح نظام التعليق',                'c0000003-0000-0000-0000-000000000001', 'service', 3),
  ('c0000004-0000-0000-0000-000000000004', 'brake-services',          'Brake Services',                  'خدمات الفرامل',                     'c0000003-0000-0000-0000-000000000001', 'service', 4),
  ('c0000004-0000-0000-0000-000000000005', 'exhaust-repair',          'Exhaust System Repair',           'إصلاح نظام العادم',                 'c0000003-0000-0000-0000-000000000001', 'service', 5),
  ('c0000004-0000-0000-0000-000000000006', 'cv-joints-repair',        'CV Joints (Koblan) Repair',       'إصلاح الكوبلان',                    'c0000003-0000-0000-0000-000000000001', 'service', 6),
  -- electrical
  ('c0000004-0000-0000-0000-000000000007', 'electrical-repair',       'Electrical Repair',               'إصلاح كهربائي',                     'c0000003-0000-0000-0000-000000000002', 'service', 1),
  ('c0000004-0000-0000-0000-000000000008', 'computer-diagnostics',    'Computer Diagnostics (OBD Scan)', 'تشخيص بالكمبيوتر (OBD)',             'c0000003-0000-0000-0000-000000000002', 'service', 2),
  ('c0000004-0000-0000-0000-000000000009', 'key-lock-services',       'Key & Lock Services',             'خدمات المفاتيح والأقفال',           'c0000003-0000-0000-0000-000000000002', 'service', 3),
  -- maintenance
  ('c0000004-0000-0000-0000-000000000010', 'oil-change',              'Oil Change',                      'تغيير الزيت',                       'c0000003-0000-0000-0000-000000000003', 'service', 1),
  ('c0000004-0000-0000-0000-000000000011', 'routine-maintenance',     'Routine Maintenance',             'الصيانة الدورية',                   'c0000003-0000-0000-0000-000000000003', 'service', 2),
  ('c0000004-0000-0000-0000-000000000012', 'preventive-maintenance',  'Preventive Maintenance',          'الصيانة الوقائية',                  'c0000003-0000-0000-0000-000000000003', 'service', 3),
  ('c0000004-0000-0000-0000-000000000013', 'quick-service',           'Quick Service',                   'خدمة سريعة',                        'c0000003-0000-0000-0000-000000000003', 'service', 4),
  -- cooling-ac
  ('c0000004-0000-0000-0000-000000000014', 'ac-recharge',             'AC Recharge',                     'شحن فريون المكيف',                  'c0000003-0000-0000-0000-000000000004', 'service', 1),
  ('c0000004-0000-0000-0000-000000000015', 'ac-repair',               'AC Repair',                       'إصلاح المكيف',                      'c0000003-0000-0000-0000-000000000004', 'service', 2),
  ('c0000004-0000-0000-0000-000000000016', 'radiator-repair',         'Radiator Repair',                 'إصلاح الرادياتير',                  'c0000003-0000-0000-0000-000000000004', 'service', 3),
  ('c0000004-0000-0000-0000-000000000017', 'cooling-system-service',  'Cooling System Service',          'خدمة نظام التبريد',                 'c0000003-0000-0000-0000-000000000004', 'service', 4),
  -- body-exterior
  ('c0000004-0000-0000-0000-000000000018', 'body-repair',             'Body Repair (Denting)',            'إصلاح الهيكل (الدينتة)',            'c0000003-0000-0000-0000-000000000005', 'service', 1),
  ('c0000004-0000-0000-0000-000000000019', 'paint',                   'Paint (Doko)',                     'دهان (دوكو)',                        'c0000003-0000-0000-0000-000000000005', 'service', 2),
  ('c0000004-0000-0000-0000-000000000020', 'paintless-dent-repair',   'Paintless Dent Repair',           'إصلاح الحفر بدون دهان',             'c0000003-0000-0000-0000-000000000005', 'service', 3),
  ('c0000004-0000-0000-0000-000000000021', 'car-glass-repair',        'Car Glass Repair / Replacement',  'إصلاح أو استبدال زجاج السيارة',     'c0000003-0000-0000-0000-000000000005', 'service', 4),
  ('c0000004-0000-0000-0000-000000000022', 'headlight-restoration',   'Headlight Restoration',           'استعادة الشفافية للأضواء الأمامية', 'c0000003-0000-0000-0000-000000000005', 'service', 5),
  -- tires-wheels
  ('c0000004-0000-0000-0000-000000000023', 'tires-services',          'Tires Services',                  'خدمات الإطارات',                    'c0000003-0000-0000-0000-000000000006', 'service', 1),
  ('c0000004-0000-0000-0000-000000000024', 'wheel-alignment',         'Wheel Alignment & Balancing',     'ضبط الزوايا والتوازن',              'c0000003-0000-0000-0000-000000000006', 'service', 2),
  -- batteries-accessories
  ('c0000004-0000-0000-0000-000000000025', 'batteries-services',      'Batteries Services',              'خدمات البطاريات',                   'c0000003-0000-0000-0000-000000000007', 'service', 1),
  ('c0000004-0000-0000-0000-000000000026', 'car-accessories',         'Car Accessories & Sound Systems', 'إكسسوارات السيارة وأنظمة الصوت',   'c0000003-0000-0000-0000-000000000007', 'service', 2),
  ('c0000004-0000-0000-0000-000000000027', 'gps-tracking',            'GPS Tracking Systems',            'أنظمة التتبع GPS',                  'c0000003-0000-0000-0000-000000000007', 'service', 3),
  -- car-care
  ('c0000004-0000-0000-0000-000000000028', 'car-wash-detailing',      'Car Wash & Detailing',            'غسيل وتلميع السيارة',               'c0000003-0000-0000-0000-000000000008', 'service', 1),
  ('c0000004-0000-0000-0000-000000000029', 'car-polishing',           'Car Polishing',                   'بوليش السيارة',                     'c0000003-0000-0000-0000-000000000008', 'service', 2),
  ('c0000004-0000-0000-0000-000000000030', 'car-upholstery',          'Car Upholstery (Interior)',        'تنجيد السيارة (الداخلية)',           'c0000003-0000-0000-0000-000000000008', 'service', 3),
  ('c0000004-0000-0000-0000-000000000031', 'car-wrapping',            'Car Wrapping / Protection Films', 'تغليف السيارة / أفلام الحماية',     'c0000003-0000-0000-0000-000000000008', 'service', 4),
  ('c0000004-0000-0000-0000-000000000032', 'car-modification',        'Car Modification',                'تعديلات السيارة',                   'c0000003-0000-0000-0000-000000000008', 'service', 5),
  -- inspection
  ('c0000004-0000-0000-0000-000000000033', 'vehicle-inspection',      'Vehicle Inspection',              'فحص السيارة',                       'c0000003-0000-0000-0000-000000000009', 'service', 1),
  ('c0000004-0000-0000-0000-000000000034', 'pre-purchase-inspection', 'Pre-Purchase Inspection',         'فحص ما قبل الشراء',                 'c0000003-0000-0000-0000-000000000009', 'service', 2)
on conflict (slug) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- PROMO CODES
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.promo_codes (code, discount_type, discount_value, min_order_amount, max_uses, active, expires_at) values
  ('WELCOME10',   'percentage', 10,   null,    500, true, now() + interval '1 year'),
  ('SAVE15',      'percentage', 15,   500,     200, true, now() + interval '6 months'),
  ('FLAT50',      'fixed',      50,   300,     100, true, now() + interval '3 months'),
  ('NEWUSER20',   'percentage', 20,   null,    null, true, now() + interval '1 year'),
  ('SUMMER25',    'percentage', 25,   1000,    150, true, now() + interval '4 months')
on conflict (code) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- CATALOG PRODUCTS (already seeded in catalog_seed.sql — adding more here)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.catalog_products
  (id, slug, name, brand, manufacturer, manufacturer_part_number, ean, brand_class, category, description, image_url)
values

  -- Brembo Front Brake Pads
  (
    'b0000001-0000-0000-0000-000000000001',
    'brembo-p23057',
    'Brembo Front Brake Pad Set',
    'Brembo', 'Brembo', 'P 23 057', '8020584057489',
    'Premium', 'Brake Pads',
    'High-performance front brake pads for BMW 3-series. OE-equivalent friction material with longer service life.',
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80'
  ),

  -- Mann-Filter Oil Filter
  (
    'b0000001-0000-0000-0000-000000000002',
    'mann-filter-w71275',
    'Mann-Filter Oil Filter W 712/75',
    'Mann-Filter', 'Mann+Hummel', 'W 712/75', '4011558038503',
    'OEM', 'Oil Filters',
    'Spin-on engine oil filter. Pressure-relief valve opens to maintain oil flow when filter is cold or clogged.',
    'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800&q=80'
  ),

  -- NGK Spark Plugs
  (
    'b0000001-0000-0000-0000-000000000003',
    'ngk-bkr6e-set4',
    'NGK Spark Plug BKR6E — Set of 4',
    'NGK', 'NGK Spark Plug', 'BKR6E', '5054290123456',
    'OEM', 'Spark Plugs',
    'Standard copper core spark plug with crimped terminal. Direct replacement for most Japanese and Korean 4-cylinder engines.',
    'https://images.unsplash.com/photo-1504222490345-c075b7d25daa?w=800&q=80'
  ),

  -- Monroe Shock Absorber
  (
    'b0000001-0000-0000-0000-000000000004',
    'monroe-g8071',
    'Monroe Front Shock Absorber G8071',
    'Monroe', 'Tenneco', 'G8071', '0049793006381',
    'Premium', 'Shock Absorbers',
    'Gas-charged monotube front shock absorber for Toyota Corolla 2014–2021. Direct-fit with OE mounting points.',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80'
  ),

  -- Denso Air Filter
  (
    'b0000001-0000-0000-0000-000000000005',
    'denso-dcf032',
    'Denso Cabin Air Filter DCF032',
    'Denso', 'Denso', 'DCF032', '4016117522938',
    'OEM', 'Cabin Filters',
    'High-efficiency cabin air filter blocks dust, pollen, and fine particles. Fits Toyota Camry XV50 2012–2017.',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
  ),

  -- Bosch Brake Disc
  (
    'b0000001-0000-0000-0000-000000000006',
    'bosch-bd1234',
    'Bosch Front Brake Disc — Pair',
    'Bosch', 'Robert Bosch', '0 986 479 634', '4047025330345',
    'Premium', 'Brake Discs',
    'Cast iron vented front brake discs. Anti-corrosion KTS-coating for extended service life.',
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80'
  ),

  -- Gates Timing Belt
  (
    'b0000001-0000-0000-0000-000000000007',
    'gates-k015632xs',
    'Gates Timing Belt Kit K015632XS',
    'Gates', 'Gates Corporation', 'K015632XS', '5414465113219',
    'Premium', 'Timing Belt',
    'Complete timing belt kit including tensioner and idler pulley for Volkswagen 2.0 TDI engines (EA288).',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'
  ),

  -- Bosch Fuel Filter
  (
    'b0000001-0000-0000-0000-000000000008',
    'bosch-fuel-filter-n2060',
    'Bosch Fuel Filter N 2060',
    'Bosch', 'Robert Bosch', 'F 026 402 060', '4047025293876',
    'OEM', 'Fuel Filters',
    'In-line fuel filter for petrol engines. Paper filter medium with water separation. Fits various Opel/Vauxhall models.',
    'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800&q=80'
  ),

  -- Valeo Alternator Belt
  (
    'b0000001-0000-0000-0000-000000000009',
    'valeo-alternator-belt-837025',
    'Valeo Poly-V Belt 837025',
    'Valeo', 'Valeo', '837025', '3276428370254',
    'OEM', 'Engine Parts',
    'Multi-ribbed serpentine drive belt for alternator, power steering, and AC compressor. EPDM compound with low stretch.',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'
  ),

  -- Continental Coolant Pump
  (
    'b0000001-0000-0000-0000-000000000010',
    'continental-ctam-wp7104',
    'Continental Coolant Pump WP7104',
    'Continental', 'ContiTech', 'WP7104', '4015001521870',
    'Premium', 'Cooling System',
    'Mechanical water pump with metal impeller for Hyundai/Kia 1.6 GDi engines. Includes gasket.',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
  )

on conflict (slug) do nothing;


-- Specifications for Brembo brake pads
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) values
  ('b0000001-0000-0000-0000-000000000001', 'Axle',             'Front',     1),
  ('b0000001-0000-0000-0000-000000000001', 'Height [mm]',      '57.3',      2),
  ('b0000001-0000-0000-0000-000000000001', 'Width [mm]',       '105.5',     3),
  ('b0000001-0000-0000-0000-000000000001', 'Thickness [mm]',   '17',        4),
  ('b0000001-0000-0000-0000-000000000001', 'Brake System',     'TRW',       5),
  ('b0000001-0000-0000-0000-000000000001', 'Wear Indicator',   'included',  6)
on conflict do nothing;

-- Specifications for Mann-Filter oil filter
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) values
  ('b0000001-0000-0000-0000-000000000002', 'Thread Size',          'M 20 x 1.5',  1),
  ('b0000001-0000-0000-0000-000000000002', 'Outer Diameter [mm]',  '76',           2),
  ('b0000001-0000-0000-0000-000000000002', 'Height [mm]',          '79',           3),
  ('b0000001-0000-0000-0000-000000000002', 'Opening Pressure [bar]', '0.7 – 1.3',  4)
on conflict do nothing;

-- Compatible vehicles for Brembo brake pads (BMW 3-series)
insert into public.compatible_vehicles (product_id, make, model, generation, engine, engine_code, fuel_type, power_hp, power_kw, year_from, year_to, body_type) values
  ('b0000001-0000-0000-0000-000000000001', 'BMW', '3 Series', 'E90', '318i',  'N46B20', 'Petrol', 143, 105, 2005, 2011, 'Saloon'),
  ('b0000001-0000-0000-0000-000000000001', 'BMW', '3 Series', 'E90', '320i',  'N46B20', 'Petrol', 150, 110, 2005, 2011, 'Saloon'),
  ('b0000001-0000-0000-0000-000000000001', 'BMW', '3 Series', 'E90', '325i',  'N52B25', 'Petrol', 218, 160, 2005, 2011, 'Saloon'),
  ('b0000001-0000-0000-0000-000000000001', 'BMW', '3 Series', 'E91', '320d',  'M47TU2D20', 'Diesel', 163, 120, 2005, 2011, 'Estate'),
  ('b0000001-0000-0000-0000-000000000001', 'BMW', '3 Series', 'E92', '320i',  'N46B20', 'Petrol', 170, 125, 2006, 2013, 'Coupe'),
  ('b0000001-0000-0000-0000-000000000001', 'BMW', '1 Series', 'E87', '118i',  'N46B20', 'Petrol', 129, 95,  2004, 2011, 'Hatchback')
on conflict do nothing;

-- Compatible vehicles for Monroe shock absorber (Toyota Corolla)
insert into public.compatible_vehicles (product_id, make, model, generation, engine, engine_code, fuel_type, power_hp, power_kw, year_from, year_to, body_type) values
  ('b0000001-0000-0000-0000-000000000004', 'Toyota', 'Corolla', 'E170', '1.8',   '2ZR-FAE', 'Petrol', 140, 103, 2013, 2019, 'Saloon'),
  ('b0000001-0000-0000-0000-000000000004', 'Toyota', 'Corolla', 'E170', '1.6',   '1ZR-FE',  'Petrol', 122, 90,  2013, 2019, 'Saloon'),
  ('b0000001-0000-0000-0000-000000000004', 'Toyota', 'Corolla', 'E170', '1.8 Hybrid', '2ZR-FXE', 'Petrol/HEV', 136, 100, 2013, 2019, 'Saloon')
on conflict do nothing;

-- OE numbers for Brembo
insert into public.oe_numbers (product_id, manufacturer, oe_number) values
  ('b0000001-0000-0000-0000-000000000001', 'BMW',      '34116792217'),
  ('b0000001-0000-0000-0000-000000000001', 'BMW',      '34116860022'),
  ('b0000001-0000-0000-0000-000000000001', 'ATE',      '13.0460-7292.2'),
  ('b0000001-0000-0000-0000-000000000001', 'FERODO',   'FDB4382')
on conflict do nothing;

-- OE numbers for Monroe
insert into public.oe_numbers (product_id, manufacturer, oe_number) values
  ('b0000001-0000-0000-0000-000000000004', 'TOYOTA', '48510-02580'),
  ('b0000001-0000-0000-0000-000000000004', 'KYB',    '333453'),
  ('b0000001-0000-0000-0000-000000000004', 'SACHS',  '313 336')
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Vendors, services, and bookings reference real auth.users rows.
-- The rows below use placeholder UUIDs for the user_id column.
-- In production, create a real admin user first via Supabase Auth, then
-- update the user_id references below to match the generated auth.users.id.
--
-- To seed quickly:
--   1. Create an admin user in Supabase Auth dashboard
--   2. Run:  UPDATE public.users SET role = 'admin' WHERE email = 'admin@garage.eg';
--   3. Replace 'REPLACE_WITH_ADMIN_USER_ID' below with the real UUID
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- VENDOR WORKING HOURS DEFAULTS
-- Apply to any vendor after they are inserted using:
--
--   SELECT seed_vendor_working_hours('<vendor_id>');
--
-- The helper function below makes it easy:
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.seed_vendor_working_hours(p_vendor_id uuid)
returns void language plpgsql as $$
begin
  insert into public.vendor_working_hours (vendor_id, day_of_week, open_time, close_time, is_open)
  values
    (p_vendor_id, 0, '09:00', '18:00', false), -- Sunday closed
    (p_vendor_id, 1, '08:00', '20:00', true),  -- Monday
    (p_vendor_id, 2, '08:00', '20:00', true),  -- Tuesday
    (p_vendor_id, 3, '08:00', '20:00', true),  -- Wednesday
    (p_vendor_id, 4, '08:00', '20:00', true),  -- Thursday
    (p_vendor_id, 5, '10:00', '16:00', true),  -- Friday  short hours
    (p_vendor_id, 6, '08:00', '18:00', true)   -- Saturday
  on conflict (vendor_id, day_of_week) do nothing;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME PUBLICATION — run once after schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Uncomment the block below and run it once in the Supabase SQL editor:
--
-- alter publication supabase_realtime add table public.bookings;
-- alter publication supabase_realtime add table public.booking_status_history;
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.notifications;
