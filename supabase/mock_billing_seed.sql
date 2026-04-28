-- ═══════════════════════════════════════════════════════════════════════════
-- GARAGE EGYPT — Mock Billing Seed Data
--
-- Creates test users, a service center vendor approved on 2025-10-01,
-- services, and completed bookings spread across 5 past billing periods
-- (Oct 2025 → Feb 2026) so the auto-billing pipeline has real data to
-- calculate.
--
-- Billing periods generated (approved_at = 2025-10-01):
--   Period 1 : 2025-10-01 → 2025-10-31  →  4 bookings  → 300 EGP
--   Period 2 : 2025-11-01 → 2025-11-30  →  3 bookings  → 225 EGP
--   Period 3 : 2025-12-01 → 2025-12-31  →  5 bookings  → 375 EGP
--   Period 4 : 2026-01-01 → 2026-01-31  →  2 bookings  → 150 EGP
--   Period 5 : 2026-02-01 → 2026-02-28  →  4 bookings  → 300 EGP (paid)
--   Current  : 2026-03-01 → 2026-03-31  →  2 bookings  → (not billed yet)
--
-- Run in Supabase SQL editor AFTER:
--   1. schema.sql
--   2. billing_schema.sql
--   3. The approved_at migration (approved_at column must exist on vendors)
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AUTH USERS  (handle_new_user trigger auto-creates public.users rows)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, instance_id,
  email, encrypted_password, email_confirmed_at,
  aud, role,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'sc-vendor@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Cairo Auto Center Owner","role":"vendor"}'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'customer1@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ahmed Hassan","role":"customer"}'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'customer2@garage.eg',
    crypt('GarageDemo!1', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sara Mostafa","role":"customer"}'
  )
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PUBLIC USER PROFILES  (upsert in case trigger already ran)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.users (id, email, full_name, role)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'sc-vendor@garage.eg',  'Cairo Auto Center Owner', 'vendor'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'customer1@garage.eg',  'Ahmed Hassan',            'customer'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'customer2@garage.eg',  'Sara Mostafa',            'customer')
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role      = EXCLUDED.role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SERVICE CENTER VENDOR
--    approved_at = 2025-10-01  →  5 completed billing periods by March 2026
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.vendors (
  id, user_id,
  business_name, vendor_type, status,
  phone, email, address, city,
  description, rating,
  approved_at, created_at, updated_at
) VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Cairo Auto Service Center',
  'service_center',
  'approved',
  '+20 10 0000 1111',
  'sc-vendor@garage.eg',
  '15 Tahrir St, Downtown',
  'Cairo',
  'Full-service auto repair and maintenance center in the heart of Cairo.',
  4.70,
  '2025-10-01 00:00:00+00',
  '2025-10-01 00:00:00+00',
  now()
)
ON CONFLICT (id) DO UPDATE
  SET approved_at = EXCLUDED.approved_at,
      status      = EXCLUDED.status;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VENDOR BILLING SETTINGS  (75 EGP/booking, no subscription)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.vendor_billing_settings (
  vendor_id, booking_fee, subscription_fee, subscription_active,
  commission_rate, featured_listing_fee, featured_active
) VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  75, 0, false, 15, 200, false
)
ON CONFLICT (vendor_id) DO UPDATE
  SET booking_fee = EXCLUDED.booking_fee;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. VENDOR WORKING HOURS
-- ─────────────────────────────────────────────────────────────────────────────

