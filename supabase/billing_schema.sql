-- ═══════════════════════════════════════════════════════════════════════════
-- GARAGE EGYPT — Billing & Revenue Schema
-- Run in Supabase SQL editor AFTER schema.sql and admin_schema.sql.
--
-- Covers two revenue streams:
--   1. Service Centers  → fixed booking fee + optional monthly subscription
--   2. Parts Sellers    → commission per sale (%) + optional featured listing
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

create type billing_payment_status as enum ('pending', 'paid');

-- ─────────────────────────────────────────────────────────────────────────────
-- VENDOR BILLING SETTINGS
-- Per-vendor override of platform defaults.  Admins set these after approving.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.vendor_billing_settings (
  vendor_id               uuid primary key references public.vendors(id) on delete cascade,

  -- Service-center fields
  booking_fee             numeric(10,2) not null default 75,     -- EGP per booking
  subscription_fee        numeric(10,2) not null default 400,    -- EGP / month
  subscription_active     boolean       not null default false,  -- monthly plan enabled?

  -- Parts-seller fields
  commission_rate         numeric(5,2)  not null default 15,     -- % of final order
  featured_listing_fee    numeric(10,2) not null default 200,    -- EGP one-time listing
  featured_active         boolean       not null default false,  -- featured plan enabled?

  updated_by              uuid references public.users(id) on delete set null,
  created_at              timestamptz   not null default now(),
  updated_at              timestamptz   not null default now()
);

comment on table public.vendor_billing_settings is
  'Per-vendor billing configuration.  Admins set booking_fee / commission_rate after approval.';

create trigger set_updated_at_vendor_billing_settings
  before update on public.vendor_billing_settings
  for each row execute procedure public.set_updated_at();

alter table public.vendor_billing_settings enable row level security;

create policy "Vendor reads own billing settings"
  on public.vendor_billing_settings for select
  using (vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

create policy "Admin manages billing settings"
  on public.vendor_billing_settings for all
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICE CENTER BILLING  (per-period billing records)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.service_center_billing (
  id                  uuid primary key default uuid_generate_v4(),
  vendor_id           uuid not null references public.vendors(id) on delete cascade,

  -- Period covered by this bill
  period_start        date not null,
  period_end          date not null,

  -- Snapshot of rates used when the bill was generated
  bookings_count      int          not null default 0,
  booking_fee         numeric(10,2) not null default 0,   -- per-booking rate at time of billing
  total_booking_fees  numeric(10,2) not null default 0,   -- bookings_count * booking_fee
  subscription_fee    numeric(10,2) not null default 0,   -- monthly sub (0 if not active)
  total_fees_due      numeric(10,2) not null default 0,   -- total_booking_fees + subscription_fee

  -- Payment tracking
  payment_status      billing_payment_status not null default 'pending',
  payment_date        timestamptz,
  paid_by             uuid references public.users(id) on delete set null,
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Prevent duplicate billing for same period
  unique (vendor_id, period_start, period_end)
);

comment on table public.service_center_billing is
  'Monthly billing records for service centers.  Admin generates + marks paid.';

create index idx_sc_billing_vendor_id       on public.service_center_billing(vendor_id);
create index idx_sc_billing_payment_status  on public.service_center_billing(payment_status);
create index idx_sc_billing_period          on public.service_center_billing(period_start, period_end);

create trigger set_updated_at_sc_billing
  before update on public.service_center_billing
  for each row execute procedure public.set_updated_at();

alter table public.service_center_billing enable row level security;

create policy "Vendor sees own billing records"
  on public.service_center_billing for select
  using (vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

create policy "Admin manages service center billing"
  on public.service_center_billing for all
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTS SELLER TRANSACTIONS  (per-order commission records)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.parts_seller_transactions (
  id                  uuid primary key default uuid_generate_v4(),
  vendor_id           uuid not null references public.vendors(id) on delete cascade,
  order_id            uuid not null references public.orders(id) on delete cascade,

  -- Financial breakdown (snapshot at time of recording)
  order_amount        numeric(10,2) not null default 0,   -- gross order amount
  discount            numeric(10,2) not null default 0,   -- discount applied
  final_order_amount  numeric(10,2) not null default 0,   -- order_amount - discount
  commission_rate     numeric(5,2)  not null default 15,  -- % used at time of recording
  platform_share      numeric(10,2) not null default 0,   -- final_order_amount * commission_rate / 100
  vendor_share        numeric(10,2) not null default 0,   -- final_order_amount - platform_share

  -- Optional featured listing fee
  featured_listing_fee numeric(10,2) not null default 0,

  -- Payment tracking
  payment_status      billing_payment_status not null default 'pending',
  payment_date        timestamptz,
  paid_by             uuid references public.users(id) on delete set null,

  -- Refund flag (recalculate when order is refunded)
  refunded            boolean       not null default false,
  refund_amount       numeric(10,2) not null default 0,

  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- One transaction record per vendor per order
  unique (vendor_id, order_id)
);

comment on table public.parts_seller_transactions is
  'Per-order commission records for parts sellers.  Auto-created when an order is paid.';

create index idx_ps_tx_vendor_id        on public.parts_seller_transactions(vendor_id);
create index idx_ps_tx_order_id         on public.parts_seller_transactions(order_id);
create index idx_ps_tx_payment_status   on public.parts_seller_transactions(payment_status);

create trigger set_updated_at_ps_tx
  before update on public.parts_seller_transactions
  for each row execute procedure public.set_updated_at();

alter table public.parts_seller_transactions enable row level security;

create policy "Vendor sees own transactions"
  on public.parts_seller_transactions for select
  using (vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

create policy "Admin manages parts seller transactions"
  on public.parts_seller_transactions for all
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- SYSTEM SETTINGS — Billing Defaults
-- Add/update default billing configuration values.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.system_settings (key, value, description) values
  ('service_center_booking_fee',     '75',  'Default fixed fee per booking charged to service centers (EGP)'),
  ('service_center_subscription_fee','400', 'Default monthly subscription fee for premium placement (EGP)'),
  ('parts_seller_commission_pct',    '15',  'Default platform commission % on parts seller orders'),
  ('parts_seller_featured_fee',      '200', 'Default one-time featured listing fee for parts sellers (EGP)')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER VIEW: billing summary per vendor (admin convenience)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_billing_summary as
select
  v.id                                     as vendor_id,
  v.business_name,
  v.vendor_type,
  v.status                                 as vendor_status,

  -- Service-center aggregates
  count(scb.id)                            as sc_billing_count,
  coalesce(sum(scb.total_fees_due), 0)     as sc_total_fees,
  coalesce(sum(case when scb.payment_status = 'pending'
                    then scb.total_fees_due else 0 end), 0) as sc_pending_fees,
  coalesce(sum(case when scb.payment_status = 'paid'
                    then scb.total_fees_due else 0 end), 0) as sc_paid_fees,

  -- Parts-seller aggregates
  count(pst.id)                            as ps_tx_count,
  coalesce(sum(pst.platform_share), 0)     as ps_total_commission,
  coalesce(sum(case when pst.payment_status = 'pending'
                    then pst.platform_share else 0 end), 0) as ps_pending_commission,
  coalesce(sum(case when pst.payment_status = 'paid'
                    then pst.platform_share else 0 end), 0) as ps_paid_commission

from public.vendors v
left join public.service_center_billing scb on scb.vendor_id = v.id
left join public.parts_seller_transactions pst on pst.vendor_id = v.id
group by v.id, v.business_name, v.vendor_type, v.status;

comment on view public.v_billing_summary is
  'Aggregated billing totals per vendor for admin overview.';
