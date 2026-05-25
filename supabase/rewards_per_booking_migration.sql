-- ═══════════════════════════════════════════════════════════════════════════
-- REWARDS — Switch from per-service points to per-booking points
-- Run in Supabase SQL editor AFTER rewards_schema.sql is applied.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add points_per_booking to vendors table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS points_per_booking integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.vendors.points_per_booking IS
  'Points automatically awarded to the customer when any booking at this service center is marked completed.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Replace award_booking_points trigger function
--    New logic: read vendor.points_per_booking — no per-service lookup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_booking_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_reward integer := 0;
BEGIN
  -- Only fire when transitioning TO 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Read the vendor-level points per booking
  SELECT v.points_per_booking
    INTO v_points_reward
    FROM public.vendors v
   WHERE v.id = NEW.vendor_id;

  IF v_points_reward IS NULL OR v_points_reward <= 0 THEN
    RETURN NEW;
  END IF;

  -- Credit user's balance
  UPDATE public.users
     SET total_points = total_points + v_points_reward
   WHERE id = NEW.user_id;

  -- Insert audit row
  INSERT INTO public.points_transactions
    (user_id, points, type, reference_id, note)
  VALUES
    (NEW.user_id, v_points_reward, 'booking_reward', NEW.id,
     'Points awarded for completed booking');

  RETURN NEW;
END;
$$;

-- Trigger already exists — recreating it re-attaches the updated function
DROP TRIGGER IF EXISTS trg_award_booking_points ON public.bookings;
CREATE TRIGGER trg_award_booking_points
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.award_booking_points();
