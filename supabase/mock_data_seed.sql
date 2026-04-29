-- ═══════════════════════════════════════════════════════════════════════════
-- GARAGE EGYPT — EXTENDED MOCK DATA SEED
-- Run AFTER schema.sql, billing_schema.sql, add_location_columns.sql, and
-- mock_billing_seed.sql (which seeds the first service center vendor).
--
-- Adds:
--   • 3 new customer users
--   • 5 new service center vendors across Cairo, Giza & Alexandria
--   • Working hours, services, and branches for each new vendor
--   • 10 new products (public.products) for the parts vendor
--   • Bookings and reviews for the new vendors
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AUTH USERS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, instance_id,
  email, encrypted_password, email_confirmed_at,
  aud, role,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) VALUES
  -- New customers
  (
    'aaaaaaaa-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'customer3@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Khaled Ibrahim","role":"customer"}'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'customer4@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Nour Salah","role":"customer"}'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'customer5@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mariam Fathy","role":"customer"}'
  ),
  -- New vendor owners
  (
    'aaaaaaaa-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000000',
    'maadi-center@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Maadi Speed Center Owner","role":"vendor"}'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000000',
    'giza-tech@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Giza Tech Motors Owner","role":"vendor"}'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000000',
    'alex-auto@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alexandria Auto Pro Owner","role":"vendor"}'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000000',
    'heliopolis-motors@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Heliopolis Motors Owner","role":"vendor"}'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000015',
    '00000000-0000-0000-0000-000000000000',
    'nasr-auto@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Nasr City Auto Owner","role":"vendor"}'
  )
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PUBLIC USER PROFILES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.users (id, email, full_name, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000004', 'customer3@garage.eg',          'Khaled Ibrahim',                 'customer'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'customer4@garage.eg',          'Nour Salah',                     'customer'),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'customer5@garage.eg',          'Mariam Fathy',                   'customer'),
  ('aaaaaaaa-0000-0000-0000-000000000011', 'maadi-center@garage.eg',       'Maadi Speed Center Owner',       'vendor'),
  ('aaaaaaaa-0000-0000-0000-000000000012', 'giza-tech@garage.eg',          'Giza Tech Motors Owner',         'vendor'),
  ('aaaaaaaa-0000-0000-0000-000000000013', 'alex-auto@garage.eg',          'Alexandria Auto Pro Owner',      'vendor'),
  ('aaaaaaaa-0000-0000-0000-000000000014', 'heliopolis-motors@garage.eg',  'Heliopolis Motors Owner',        'vendor'),
  ('aaaaaaaa-0000-0000-0000-000000000015', 'nasr-auto@garage.eg',          'Nasr City Auto Owner',           'vendor')
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role      = EXCLUDED.role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SERVICE CENTER VENDORS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.vendors (
  id, user_id,
  business_name, business_name_ar,
  vendor_type, status,
  phone, email,
  address, city, city_ar, governorate, district,
  latitude, longitude,
  description, description_ar,
  rating, total_reviews,
  specializations, supported_makes,
  featured, featured_priority,
  approved_at, created_at, updated_at
) VALUES

  -- ── 1. Maadi Speed Center (Cairo / Maadi) ────────────────────────────────
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000011',
    'Maadi Speed Center', 'سبيد سنتر المعادي',
    'service_center', 'approved',
    '+20 10 1234 5678', 'maadi-center@garage.eg',
    '22 Road 9, Maadi', 'Cairo', 'القاهرة', 'Cairo', 'Maadi',
    29.9626, 31.2497,
    'Your one-stop shop for mechanical repairs, tyres, and wheel alignment in Maadi. Serving Cairo since 2010.',
    'مركزك الشامل للإصلاح الميكانيكي والإطارات وضبط الزوايا في المعادي. نخدم القاهرة منذ 2010.',
    4.60, 38,
    ARRAY['mechanical','maintenance','tires-wheels'],
    ARRAY['Toyota','Hyundai','Kia','Nissan'],
    false, 0,
    '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00', now()
  ),

  -- ── 2. Giza Tech Motors (Giza / Mohandessin) ─────────────────────────────
  (
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000012',
    'Giza Tech Motors', 'جيزة تك موتورز',
    'service_center', 'approved',
    '+20 10 9876 5432', 'giza-tech@garage.eg',
    '5 Sudan St, Mohandessin', 'Giza', 'الجيزة', 'Giza', 'Mohandessin',
    30.0626, 31.1996,
    'Specialist in electrical diagnostics, AC systems, and vehicle inspection. OBD-II scan available for all makes.',
    'متخصصون في تشخيص الأعطال الكهربائية وتكييف السيارات والفحص الشامل. فحص OBD-II لجميع الموديلات.',
    4.80, 62,
    ARRAY['electrical','cooling-ac','inspection'],
    ARRAY['BMW','Mercedes-Benz','Audi','Volkswagen'],
    true, 2,
    '2023-06-01 00:00:00+00', '2023-06-01 00:00:00+00', now()
  ),

  -- ── 3. Alexandria Auto Pro (Alexandria / Smouha) ─────────────────────────
  (
    'bbbbbbbb-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000013',
    'Alexandria Auto Pro', 'الإسكندرية أوتو برو',
    'service_center', 'approved',
    '+20 10 5555 9999', 'alex-auto@garage.eg',
    '14 Victor Emanuel Sq, Smouha', 'Alexandria', 'الإسكندرية', 'Alexandria', 'Smouha',
    31.2001, 29.9187,
    'Leading body repair and paint shop in Alexandria. Paintless dent repair, full respray, and ceramic coating.',
    'الورشة الرائدة لإصلاح الهيكل والدهان في الإسكندرية. إصلاح الحفر بدون دهان، طلاء كامل، وكوتنج سيراميك.',
    4.50, 29,
    ARRAY['body-exterior','car-care','inspection'],
    ARRAY['Toyota','Chevrolet','Opel','Hyundai','Kia'],
    false, 0,
    '2024-01-10 00:00:00+00', '2024-01-10 00:00:00+00', now()
  ),

  -- ── 4. Heliopolis Motors (Cairo / Heliopolis) ─────────────────────────────
  (
    'bbbbbbbb-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000014',
    'Heliopolis Motors', 'هليوبوليس موتورز',
    'service_center', 'approved',
    '+20 11 2233 4455', 'heliopolis-motors@garage.eg',
    '3 Al-Ahram St, Heliopolis', 'Cairo', 'القاهرة', 'Cairo', 'Heliopolis',
    30.0855, 31.3257,
    'Full-service center covering mechanical, electrical, maintenance, and battery services. 15 years experience.',
    'مركز خدمة متكامل يشمل الميكانيكا والكهرباء والصيانة وخدمات البطاريات. 15 سنة خبرة.',
    4.70, 51,
    ARRAY['mechanical','electrical','maintenance','batteries-accessories'],
    ARRAY['Toyota','Honda','Nissan','Mitsubishi','Suzuki'],
    true, 1,
    '2023-09-20 00:00:00+00', '2023-09-20 00:00:00+00', now()
  ),

  -- ── 5. Nasr City Auto (Cairo / Nasr City) ────────────────────────────────
  (
    'bbbbbbbb-0000-0000-0000-000000000006',
    'aaaaaaaa-0000-0000-0000-000000000015',
    'Nasr City Auto', 'ناصر سيتي أوتو',
    'service_center', 'approved',
    '+20 10 7788 1122', 'nasr-auto@garage.eg',
    '87 Abbas Al-Akkad St, Nasr City', 'Cairo', 'القاهرة', 'Cairo', 'Nasr City',
    30.0605, 31.3280,
    'Tyre specialist and mechanical center in Nasr City. Fast tyre fitting, balancing, alignment, and quick oil change.',
    'متخصص إطارات ومركز ميكانيكا في مدينة نصر. تركيب إطارات سريع وتوازن وضبط زوايا وتغيير زيت سريع.',
    4.30, 17,
    ARRAY['tires-wheels','mechanical','cooling-ac'],
    ARRAY['Lada','Dacia','Renault','Peugeot','Fiat'],
    false, 0,
    '2025-01-05 00:00:00+00', '2025-01-05 00:00:00+00', now()
  )

