-- Migration: Add Bosta pickup address columns to vendors table
-- Run this in the Supabase SQL editor or via supabase db push

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS pickup_address      TEXT,
  ADD COLUMN IF NOT EXISTS pickup_city         TEXT,
  ADD COLUMN IF NOT EXISTS pickup_governorate  TEXT,
  ADD COLUMN IF NOT EXISTS pickup_district     TEXT,
  ADD COLUMN IF NOT EXISTS pickup_phone        TEXT,
  ADD COLUMN IF NOT EXISTS bosta_pickup_address_id TEXT;

COMMENT ON COLUMN vendors.pickup_address IS
  'Street address used as Bosta pickup location (e.g. "15 Ahmed Orabi St")';
COMMENT ON COLUMN vendors.pickup_city IS
  'City name for Bosta pickup, must match Bosta city list (e.g. "Cairo")';
COMMENT ON COLUMN vendors.pickup_governorate IS
  'Governorate of the pickup location';
COMMENT ON COLUMN vendors.pickup_district IS
  'District/area of the pickup location (e.g. "Nasr City")';
COMMENT ON COLUMN vendors.pickup_phone IS
  'Contact phone for Bosta courier at pickup (defaults to vendor.phone)';
COMMENT ON COLUMN vendors.bosta_pickup_address_id IS
  'Bosta businessLocationId returned after registering the pickup address with Bosta. Required before creating any shipment.';
