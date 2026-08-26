-- ─────────────────────────────────────────────────────────────────────────────
-- extend_notification_type_enum — Add missing in-app notification_type values.
--
-- The in-app `notifications` table's notification_type enum only had
-- booking_confirmed/booking_cancelled/booking_status_changed/order_*/
-- message_received/review_reply/vendor_approved/vendor_rejected. The Flutter
-- app's NotificationType.fromDb (and its notification-list UI) already expects
-- 'booking_completed', 'ready_for_pickup', 'points_earned' and 'promotion' —
-- inserting those types without this migration raises "invalid input value
-- for enum notification_type".
--
-- Run once in the Supabase SQL editor or via migration.
-- ADD VALUE IF NOT EXISTS is idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_completed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ready_for_pickup';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'points_earned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'promotion';
