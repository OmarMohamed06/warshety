-- ═══════════════════════════════════════════════════════════════════════════
-- REWARDS & POINTS SYSTEM — Schema Migration
-- Run in Supabase SQL editor AFTER main schema is applied.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add points_reward to services table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS points_reward integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.services.points_reward IS
  'Points awarded to customer when booking this service is completed.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add total_points to users table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS total_points integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.total_points IS
  'Accumulated loyalty points balance. Never edit manually — use points_transactions.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. POINTS TRANSACTIONS — full audit trail (anti-cheat)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS points_transaction_type AS ENUM (
  'booking_reward',
  'redeem_service',
  'redeem_parts',
  'admin_adjustment'
);

CREATE TABLE IF NOT EXISTS public.points_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points         integer NOT NULL,           -- positive = earned, negative = spent
  type           points_transaction_type NOT NULL,
  reference_id   uuid,                       -- booking_id or user_reward_id
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pts_txn_user_id_idx  ON public.points_transactions(user_id);
CREATE INDEX IF NOT EXISTS pts_txn_created_idx  ON public.points_transactions(created_at DESC);

ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Users see their own transactions only
CREATE POLICY "users read own point transactions" ON public.points_transactions
  FOR SELECT USING (user_id = auth.uid());

-- Service role (backend) may insert
CREATE POLICY "service role insert point transactions" ON public.points_transactions
  FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. REWARDS CATALOGUE — admin managed
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS reward_category AS ENUM (
  'wash',
  'detailing',
  'protection',
  'inspection',
  'parts',
  'other'
);

CREATE TYPE IF NOT EXISTS reward_type AS ENUM (
  'service_reward',   -- shown as QR + code at vendor
  'parts_reward'      -- promo code at checkout
);

CREATE TABLE IF NOT EXISTS public.rewards (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  title_ar         text,
  description      text,
  description_ar   text,
  points_required  integer NOT NULL,
  category         reward_category NOT NULL DEFAULT 'other',
  type             reward_type NOT NULL,
  image_url        text,
  value            numeric(10,2),             -- EGP value or % off
  value_type       text DEFAULT 'fixed',      -- 'fixed' | 'percent'
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rewards_active_idx ON public.rewards(is_active, points_required);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Public can read active rewards
CREATE POLICY "public read active rewards" ON public.rewards
  FOR SELECT USING (is_active = true);

-- Admins manage rewards (via admin service role)
CREATE POLICY "admin manage rewards" ON public.rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. USER REWARDS — one row per redemption instance
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_id   uuid NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
  code        text NOT NULL UNIQUE,        -- e.g. WRS-9K2M8X or PART-3X92K
  qr_data     text,                        -- URL for QR code (service rewards)
  is_used     boolean NOT NULL DEFAULT false,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_rewards_user_idx ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS user_rewards_code_idx ON public.user_rewards(code);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Users see their own redeemed rewards
CREATE POLICY "users read own rewards" ON public.user_rewards
  FOR SELECT USING (user_id = auth.uid());

-- Backend can insert
CREATE POLICY "service role insert user rewards" ON public.user_rewards
  FOR INSERT WITH CHECK (true);

-- Backend can update (mark as used)
CREATE POLICY "service role update user rewards" ON public.user_rewards
  FOR UPDATE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FUNCTION — Award points when booking completes
--    Triggered by booking status update → 'completed'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_booking_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_id    uuid;
  v_points_reward integer := 0;
BEGIN
  -- Only fire when transitioning TO 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Look up service by service_key (services.name matches) or use a direct join
  -- Prefer looking up via booking's service_key mapped to services table
  SELECT s.points_reward
    INTO v_points_reward
    FROM public.services s
   WHERE s.vendor_id = NEW.vendor_id
     AND (
           s.id::text = NEW.service_key
        OR s.name     = NEW.service_key
     )
   LIMIT 1;

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

DROP TRIGGER IF EXISTS trg_award_booking_points ON public.bookings;
CREATE TRIGGER trg_award_booking_points
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.award_booking_points();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. FUNCTION — Validate & use a reward code (called from API)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.use_reward_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward   public.user_rewards%ROWTYPE;
BEGIN
  SELECT * INTO v_reward
    FROM public.user_rewards
   WHERE code = p_code
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code not found');
  END IF;

  IF v_reward.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Code already used');
  END IF;

  UPDATE public.user_rewards
     SET is_used = true, used_at = now()
   WHERE id = v_reward.id;

  RETURN json_build_object(
    'success',    true,
    'reward_id',  v_reward.reward_id,
    'user_id',    v_reward.user_id
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Seed — sample rewards catalogue
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.rewards (title, title_ar, description, points_required, category, type, value, value_type)
VALUES
  ('Free Car Wash',         'غسيل سيارة مجاني',      'Full exterior wash at any partner center',   300,  'wash',       'service_reward', 0,   'fixed'),
  ('Interior Detailing',    'تنظيف داخلي',            '20% off full interior detailing service',    800,  'detailing',  'service_reward', 20,  'percent'),
  ('Ceramic Coating 10%',   'طلاء سيراميك ١٠٪',       '10% off ceramic coating service',           1200, 'protection', 'service_reward', 10,  'percent'),
  ('Free Inspection',       'فحص مجاني',              'Full vehicle inspection at partner center',  500,  'inspection', 'service_reward', 0,   'fixed'),
  ('EGP 100 Off Parts',     '١٠٠ جنيه خصم قطع غيار', 'EGP 100 off your next parts order',         500,  'parts',      'parts_reward',   100, 'fixed'),
  ('EGP 200 Off Parts',     '٢٠٠ جنيه خصم قطع غيار', 'EGP 200 off your next parts order',         900,  'parts',      'parts_reward',   200, 'fixed')
ON CONFLICT DO NOTHING;

-- Default points_reward on popular service names (optional convenience)
UPDATE public.services SET points_reward = 50  WHERE name ILIKE '%wash%'        AND points_reward = 0;
UPDATE public.services SET points_reward = 200 WHERE name ILIKE '%detailing%'   AND points_reward = 0;
UPDATE public.services SET points_reward = 150 WHERE name ILIKE '%oil%'         AND points_reward = 0;
UPDATE public.services SET points_reward = 300 WHERE name ILIKE '%major%'       AND points_reward = 0;
UPDATE public.services SET points_reward = 100 WHERE name ILIKE '%inspect%'     AND points_reward = 0;
