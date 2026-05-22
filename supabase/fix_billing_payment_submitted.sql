-- ═══════════════════════════════════════════════════════════════════════════
-- Add 'payment_submitted' to billing_payment_status enum
-- Run this AFTER billing_schema.sql has been applied.
-- ═══════════════════════════════════════════════════════════════════════════

-- Postgres requires adding enum values with ALTER TYPE
ALTER TYPE public.billing_payment_status ADD VALUE IF NOT EXISTS 'payment_submitted' BEFORE 'paid';
