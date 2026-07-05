-- ═══════════════════════════════════════════════════════════════════════════
-- LOYALTY FULL RULES MIGRATION
-- Implements all four earning mechanisms:
--   1. Booking reward (service-type points, chosen by vendor on completion)
--   2. First booking bonus (+300)
--   3. Review reward (+50, min chars enforced in app layer)
--   4. Referral program (referrer +500, friend +250, on friend's first booking)
--
-- Run AFTER rewards_schema.sql and rewards_per_booking_migration.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend points_transaction_type enum
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.points_transaction_type ADD VALUE IF NOT EXISTS 'first_booking_bonus';
ALTER TYPE public.points_transaction_type ADD VALUE IF NOT EXISTS 'review_reward';
ALTER TYPE public.points_transaction_type ADD VALUE IF NOT EXISTS 'referral_reward';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. service_type_points — admin-managed service → points catalogue
--    (referenced by vendor bookings page service picker and /api/bookings/award-points)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_type_points (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  name_ar    text,
  points     integer NOT NULL CHECK (points > 0),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_type_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active service type points" ON public.service_type_points;
CREATE POLICY "public read active service type points" ON public.service_type_points
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin manage service type points" ON public.service_type_points;
CREATE POLICY "admin manage service type points" ON public.service_type_points
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed default service types (idempotent — skip if name already exists)
INSERT INTO public.service_type_points (name, name_ar, points)
SELECT v.name, v.name_ar, v.points
FROM (VALUES
  ('Oil Change',              'تغيير الزيت',            100),
  ('Brake Service',           'خدمة الفرامل',           180),
  ('AC Service',              'خدمة التكييف',            150),
  ('Inspection',              'فحص شامل',                60),
  ('Tire Service',            'خدمة الإطارات',           80),
  ('Engine Service',          'خدمة المحرك',             200),
  ('Battery Replacement',     'استبدال البطارية',         70),
  ('Transmission Service',    'خدمة ناقل الحركة',        220),
  ('Suspension & Alignment',  'تعليق وضبط زوايا',        130),
  ('Electrical Diagnostics',  'تشخيص كهربائي',           90)
) AS v(name, name_ar, points)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_type_points stp WHERE stp.name = v.name
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. increment_user_points — atomic RPC used by all API routes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_user_points(
  p_user_id uuid,
  p_points  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
     SET total_points = total_points + p_points
   WHERE id = p_user_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. award_first_booking_bonus
--    Call after a booking reaches 'completed'. Awards 300 points only on the
--    customer's very first completed booking. Returns points awarded (0 or 300).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_first_booking_bonus(
  p_user_id    uuid,
  p_booking_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bonus           integer := 300;
  v_completed_count integer;
  v_already_awarded boolean;
BEGIN
  -- Idempotency: check if bonus was already issued for this user
  SELECT EXISTS(
    SELECT 1 FROM public.points_transactions
     WHERE user_id = p_user_id
       AND type    = 'first_booking_bonus'
  ) INTO v_already_awarded;

  IF v_already_awarded THEN
    RETURN 0;
  END IF;

  -- Only award when exactly 1 completed booking exists (this one)
  SELECT count(*)
    INTO v_completed_count
    FROM public.bookings
   WHERE user_id = p_user_id
     AND status  = 'completed';

  IF v_completed_count <> 1 THEN
    RETURN 0;
  END IF;

  -- Credit balance
  UPDATE public.users
     SET total_points = total_points + v_bonus
   WHERE id = p_user_id;

  -- Audit row
  INSERT INTO public.points_transactions (user_id, points, type, reference_id, note)
  VALUES (p_user_id, v_bonus, 'first_booking_bonus', p_booking_id,
          'First completed booking bonus');

  RETURN v_bonus;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Referral infrastructure
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. Add referral_code column to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

COMMENT ON COLUMN public.users.referral_code IS
  'Unique 8-char referral code shared by this user to invite friends.';

-- 5b. Backfill referral codes for existing users who have none
UPDATE public.users
   SET referral_code = upper(
         substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)
       )
 WHERE referral_code IS NULL;

-- 5c. Trigger: auto-assign a referral code to every new user row
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      v_code := upper(
        substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)
      );
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.users WHERE referral_code = v_code
      );
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        v_code := upper(
          substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)
        );
        EXIT;
      END IF;
    END LOOP;
    NEW.referral_code := v_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.users;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- 5d. Referrals table — tracks who referred whom (via app download)
