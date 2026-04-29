-- ─────────────────────────────────────────────────────────────────────────────
-- public.services — bookable services offered by each service-center vendor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  branch_id        uuid REFERENCES public.vendor_branches(id) ON DELETE SET NULL,
  name             text NOT NULL,
  name_ar          text,
  description      text,
  description_ar   text,
  price            numeric(10, 2),
  duration_minutes integer,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS services_vendor_id_idx ON public.services(vendor_id);
CREATE INDEX IF NOT EXISTS services_branch_id_idx ON public.services(branch_id);
CREATE INDEX IF NOT EXISTS services_active_idx    ON public.services(vendor_id, active);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Vendors manage their own services
CREATE POLICY "vendors manage own services" ON public.services
  FOR ALL USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

-- Anyone can read active services (used by booking sidebar & search)
CREATE POLICY "public read active services" ON public.services
  FOR SELECT USING (active = true);
