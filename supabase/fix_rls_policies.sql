-- Run this in your Supabase SQL editor:
-- https://supabase.com/dashboard/project/ldscfwokohxoxdtyqzzz/sql

-- =============================================================================
-- FIX 1: Show pending vendors on the public services page
--         + wrap auth calls in (SELECT ...) to prevent per-row re-evaluation
-- =============================================================================

DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendors;
DROP POLICY IF EXISTS "Public can view registered vendors" ON public.vendors;
DROP POLICY IF EXISTS "Admin full access on vendors" ON public.vendors;
DROP POLICY IF EXISTS "Vendors can update own record" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can create own vendor record" ON public.vendors;

CREATE POLICY "Public can view registered vendors"
  ON public.vendors FOR SELECT
  USING (status IN ('approved','pending') OR user_id = (SELECT auth.uid()) OR (SELECT public.get_my_role()) = 'admin');

CREATE POLICY "Vendors can update own record"
  ON public.vendors FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can create own vendor record"
  ON public.vendors FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admin full access on vendors"
  ON public.vendors FOR ALL
  USING ((SELECT public.get_my_role()) = 'admin');

-- =============================================================================
-- FIX 2: services policies — (SELECT ...) wrap
-- =============================================================================

DROP POLICY IF EXISTS "Public can read active services" ON public.services;
DROP POLICY IF EXISTS "Vendors manage their own services" ON public.services;

CREATE POLICY "Public can read active services"
  ON public.services FOR SELECT
  USING (active = true OR (SELECT public.get_my_role()) IN ('vendor','admin'));

CREATE POLICY "Vendors manage their own services"
  ON public.services FOR ALL
  USING (vendor_id = (SELECT public.get_my_vendor_id()) OR (SELECT public.get_my_role()) = 'admin');

-- =============================================================================
-- FIX 3: bookings policies — (SELECT ...) wrap
-- =============================================================================

DROP POLICY IF EXISTS "Customers see their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service centers update their bookings" ON public.bookings;

CREATE POLICY "Customers see their own bookings"
  ON public.bookings FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR vendor_id = (SELECT public.get_my_vendor_id()) OR (SELECT public.get_my_role()) = 'admin');

CREATE POLICY "Customers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Service centers update their bookings"
  ON public.bookings FOR UPDATE
  USING (vendor_id = (SELECT public.get_my_vendor_id()) OR user_id = (SELECT auth.uid()) OR (SELECT public.get_my_role()) = 'admin');