--     The mobile app reads the referral code from the install referral / deep link
--     and calls POST /api/referral/link after the new user registers.
CREATE TABLE IF NOT EXISTS public.referrals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referee_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'rewarded')),
  rewarded_at  timestamptz,
  booking_id   uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_referee_unique UNIQUE (referee_id)  -- one code per new user
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx   ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own referrals" ON public.referrals;
CREATE POLICY "users read own referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referee_id = auth.uid());

DROP POLICY IF EXISTS "service role manage referrals" ON public.referrals;
CREATE POLICY "service role manage referrals" ON public.referrals
  FOR ALL WITH CHECK (true);

-- 5e. process_referral_reward
--    Called after a booking reaches 'completed'.
--    Awards 500 to referrer + 250 to referee ONLY on referee's first booking.
--    Returns JSON summary.
CREATE OR REPLACE FUNCTION public.process_referral_reward(
  p_referee_id uuid,
  p_booking_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral        public.referrals%ROWTYPE;
  v_completed_count integer;
  v_referrer_pts    integer := 500;
  v_referee_pts     integer := 250;
BEGIN
  -- Only fires on first completed booking for this referee
  SELECT count(*)
    INTO v_completed_count
    FROM public.bookings
   WHERE user_id = p_referee_id
     AND status  = 'completed';

  IF v_completed_count <> 1 THEN
    RETURN json_build_object('awarded', false, 'reason', 'not_first_booking');
  END IF;

  -- Find pending referral row (lock to prevent concurrent processing)
  SELECT * INTO v_referral
    FROM public.referrals
   WHERE referee_id = p_referee_id
     AND status     = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('awarded', false, 'reason', 'no_pending_referral');
  END IF;

  -- Award referrer
  UPDATE public.users
     SET total_points = total_points + v_referrer_pts
   WHERE id = v_referral.referrer_id;

  INSERT INTO public.points_transactions
    (user_id, points, type, reference_id, note)
  VALUES
    (v_referral.referrer_id, v_referrer_pts, 'referral_reward', p_booking_id,
     'Referral reward — friend completed first booking');

  -- Award referee
  UPDATE public.users
     SET total_points = total_points + v_referee_pts
   WHERE id = p_referee_id;

  INSERT INTO public.points_transactions
    (user_id, points, type, reference_id, note)
  VALUES
    (p_referee_id, v_referee_pts, 'referral_reward', p_booking_id,
     'Welcome referral bonus');

  -- Mark referral as rewarded
  UPDATE public.referrals
     SET status      = 'rewarded',
         rewarded_at = now(),
         booking_id  = p_booking_id
   WHERE id = v_referral.id;

  RETURN json_build_object(
    'awarded',         true,
    'referrer_id',     v_referral.referrer_id,
    'referrer_points', v_referrer_pts,
    'referee_points',  v_referee_pts
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Add points_rewarded flag to reviews (prevents double-granting)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS points_rewarded boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reviews.points_rewarded IS
  'True once the 50-point review_reward has been granted for this review.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. award_review_points
--    Awards 50 points for a verified review. Idempotent via points_rewarded flag.
--    p_min_chars is validated in the app layer BEFORE calling this; the function
--    trusts the caller has already checked.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_review_points(
  p_review_id uuid,
  p_user_id   uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward   integer := 50;
  v_rewarded boolean;
  v_uid      uuid;
BEGIN
  -- Confirm review exists, belongs to user, and hasn't been rewarded yet
  SELECT points_rewarded, user_id
    INTO v_rewarded, v_uid
    FROM public.reviews
   WHERE id = p_review_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN -1; -- review not found
  END IF;

  IF v_uid <> p_user_id THEN
    RETURN -2; -- unauthorized
  END IF;

  IF v_rewarded THEN
    RETURN 0; -- already rewarded
  END IF;

  -- Mark as rewarded (idempotency guard)
  UPDATE public.reviews SET points_rewarded = true WHERE id = p_review_id;

  -- Credit user balance
  UPDATE public.users
     SET total_points = total_points + v_reward
   WHERE id = p_user_id;

  -- Audit row
  INSERT INTO public.points_transactions (user_id, points, type, reference_id, note)
  VALUES (p_user_id, v_reward, 'review_reward', p_review_id,
          'Points awarded for submitting a review');

  RETURN v_reward;
END;
$$;