ON CONFLICT (id) DO UPDATE
  SET business_name     = EXCLUDED.business_name,
      business_name_ar  = EXCLUDED.business_name_ar,
      specializations   = EXCLUDED.specializations,
      supported_makes   = EXCLUDED.supported_makes,
      district          = EXCLUDED.district,
      governorate       = EXCLUDED.governorate,
      latitude          = EXCLUDED.latitude,
      longitude         = EXCLUDED.longitude,
      rating            = EXCLUDED.rating,
      total_reviews     = EXCLUDED.total_reviews,
      featured          = EXCLUDED.featured,
      featured_priority = EXCLUDED.featured_priority;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VENDOR BILLING SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.vendor_billing_settings (
  vendor_id, booking_fee, subscription_fee, subscription_active,
  commission_rate, featured_listing_fee, featured_active
) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000002', 75, 0, false, 15, 200, false),
  ('bbbbbbbb-0000-0000-0000-000000000003', 75, 0, false, 15, 200, true),
  ('bbbbbbbb-0000-0000-0000-000000000004', 75, 0, false, 15, 200, false),
  ('bbbbbbbb-0000-0000-0000-000000000005', 75, 0, false, 15, 200, true),
  ('bbbbbbbb-0000-0000-0000-000000000006', 75, 0, false, 15, 200, false)
