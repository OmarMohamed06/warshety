-- Migration: Add Bosta shipment columns to orders table
-- Run this in the Supabase SQL editor AFTER vendor_pickup_schema.sql

-- 1. Extend order_status enum with Bosta-related statuses
--    (ALTER TYPE ... ADD VALUE is safe and cannot use IF NOT EXISTS before PG 12,
--     so each value is guarded by a DO block)
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE 'processing';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE 'order_shipped_bosta';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE 'failed_delivery';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS bosta_shipment_id   TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number      TEXT,
  ADD COLUMN IF NOT EXISTS bosta_state_code     TEXT,
  ADD COLUMN IF NOT EXISTS delivery_attempts    INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.bosta_shipment_id IS
  'Bosta internal delivery _id returned when the shipment is created';
COMMENT ON COLUMN orders.tracking_number IS
  'Bosta tracking number shown to customers (links to tracking.bosta.co)';
COMMENT ON COLUMN orders.bosta_state_code IS
  'Last Bosta state code received via webhook (e.g. "41", "45")';
COMMENT ON COLUMN orders.delivery_attempts IS
  'Number of delivery attempts reported by Bosta (incremented on NDR webhooks)';