SELECT public.seed_vendor_working_hours('bbbbbbbb-0000-0000-0000-000000000001');


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SERVICES  (price is NULL — pricing given as a quote, not fixed)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.services (id, vendor_id, name, description, price, duration_minutes, active)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Oil Change',         'Full synthetic oil change with filter replacement', NULL, 30, true),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'Brake Inspection',   'Full brake system inspection and pad check',         NULL, 45, true),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'AC Service',         'Air conditioning recharge and system check',          NULL, 60, true),
  ('cccccccc-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', 'Wheel Alignment',    'Four-wheel laser alignment',                          NULL, 40, true),
  ('cccccccc-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000001', 'General Inspection', '30-point vehicle health check',                       NULL, 45, true)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. MOCK BOOKINGS — completed, spread across billing periods
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.bookings (
  id, user_id, vendor_id,
  booking_date, booking_time,
  status, booking_type,
  created_at
) VALUES

  -- ── Period 1 : Oct 2025  (4 bookings → 300 EGP) ─────────────────────────
  ('b0000001-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-10-04', '09:00', 'completed', 'routine_maintenance', '2025-10-03 18:00:00+00'),
  ('b0000001-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-10-10', '11:00', 'completed', 'inspection',          '2025-10-09 10:00:00+00'),
  ('b0000001-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-10-18', '14:00', 'completed', 'routine_maintenance', '2025-10-17 12:00:00+00'),
  ('b0000001-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-10-25', '10:00', 'completed', 'inspection',          '2025-10-24 09:00:00+00'),

  -- ── Period 2 : Nov 2025  (3 bookings → 225 EGP) ─────────────────────────
  ('b0000001-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-11-06', '09:30', 'completed', 'routine_maintenance', '2025-11-05 17:00:00+00'),
  ('b0000001-2222-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-11-14', '11:00', 'completed', 'routine_maintenance', '2025-11-13 10:00:00+00'),
  ('b0000001-2222-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-11-28', '15:00', 'completed', 'inspection',          '2025-11-27 08:00:00+00'),

  -- ── Period 3 : Dec 2025  (5 bookings → 375 EGP) ─────────────────────────
  ('b0000001-3333-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-12-03', '10:00', 'completed', 'routine_maintenance', '2025-12-02 19:00:00+00'),
  ('b0000001-3333-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-12-09', '09:00', 'completed', 'routine_maintenance', '2025-12-08 11:00:00+00'),
  ('b0000001-3333-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-12-15', '14:00', 'completed', 'inspection',          '2025-12-14 16:00:00+00'),
  ('b0000001-3333-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-12-22', '11:00', 'completed', 'routine_maintenance', '2025-12-21 09:00:00+00'),
  ('b0000001-3333-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2025-12-29', '10:30', 'completed', 'inspection',          '2025-12-28 14:00:00+00'),

  -- ── Period 4 : Jan 2026  (2 bookings → 150 EGP) ─────────────────────────
  ('b0000001-4444-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-01-12', '09:00', 'completed', 'routine_maintenance', '2026-01-11 13:00:00+00'),
  ('b0000001-4444-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-01-27', '13:00', 'completed', 'routine_maintenance', '2026-01-26 10:00:00+00'),

  -- ── Period 5 : Feb 2026  (4 bookings → 300 EGP) ─────────────────────────
  ('b0000001-5555-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-02-05', '10:00', 'completed', 'routine_maintenance', '2026-02-04 18:00:00+00'),
  ('b0000001-5555-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-02-12', '11:30', 'completed', 'inspection',          '2026-02-11 09:00:00+00'),
  ('b0000001-5555-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-02-18', '09:00', 'completed', 'inspection',          '2026-02-17 12:00:00+00'),
  ('b0000001-5555-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-02-25', '14:00', 'completed', 'routine_maintenance', '2026-02-24 11:00:00+00'),

  -- ── Current period : Mar 2026  (2 bookings — not billed yet) ─────────────
  ('b0000001-6666-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-03-08', '10:00', 'completed',  'routine_maintenance', '2026-03-07 17:00:00+00'),
  ('b0000001-6666-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '2026-03-15', '11:00', 'booked',     'routine_maintenance', '2026-03-14 09:00:00+00')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. PRE-GENERATE BILLING RECORDS
--    (skip this block if you want the vendor billing page to trigger them
--     automatically via POST /api/vendor/billing/ensure on first open)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.service_center_billing (
  vendor_id,
  period_start, period_end,
  bookings_count, booking_fee, total_booking_fees,
  subscription_fee, total_fees_due,
  payment_status
) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', '2025-10-01', '2025-10-31', 4, 75, 300, 0, 300, 'pending'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '2025-11-01', '2025-11-30', 3, 75, 225, 0, 225, 'pending'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '2025-12-01', '2025-12-31', 5, 75, 375, 0, 375, 'pending'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '2026-01-01', '2026-01-31', 2, 75, 150, 0, 150, 'pending'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '2026-02-01', '2026-02-28', 4, 75, 300, 0, 300, 'paid')
ON CONFLICT DO NOTHING;

-- Mark the Feb bill as paid (demo: one paid invoice in history)
UPDATE public.service_center_billing
SET payment_status = 'paid',
    payment_date   = '2026-03-02 10:00:00+00',
    notes          = 'Bank transfer — ref TXN-2026-0302'
WHERE vendor_id    = 'bbbbbbbb-0000-0000-0000-000000000001'
  AND period_start = '2026-02-01';