ON CONFLICT (vendor_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. WORKING HOURS
-- ─────────────────────────────────────────────────────────────────────────────

SELECT public.seed_vendor_working_hours('bbbbbbbb-0000-0000-0000-000000000002');
SELECT public.seed_vendor_working_hours('bbbbbbbb-0000-0000-0000-000000000003');
SELECT public.seed_vendor_working_hours('bbbbbbbb-0000-0000-0000-000000000004');
SELECT public.seed_vendor_working_hours('bbbbbbbb-0000-0000-0000-000000000005');
SELECT public.seed_vendor_working_hours('bbbbbbbb-0000-0000-0000-000000000006');


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. BOOKABLE SERVICES (for BookingSidebar)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.services (id, vendor_id, name, name_ar, description, price, duration_minutes, active) VALUES

  -- Maadi Speed Center
  ('cccccccc-0000-0000-0000-000000000011', 'bbbbbbbb-0000-0000-0000-000000000002', 'Oil Change',        'تغيير الزيت',         'Full synthetic oil change with filter',        NULL, 30, true),
  ('cccccccc-0000-0000-0000-000000000012', 'bbbbbbbb-0000-0000-0000-000000000002', 'Tyre Fitting',      'تركيب إطار',          'Tyre fitting and valve replacement',           NULL, 20, true),
  ('cccccccc-0000-0000-0000-000000000013', 'bbbbbbbb-0000-0000-0000-000000000002', 'Wheel Alignment',   'ضبط الزوايا',         'Four-wheel computer laser alignment',          NULL, 45, true),
  ('cccccccc-0000-0000-0000-000000000014', 'bbbbbbbb-0000-0000-0000-000000000002', 'Brake Service',     'خدمة الفرامل',        'Brake pad and disc inspection and replacement', NULL, 60, true),

  -- Giza Tech Motors
  ('cccccccc-0000-0000-0000-000000000021', 'bbbbbbbb-0000-0000-0000-000000000003', 'OBD Diagnostics',   'فحص OBD',             'Full computer diagnostic scan (all fault codes)', NULL, 30, true),
  ('cccccccc-0000-0000-0000-000000000022', 'bbbbbbbb-0000-0000-0000-000000000003', 'AC Recharge',       'شحن فريون',           'AC refrigerant top-up and system check',       NULL, 45, true),
  ('cccccccc-0000-0000-0000-000000000023', 'bbbbbbbb-0000-0000-0000-000000000003', 'Electrical Repair', 'إصلاح كهربائي',       'Wiring, sensors, and electrical fault repair', NULL, 90, true),
  ('cccccccc-0000-0000-0000-000000000024', 'bbbbbbbb-0000-0000-0000-000000000003', 'Full Inspection',   'فحص شامل',            '50-point vehicle health inspection report',    NULL, 60, true),

  -- Alexandria Auto Pro
  ('cccccccc-0000-0000-0000-000000000031', 'bbbbbbbb-0000-0000-0000-000000000004', 'Body Repair',       'إصلاح هيكل',          'Panel beating and denting repair',             NULL, 120, true),
  ('cccccccc-0000-0000-0000-000000000032', 'bbbbbbbb-0000-0000-0000-000000000004', 'Full Respray',      'دهان كامل',           'Full car respray with 2K paint',               NULL, 480, true),
  ('cccccccc-0000-0000-0000-000000000033', 'bbbbbbbb-0000-0000-0000-000000000004', 'PDR',               'إصلاح بدون دهان',     'Paintless dent repair for minor dings',        NULL, 60, true),
  ('cccccccc-0000-0000-0000-000000000034', 'bbbbbbbb-0000-0000-0000-000000000004', 'Car Wash & Detail', 'غسيل وتلميع',         'Full exterior wash, polish and interior clean', NULL, 90, true),

  -- Heliopolis Motors
  ('cccccccc-0000-0000-0000-000000000041', 'bbbbbbbb-0000-0000-0000-000000000005', 'Oil Change',        'تغيير الزيت',         'Full synthetic oil change with OEM filter',    NULL, 30, true),
  ('cccccccc-0000-0000-0000-000000000042', 'bbbbbbbb-0000-0000-0000-000000000005', 'Battery Check',     'فحص البطارية',        'Battery load test and terminal cleaning',      NULL, 20, true),
  ('cccccccc-0000-0000-0000-000000000043', 'bbbbbbbb-0000-0000-0000-000000000005', 'Routine Service',   'صيانة دورية',         '20,000 km service including fluids and filters', NULL, 90, true),
  ('cccccccc-0000-0000-0000-000000000044', 'bbbbbbbb-0000-0000-0000-000000000005', 'Electrical Fault',  'كشف عطل كهربائي',     'Fault diagnosis and electrical repair',        NULL, 60, true),

  -- Nasr City Auto
  ('cccccccc-0000-0000-0000-000000000051', 'bbbbbbbb-0000-0000-0000-000000000006', 'Tyre Change',       'تغيير إطار',          'Tyre change with balancing (per tyre)',        NULL, 15, true),
  ('cccccccc-0000-0000-0000-000000000052', 'bbbbbbbb-0000-0000-0000-000000000006', 'Wheel Balancing',   'توازن العجلات',       'Dynamic wheel balancing (4 wheels)',           NULL, 30, true),
  ('cccccccc-0000-0000-0000-000000000053', 'bbbbbbbb-0000-0000-0000-000000000006', 'Oil Change',        'تغيير الزيت',         'Quick oil change with semi-synthetic oil',     NULL, 20, true),
  ('cccccccc-0000-0000-0000-000000000054', 'bbbbbbbb-0000-0000-0000-000000000006', 'AC Recharge',       'شحن مكيف',            'AC gas recharge and leak check',               NULL, 40, true)

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. BRANCHES (multi-location centers)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.vendor_branches (
  id, vendor_id, name, name_ar,
  address, city, city_ar, governorate,
  latitude, longitude, phone,
  status, is_main
) VALUES
  -- Heliopolis Motors — second branch in New Cairo
  (
    'dddddddd-1111-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'Heliopolis Motors — New Cairo Branch',
    'هليوبوليس موتورز — فرع التجمع',
    'Plot 15, 90th St, New Cairo', 'Cairo', 'القاهرة', 'Cairo',
    30.0073, 31.4913, '+20 11 2233 4466',
    'active', false
  ),
  -- Giza Tech Motors — second branch in 6th of October
  (
    'dddddddd-2222-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'Giza Tech Motors — 6th October Branch',
    'جيزة تك موتورز — فرع أكتوبر',
    '12 Industrial Zone, 6th of October City', 'Giza', 'الجيزة', 'Giza',
    29.9695, 30.9280, '+20 10 9876 0000',
    'active', false
  )
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.bookings (
  id, user_id, vendor_id,
  booking_date, booking_time,
  status, booking_type,
  created_at
) VALUES

  -- ── Maadi Speed Center ───────────────────────────────────────────────────
  ('b0002-001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-01-08', '09:00', 'completed', 'routine_maintenance', '2026-01-07 17:00:00+00'),
  ('b0002-001-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-01-22', '11:00', 'completed', 'routine_maintenance', '2026-01-21 10:00:00+00'),
  ('b0002-001-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-02-10', '14:00', 'completed', 'inspection',          '2026-02-09 12:00:00+00'),
  ('b0002-001-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-02-25', '10:00', 'completed', 'routine_maintenance', '2026-02-24 09:00:00+00'),
  ('b0002-001-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-03-12', '09:30', 'completed', 'inspection',          '2026-03-11 18:00:00+00'),
  ('b0002-001-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-04-05', '11:00', 'booked',    'routine_maintenance', '2026-04-04 14:00:00+00'),

  -- ── Giza Tech Motors ─────────────────────────────────────────────────────
  ('b0003-001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003', '2026-01-14', '10:00', 'completed', 'inspection',          '2026-01-13 16:00:00+00'),
  ('b0003-001-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000003', '2026-01-28', '09:00', 'completed', 'routine_maintenance', '2026-01-27 11:00:00+00'),
  ('b0003-001-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000003', '2026-02-06', '14:30', 'completed', 'inspection',          '2026-02-05 09:00:00+00'),
  ('b0003-001-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', '2026-02-19', '11:00', 'completed', 'routine_maintenance', '2026-02-18 17:00:00+00'),
  ('b0003-001-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000003', '2026-03-05', '09:00', 'completed', 'inspection',          '2026-03-04 13:00:00+00'),
  ('b0003-001-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003', '2026-04-10', '10:30', 'booked',    'routine_maintenance', '2026-04-09 08:00:00+00'),

  -- ── Alexandria Auto Pro ───────────────────────────────────────────────────
  ('b0004-001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000004', '2026-02-03', '10:00', 'completed', 'routine_maintenance', '2026-02-02 15:00:00+00'),
  ('b0004-001-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000004', '2026-02-17', '13:00', 'completed', 'inspection',          '2026-02-16 10:00:00+00'),
  ('b0004-001-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000004', '2026-03-20', '09:00', 'completed', 'routine_maintenance', '2026-03-19 18:00:00+00'),

  -- ── Heliopolis Motors ─────────────────────────────────────────────────────
  ('b0005-001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000005', '2026-01-06', '09:30', 'completed', 'routine_maintenance', '2026-01-05 12:00:00+00'),
  ('b0005-001-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000005', '2026-01-20', '11:00', 'completed', 'inspection',          '2026-01-19 09:00:00+00'),
  ('b0005-001-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000005', '2026-02-09', '14:00', 'completed', 'routine_maintenance', '2026-02-08 16:00:00+00'),
  ('b0005-001-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000005', '2026-02-23', '10:00', 'completed', 'inspection',          '2026-02-22 11:00:00+00'),
  ('b0005-001-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000005', '2026-03-17', '09:00', 'completed', 'routine_maintenance', '2026-03-16 14:00:00+00'),
  ('b0005-001-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000005', '2026-04-14', '11:30', 'booked',    'routine_maintenance', '2026-04-13 09:00:00+00'),

  -- ── Nasr City Auto ────────────────────────────────────────────────────────
  ('b0006-001-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000006', '2026-03-04', '10:00', 'completed', 'routine_maintenance', '2026-03-03 15:00:00+00'),
  ('b0006-001-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000006', '2026-03-18', '09:00', 'completed', 'inspection',          '2026-03-17 12:00:00+00'),
  ('b0006-001-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000006', '2026-04-08', '11:00', 'booked',    'routine_maintenance', '2026-04-07 17:00:00+00')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.reviews (
  id, booking_id, vendor_id, user_id,
  rating, comment,
  created_at
) VALUES

  -- ── Maadi Speed Center ───────────────────────────────────────────────────
  (
    'eeeeeeee-0002-0001-0000-000000000001',
    'b0002-001-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    5, 'Great service, quick oil change and they topped up all my fluids without being asked. Will definitely return.',
    '2026-01-09 10:00:00+00'
  ),
  (
    'eeeeeeee-0002-0001-0000-000000000002',
    'b0002-001-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000004',
    4, 'Solid tyre shop. Fitting was fast, alignment report was detailed. Waiting area could use better seating.',
    '2026-01-23 12:00:00+00'
  ),
  (
    'eeeeeeee-0002-0001-0000-000000000003',
    'b0002-001-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000003',
    5, 'Best alignment shop in Maadi. The technician explained every reading clearly. Car drives straight now.',
    '2026-02-11 15:00:00+00'
  ),
  (
    'eeeeeeee-0002-0001-0000-000000000004',
    'b0002-001-0000-0000-000000000004',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000005',
    4, 'Good prices and friendly staff. The brake inspection found a minor issue I wasn''t aware of.',
    '2026-02-26 09:00:00+00'
  ),
  (
    'eeeeeeee-0002-0001-0000-000000000005',
    'b0002-001-0000-0000-000000000005',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000006',
    5, 'Efficient and professional. The car passed inspection with full marks. Would recommend to friends.',
    '2026-03-13 11:00:00+00'
  ),

  -- ── Giza Tech Motors ─────────────────────────────────────────────────────
  (
    'eeeeeeee-0003-0001-0000-000000000001',
    'b0003-001-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000003',
    5, 'They found a fault code that two other garages missed. Fixed in the same day. Absolutely brilliant.',
    '2026-01-15 14:00:00+00'
  ),
  (
    'eeeeeeee-0003-0001-0000-000000000002',
    'b0003-001-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000004',
    5, 'AC went cold immediately after recharge. Leak was fixed properly, not just topped up like other places.',
    '2026-01-29 11:00:00+00'
  ),
  (
    'eeeeeeee-0003-0001-0000-000000000003',
    'b0003-001-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000005',
    5, 'Very thorough inspection, got a PDF report with photos. The team is knowledgeable and honest.',
    '2026-02-07 16:00:00+00'
  ),
  (
    'eeeeeeee-0003-0001-0000-000000000004',
    'b0003-001-0000-0000-000000000004',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000002',
    4, 'Good specialists. The diagnostic was accurate but the wait time was a bit long. Still worth it.',
    '2026-02-20 10:00:00+00'
  ),
  (
    'eeeeeeee-0003-0001-0000-000000000005',
    'b0003-001-0000-0000-000000000005',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000006',
    5, 'Professional team, clean workshop. My BMW runs perfectly since the electrical repair.',
    '2026-03-06 09:00:00+00'
  ),

  -- ── Alexandria Auto Pro ───────────────────────────────────────────────────
  (
    'eeeeeeee-0004-0001-0000-000000000001',
    'b0004-001-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000005',
    5, 'Incredible PDR work. My door dent is completely gone, and you can''t tell there was ever any damage.',
    '2026-02-04 13:00:00+00'
  ),
  (
    'eeeeeeee-0004-0001-0000-000000000002',
    'b0004-001-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000006',
    4, 'Good paint work on my bumper. Color match was very close. Took a bit longer than quoted.',
    '2026-02-18 12:00:00+00'
  ),
  (
    'eeeeeeee-0004-0001-0000-000000000003',
    'b0004-001-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000004',
    4, 'Car wash and detail was excellent. Paint correction made the car look brand new. Fair pricing.',
    '2026-03-21 10:00:00+00'
  ),

  -- ── Heliopolis Motors ─────────────────────────────────────────────────────
  (
    'eeeeeeee-0005-0001-0000-000000000001',
    'b0005-001-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000002',
    5, 'Fast and efficient oil change. They checked everything and told me my air filter needed replacing — honest advice.',
    '2026-01-07 11:00:00+00'
  ),
  (
    'eeeeeeee-0005-0001-0000-000000000002',
    'b0005-001-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000004',
    5, 'Best routine service I''ve had. They documented everything and sent me a WhatsApp summary after.',
    '2026-01-21 14:00:00+00'
  ),
  (
    'eeeeeeee-0005-0001-0000-000000000003',
    'b0005-001-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000005',
    4, 'Good workshop. Battery test was accurate and the new battery is performing well. Nice staff.',
    '2026-02-10 09:00:00+00'
  ),
  (
    'eeeeeeee-0005-0001-0000-000000000004',
    'b0005-001-0000-0000-000000000004',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000006',
    5, 'Impressed by the level of detail in their inspection report. Transparent about costs before starting work.',
    '2026-02-24 16:00:00+00'
  ),
  (
    'eeeeeeee-0005-0001-0000-000000000005',
    'b0005-001-0000-0000-000000000005',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000003',
    5, 'Very reliable garage. I bring all three of my family cars here. Never had a problem.',
    '2026-03-18 11:00:00+00'
  ),

  -- ── Nasr City Auto ────────────────────────────────────────────────────────
  (
    'eeeeeeee-0006-0001-0000-000000000001',
    'b0006-001-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000006',
    'aaaaaaaa-0000-0000-0000-000000000006',
    4, 'Fast tyre change and balancing. Good value for money, no upselling. The waiting area is basic but ok.',
    '2026-03-05 12:00:00+00'
  ),
  (
    'eeeeeeee-0006-0001-0000-000000000002',
    'b0006-001-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000006',
    'aaaaaaaa-0000-0000-0000-000000000004',
    4, 'Quick oil change and wheel balance. They had my tyre size in stock, no waiting. Would come back.',
    '2026-03-19 09:00:00+00'
  )

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. PRODUCTS (public.products — parts vendor listing)
--     Parts vendor: bbbbbbbb-0000-0000-0000-000000000010
-- ─────────────────────────────────────────────────────────────────000000000000
-- NOTE: vendor bbbbbbbb-0000-0000-0000-000000000010 must already exist.
--       It was created in the previous session's seed.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.products (
  id, vendor_id,
  name, description,
  price, original_price,
  category, subcategory,
  brand, sku, oem_number,
  condition, stock,
  image_url, images,
  active
) VALUES

  -- Bosch Front Brake Discs (pair)
  (
    'dddddddd-0000-0000-0000-000000000004',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'Bosch Front Brake Disc — Pair', 'Cast iron vented front brake discs with KTS anti-rust coating for BMW 3-series E90/E91/E92. OE-specification dimensions, direct-fit.',
    1650.00, 1850.00,
    'Brake System', 'Brake Discs',
    'Bosch', 'BOSCH-BD-0079', '0 986 479 634',
    'new', 8,
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80'],
    true
  ),

  -- NGK Iridium Spark Plugs (set of 4)
  (
    'dddddddd-0000-0000-0000-000000000005',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'NGK Iridium Spark Plugs — Set of 4', 'Long-life iridium-tipped spark plugs for Toyota Corolla / Camry / Yaris 1.6 and 1.8 petrol engines. 100,000 km service life.',
    480.00, NULL,
    'Engine Parts', 'Spark Plugs',
    'NGK', 'NGK-ILZKR7B-SET4', 'ILZKR7B11',
    'new', 30,
    'https://images.unsplash.com/photo-1504222490345-c075b7d25daa?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1504222490345-c075b7d25daa?w=800&q=80'],
    true
  ),

  -- Bilstein B4 Front Shock Absorber
  (
    'dddddddd-0000-0000-0000-000000000006',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'Bilstein B4 Front Shock Absorber', 'OEM-quality monotube shock absorber for Volkswagen Golf Mk6 / Mk7 and Jetta. Bilstein B4 series — direct OE replacement.',
    1250.00, NULL,
    'Suspension', 'Shock Absorbers',
    'Bilstein', 'BILS-B4-22-139178', '22-139178',
    'new', 5,
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80'],
    true
  ),

  -- Denso Cabin Air Filter
  (
    'dddddddd-0000-0000-0000-000000000007',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'Denso Cabin Air Filter DCF032', 'High-efficiency cabin air filter for Toyota Camry XV50 2012–2017. Blocks dust, pollen, and fine particles. Easy drop-in replacement.',
    280.00, 320.00,
    'Filters', 'Cabin Air Filters',
    'Denso', 'DENSO-DCF032', 'DCF032',
    'new', 22,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'],
    true
  ),

  -- Valeo Alternator
  (
    'dddddddd-0000-0000-0000-000000000008',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'Valeo Alternator 90A — Remanufactured', 'Remanufactured 90A alternator for Hyundai Elantra / i30 / Tucson 1.6 and 2.0 GDi. Valeo Remy quality, fully tested before dispatch.',
    1950.00, NULL,
    'Electrical System', 'Alternators',
    'Valeo', 'VALEO-ALT-437494', '437494',
    'refurbished', 3,
    'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800&q=80'],
    true
  ),

  -- Continental Water Pump + Timing Belt Kit
  (
    'dddddddd-0000-0000-0000-000000000009',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'Continental Timing Belt Kit + Water Pump', 'Complete timing belt kit with water pump for Hyundai / Kia 1.4 and 1.6 petrol engines (G4FA / G4FC). Includes tensioner, idler, and gasket.',
    1850.00, 2100.00,
    'Engine Parts', 'Timing Belt Kits',
    'Continental', 'CONTI-CT1058WP3', 'CT1058WP3',
    'new', 7,
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'],
    true
  ),

  -- Moog Control Arm + Ball Joint
  (
    'dddddddd-0000-0000-0000-000000000010',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'Moog Front Control Arm — Complete', 'Complete front lower control arm with ball joint pre-installed. For Toyota Camry XV50 2012–2018. Greaseable ball joint for extended life.',
    1100.00, NULL,
    'Suspension', 'Control Arms',
    'Moog', 'MOOG-CA-001', 'RK620331',
    'new', 6,
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80'],
    true
  ),

  -- Bosch Air Filter
  (
    'dddddddd-0000-0000-0000-000000000011',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'Bosch Air Filter S0027', 'High-flow panel air filter for Opel Astra / Corsa / Insignia with 1.4 and 1.6 turbo petrol engines. OEM-equivalent filtration efficiency.',
    220.00, 260.00,
    'Filters', 'Air Filters',
    'Bosch', 'BOSCH-S0027', 'F 026 400 027',
    'new', 18,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'],
    true
  ),

  -- LUK Clutch Kit
  (
    'dddddddd-0000-0000-0000-000000000012',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'LUK Clutch Kit 3-piece', '3-piece clutch kit (disc + pressure plate + release bearing) for Chevrolet Cruze / Opel Astra 1.6 and 1.8 petrol. OE specification.',
    2400.00, 2700.00,
    'Transmission', 'Clutch Kits',
    'LUK', 'LUK-624339400', '624 3394 00',
    'new', 4,
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'],
    true
  ),

  -- Beru Glow Plugs (set of 4)
  (
    'dddddddd-0000-0000-0000-000000000013',
    'bbbbbbbb-0000-0000-0000-000000000010',
    'Beru Glow Plugs — Set of 4', 'Ceramic glow plugs for BMW 318d / 320d (N47 engine) and Peugeot 407 / 307 2.0 HDi. Fast-heat technology, 4-second pre-heat.',
    620.00, NULL,
    'Engine Parts', 'Glow Plugs',
    'Beru', 'BERU-GS0032-SET4', '0 100 122 032',
    'new', 11,
    'https://images.unsplash.com/photo-1504222490345-c075b7d25daa?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1504222490345-c075b7d25daa?w=800&q=80'],
    true
  )

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. UPDATE vendor rating / review counts from real data
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.vendors v
SET
  total_reviews = sub.cnt,
  rating        = ROUND(sub.avg_rating::numeric, 2)
FROM (
  SELECT
    vendor_id,
    COUNT(*)               AS cnt,
    AVG(rating)::numeric   AS avg_rating
  FROM public.reviews
  GROUP BY vendor_id
) sub
WHERE v.id = sub.vendor_id
  AND v.id IN (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000004',
    'bbbbbbbb-0000-0000-0000-000000000005',
    'bbbbbbbb-0000-0000-0000-000000000006'
  );
