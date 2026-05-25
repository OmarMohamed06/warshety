-- ─────────────────────────────────────────────────────────────────────────────
-- fix_notification_log_enums — Add missing outbound_notification_type values.
--
-- The outbound_notification_type enum in notification_log_schema.sql was missing
-- several event types that are already referenced in outboundNotificationService.ts.
-- Without these, any call to logSend() with those event types will raise a
-- "invalid input value for enum" error (caught by the try/catch but still wrong).
--
-- Run once in the Supabase SQL editor or via migration.
-- ADD VALUE IF NOT EXISTS is idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE outbound_notification_type ADD VALUE IF NOT EXISTS 'booking_cancelled';
ALTER TYPE outbound_notification_type ADD VALUE IF NOT EXISTS 'vendor_approved';
ALTER TYPE outbound_notification_type ADD VALUE IF NOT EXISTS 'vendor_rejected';
ALTER TYPE outbound_notification_type ADD VALUE IF NOT EXISTS 'booking_completed';
ALTER TYPE outbound_notification_type ADD VALUE IF NOT EXISTS 'application_received';
ALTER TYPE outbound_notification_type ADD VALUE IF NOT EXISTS 'vendor_booking_cancelled';
