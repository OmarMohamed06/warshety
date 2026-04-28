-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN PANEL — Additional Schema
-- Run in Supabase SQL editor after the main schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLAINTS & DISPUTES
-- ─────────────────────────────────────────────────────────────────────────────

create type complaint_status as enum ('open', 'investigating', 'resolved', 'closed');
create type complaint_type as enum ('booking', 'order', 'vendor', 'payment', 'other');

create table public.complaints (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  booking_id    uuid references public.bookings(id) on delete set null,
  order_id      uuid references public.orders(id) on delete set null,
  vendor_id     uuid references public.vendors(id) on delete set null,
  type          complaint_type not null default 'other',
  subject       text not null,
  description   text not null,
  status        complaint_status not null default 'open',
  admin_notes   text,
  resolved_by   uuid references public.users(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_complaints_user_id   on public.complaints(user_id);
create index idx_complaints_status    on public.complaints(status);
create index idx_complaints_vendor_id on public.complaints(vendor_id);

create trigger set_updated_at_complaints
  before update on public.complaints
  for each row execute procedure public.set_updated_at();

alter table public.complaints enable row level security;

create policy "Users see own complaints"
  on public.complaints for select
  using (user_id = auth.uid() or public.get_my_role() = 'admin');

create policy "Users submit complaints"
  on public.complaints for insert
  with check (user_id = auth.uid());

create policy "Admin full access on complaints"
  on public.complaints for all
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- SYSTEM SETTINGS (key-value store)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.system_settings (
  key         text primary key,
  value       text not null,
  description text,
  updated_by  uuid references public.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.system_settings enable row level security;

create policy "Admin full access on settings"
  on public.system_settings for all
  using (public.get_my_role() = 'admin');

-- Seed default settings
insert into public.system_settings (key, value, description) values
  ('platform_commission_pct',    '10',     'Platform commission percentage on each booking'),
  ('booking_cancellation_hours', '24',     'Hours before booking time within which cancellation is disallowed'),
  ('max_booking_advance_days',   '30',     'Maximum days in advance a booking can be scheduled'),
  ('min_payout_amount',          '200',    'Minimum payout amount to vendors (EGP)'),
  ('maintenance_mode',           'false',  'Put the site in maintenance mode (true/false)'),
  ('new_user_bonus',             '0',      'Credit given to new users on signup (EGP)'),
  ('delivery_base_fee',          '50',     'Default shipping/delivery base fee (EGP)'),
  ('free_delivery_threshold',    '1000',   'Order amount above which delivery is free (EGP)'),
  ('review_flagging_threshold',  '3',      'Number of reports before a review is auto-hidden')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENT TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────

create type payment_method as enum ('card', 'cod', 'wallet', 'bank_transfer');
create type payment_status as enum ('pending', 'completed', 'failed', 'refunded', 'partially_refunded');
create type payment_reference_type as enum ('order', 'booking');

create table public.payment_transactions (
  id             uuid primary key default uuid_generate_v4(),
  reference_type payment_reference_type not null,
  reference_id   uuid not null,          -- order_id or booking_id
  user_id        uuid not null references public.users(id) on delete cascade,
  vendor_id      uuid references public.vendors(id) on delete set null,
  amount         numeric(10,2) not null,
  commission     numeric(10,2) default 0,
  net_to_vendor  numeric(10,2) default 0,
  method         payment_method not null default 'cod',
  status         payment_status not null default 'pending',
  gateway_ref    text,                   -- external payment gateway reference
  notes          text,
  processed_by   uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_payments_user_id      on public.payment_transactions(user_id);
create index idx_payments_vendor_id    on public.payment_transactions(vendor_id);
create index idx_payments_status       on public.payment_transactions(status);
create index idx_payments_reference    on public.payment_transactions(reference_type, reference_id);

create trigger set_updated_at_payments
  before update on public.payment_transactions
  for each row execute procedure public.set_updated_at();

alter table public.payment_transactions enable row level security;

create policy "Users see own payment transactions"
  on public.payment_transactions for select
  using (user_id = auth.uid() or vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

create policy "System can insert transactions"
  on public.payment_transactions for insert
  with check (user_id = auth.uid() or public.get_my_role() = 'admin');

create policy "Admin manages transactions"
  on public.payment_transactions for update
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN BROADCAST NOTIFICATIONS (sent by admin to users)
-- ─────────────────────────────────────────────────────────────────────────────

create type broadcast_target as enum ('all_users', 'all_vendors', 'specific_users');

create table public.admin_broadcasts (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  body        text not null,
  target      broadcast_target not null default 'all_users',
  target_ids  uuid[] default '{}',  -- used when target = 'specific_users'
  sent_by     uuid references public.users(id) on delete set null,
  sent_at     timestamptz not null default now(),
  recipient_count int default 0
);

alter table public.admin_broadcasts enable row level security;

create policy "Admin full access on broadcasts"
  on public.admin_broadcasts for all
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- VEHICLE CATALOG (makes / models / years)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.car_makes (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  name_ar    text,
  logo_url   text,
  popular    boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.car_models (
  id         uuid primary key default uuid_generate_v4(),
  make_id    uuid not null references public.car_makes(id) on delete cascade,
  name       text not null,
  year_from  int not null,
  year_to    int,  -- null = still in production
  body_type  text,
  created_at timestamptz not null default now(),
  unique (make_id, name, year_from)
);

create index idx_car_models_make_id on public.car_models(make_id);

alter table public.car_makes  enable row level security;
alter table public.car_models enable row level security;

create policy "Public can read car makes"  on public.car_makes  for select using (true);
create policy "Public can read car models" on public.car_models for select using (true);
create policy "Admin manages car makes"    on public.car_makes  for all using (public.get_my_role() = 'admin');
create policy "Admin manages car models"   on public.car_models for all using (public.get_my_role() = 'admin');

-- Seed popular makes
insert into public.car_makes (name, name_ar, popular) values
  ('Toyota',      'تويوتا',    true),
  ('Hyundai',     'هيونداي',   true),
  ('Kia',         'كيا',       true),
  ('Nissan',      'نيسان',     true),
  ('Volkswagen',  'فولكسفاغن', true),
  ('Chevrolet',   'شيفروليه',  true),
  ('Mitsubishi',  'ميتسوبيشي', true),
  ('Honda',       'هوندا',     true),
  ('BMW',         'بي إم دبليو',true),
  ('Mercedes',    'مرسيدس',    true),
  ('Peugeot',     'بيجو',      false),
  ('Renault',     'رينو',      false),
  ('Ford',        'فورد',      false),
  ('Suzuki',      'سوزوكي',    false),
  ('Jeep',        'جيب',       false)
on conflict (name) do nothing;
