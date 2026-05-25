-- Migration: drop_broken_order_functions_and_policies
-- 
-- The orders/order_items tables were dropped as part of the marketplace removal.
-- Three functions still referenced those dropped tables, and one of them was
-- embedded in an RLS policy on public.users.  Every SELECT on public.users
-- was failing at the PostgreSQL level (relation does not exist), which caused
-- loadProfile() in AuthContext to silently receive null, making auth appear
-- completely broken.

-- 1. Drop the broken SELECT policy on users
DROP POLICY IF EXISTS "Vendors can view profiles of their customers" ON public.users;

-- 2. Drop orphaned functions that reference dropped tables
DROP FUNCTION IF EXISTS public.vendor_has_customer_via_order(uuid);   -- used orders + order_items
DROP FUNCTION IF EXISTS public.check_vendor_has_items_in_order(uuid); -- used order_items
DROP FUNCTION IF EXISTS public.generate_product_slug();               -- used products (also dropped)
