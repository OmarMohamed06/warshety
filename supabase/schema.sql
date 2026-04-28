-- ═══════════════════════════════════════════════════════════════════════════
-- GARAGE EGYPT — Supabase Database Schema
-- Run this entire file in your Supabase SQL editor to bootstrap the database.
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

create type user_role as enum ('customer', 'vendor', 'admin');
create type vendor_type as enum ('service_center', 'parts_seller');
create type vendor_status as enum ('pending', 'approved', 'suspended', 'rejected');

create type booking_status as enum (
  'booked',
  'confirmed',
  'checked_in',
  'in_progress',
  'waiting_parts',
  'ready_for_pickup',
  'completed',
  'cancelled'
);

create type booking_type as enum (
  'routine_maintenance',
  'inspection'
);

create type order_status as enum (
  'pending',
  'paid',
  'shipped',
  'completed',
  'cancelled'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.users is 'Customer and vendor profiles linked to Supabase Auth.';

-- ─────────────────────────────────────────────────────────────────────────────
-- VENDORS
-- ─────────────────────────────────────────────────────────────────────────────

create table public.vendors (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references public.users(id) on delete cascade,
  business_name        text not null,
  vendor_type          vendor_type not null,
  status               vendor_status not null default 'pending',
  phone                text,
  email                text,
  address              text,
  city                 text,
  logo_url             text,
  cover_image_url      text,
  commercial_reg_no    text,
  tax_id               text,
  description          text,
  rating               numeric(3,2) default 0,
  total_reviews        int default 0,
  completed_bookings   int default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.vendors is 'Approved vendor profiles. vendor_type determines which dashboard modules are shown.';

-- ─────────────────────────────────────────────────────────────────────────────
-- VEHICLES (customer garage)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.vehicles (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  make         text not null,
  model        text not null,
  year         int not null,
  trim         text,
  engine_code  text,
  color        text,
  plate_number text,
  mileage      int,
  is_default   boolean default false,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICES (offered by service centers)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.services (
  id               uuid primary key default uuid_generate_v4(),
  vendor_id        uuid not null references public.vendors(id) on delete cascade,
  name             text not null,
  description      text,
  price            numeric(10,2) not null,
  duration_minutes int,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────────

create table public.bookings (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  vendor_id     uuid not null references public.vendors(id),
  vehicle_id    uuid references public.vehicles(id),
  service_id    uuid references public.services(id),
  booking_date  date not null,
  booking_time  time,
  status        booking_status not null default 'booked',
  booking_type  booking_type not null default 'inspection',
  mileage       int,
  notes         text,
  total_price   numeric(10,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.bookings is 'Service bookings made by customers. Only service_center vendors can update status.';

-- ─────────────────────────────────────────────────────────────────────────────
-- BOOKING STATUS HISTORY (live tracking timeline)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.booking_status_history (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  status      booking_status not null,
  note        text,
  changed_by  uuid references public.users(id),
  changed_at  timestamptz not null default now()
);

comment on table public.booking_status_history is 'Immutable audit log of every booking status transition for the live tracking timeline.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS (parts seller inventory)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.products (
  id            uuid primary key default uuid_generate_v4(),
  vendor_id     uuid not null references public.vendors(id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric(10,2) not null,
  original_price numeric(10,2),
  category      text not null,
  subcategory   text,
  sku           text,
  oem_number    text,
  brand         text,
  condition     text not null default 'new', -- new | used | refurbished
  stock         int not null default 0,
  image_url     text,
  images        text[] default '{}',
  active        boolean not null default true,
  compatible_vehicles text[] default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────

create table public.orders (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  status         order_status not null default 'pending',
  total_amount   numeric(10,2) not null,
  shipping_fee   numeric(10,2) default 0,
  discount       numeric(10,2) default 0,
  promo_code     text,
  delivery_name  text,
  delivery_phone text,
  delivery_address text,
  delivery_city  text,
  payment_method text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────────

create table public.order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id),
  vendor_id   uuid references public.vendors(id),
  name        text not null, -- snapshot at time of purchase
  sku         text,
  quantity    int not null,
  unit_price  numeric(10,2) not null,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VENDOR ONBOARDING APPLICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

create table public.vendor_applications (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.users(id),
  business_name     text not null,
  vendor_type       vendor_type not null,
  owner_name        text not null,
  email             text not null,
  phone             text not null,
  city              text,
  address           text,
  commercial_reg_no text,
  tax_id            text,
  description       text,
  step_completed    int default 1, -- tracks onboarding progress
  status            vendor_status default 'pending',
  submitted_at      timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid references public.users(id),
  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-insert booking_status_history on booking creation
create or replace function public.log_booking_status_change()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT') or (OLD.status <> NEW.status) then
    insert into public.booking_status_history (booking_id, status, changed_by)
    values (NEW.id, NEW.status, NEW.user_id);
  end if;
  return NEW;
end;
$$;

create or replace trigger on_booking_status_change
  after insert or update on public.bookings
  for each row execute procedure public.log_booking_status_change();

-- Update updated_at timestamps automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin NEW.updated_at = now(); return NEW; end;
$$;

create trigger set_updated_at_bookings
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_orders
  before update on public.orders
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_products
  before update on public.products
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_vendors
  before update on public.vendors
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.vendors enable row level security;
alter table public.vehicles enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.vendor_applications enable row level security;

-- Helper: get the current user's role
create or replace function public.get_my_role()
returns user_role
language sql stable
as $$
  select role from public.users where id = auth.uid();
$$;

-- Helper: get the current user's vendor id
create or replace function public.get_my_vendor_id()
returns uuid
language sql stable
as $$
  select id from public.vendors where user_id = auth.uid() limit 1;
$$;

-- ── users ──────────────────────────────────────────────────────────────────
create policy "Users can read own profile"
  on public.users for select
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "Users can update own profile"
  on public.users for update
  using (id = auth.uid());

create policy "Admin full access on users"
  on public.users for all
  using (public.get_my_role() = 'admin');

-- ── vendors ────────────────────────────────────────────────────────────────
create policy "Public can view approved vendors"
  on public.vendors for select
  using (status = 'approved' or user_id = auth.uid() or public.get_my_role() = 'admin');

create policy "Vendors can update own record"
  on public.vendors for update
  using (user_id = auth.uid());
-- Allows authenticated users to insert their own vendor row during invite-based onboarding.
-- The service-role key used in adminActions.ts bypasses RLS entirely.
create policy "Authenticated users can create own vendor record"
  on public.vendors for insert
  with check (user_id = auth.uid());
create policy "Admin full access on vendors"
  on public.vendors for all
  using (public.get_my_role() = 'admin');

-- ── vehicles ───────────────────────────────────────────────────────────────
create policy "Users manage their own vehicles"
  on public.vehicles for all
  using (user_id = auth.uid() or public.get_my_role() = 'admin');

-- ── services ───────────────────────────────────────────────────────────────
create policy "Public can read active services"
  on public.services for select
  using (active = true or public.get_my_role() in ('vendor', 'admin'));

create policy "Vendors manage their own services"
  on public.services for all
  using (vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

-- ── bookings ───────────────────────────────────────────────────────────────
create policy "Customers see their own bookings"
  on public.bookings for select
  using (user_id = auth.uid() or vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

create policy "Customers can create bookings"
  on public.bookings for insert
  with check (user_id = auth.uid());

create policy "Service centers update their bookings"
  on public.bookings for update
  using (vendor_id = public.get_my_vendor_id() or user_id = auth.uid() or public.get_my_role() = 'admin');

-- ── booking_status_history ─────────────────────────────────────────────────
create policy "Anyone with booking access can read history"
  on public.booking_status_history for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.user_id = auth.uid() or b.vendor_id = public.get_my_vendor_id())
    )
    or public.get_my_role() = 'admin'
  );

-- ── products ───────────────────────────────────────────────────────────────
create policy "Public can read active products"
  on public.products for select
  using (active = true or vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

create policy "Parts sellers manage their own products"
  on public.products for all
  using (vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

-- ── orders ─────────────────────────────────────────────────────────────────
create policy "Customers see their own orders"
  on public.orders for select
  using (user_id = auth.uid() or public.get_my_role() = 'admin');

create policy "Customers can create orders"
  on public.orders for insert
  with check (user_id = auth.uid());

create policy "Admin can update orders"
  on public.orders for update
  using (public.get_my_role() = 'admin');

-- ── order_items ────────────────────────────────────────────────────────────
create policy "Users see their own order items"
  on public.order_items for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or vendor_id = public.get_my_vendor_id()
    or public.get_my_role() = 'admin'
  );

create policy "Insert order items with valid order"
  on public.order_items for insert
  with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ── vendor_applications ────────────────────────────────────────────────────
create policy "Applicants see their own application"
  on public.vendor_applications for select
  using (user_id = auth.uid() or public.get_my_role() = 'admin');

create policy "Anyone can submit application"
  on public.vendor_applications for insert
  with check (true);

create policy "Admin manages applications"
  on public.vendor_applications for update
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME — Enable for live tracking
-- ─────────────────────────────────────────────────────────────────────────────

-- Run this in Supabase Dashboard → Database → Replication
-- or uncomment here if using supabase CLI migrations:
-- alter publication supabase_realtime add table public.bookings;
-- alter publication supabase_realtime add table public.booking_status_history;
-- alter publication supabase_realtime add table public.orders;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────────────────────

create index idx_bookings_user_id on public.bookings(user_id);
create index idx_bookings_vendor_id on public.bookings(vendor_id);
create index idx_bookings_status on public.bookings(status);
create index idx_booking_history_booking_id on public.booking_status_history(booking_id);
create index idx_products_vendor_id on public.products(vendor_id);
create index idx_products_category on public.products(category);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_vendor_id on public.order_items(vendor_id);
create index idx_vendors_status on public.vendors(status);
create index idx_vendors_type on public.vendors(vendor_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- VENDOR WORKING HOURS
-- ─────────────────────────────────────────────────────────────────────────────

create table public.vendor_working_hours (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references public.vendors(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sun … 6=Sat
  open_time   time not null default '08:00',
  close_time  time not null default '20:00',
  is_open     boolean not null default true,
  unique (vendor_id, day_of_week)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SLOT OVERRIDES  — vendor manually opens or blocks individual slots / days
-- ─────────────────────────────────────────────────────────────────────────────

create type slot_override_type as enum ('blocked', 'opened');

create table public.slot_overrides (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references public.vendors(id) on delete cascade,
  date        date not null,
  -- NULL means the override applies to the whole day, not a single slot
  time        time,
  type        slot_override_type not null,
  note        text,
  created_at  timestamptz not null default now(),
  -- prevent duplicate overrides for same vendor/date/time
  unique (vendor_id, date, time)
);

create index idx_slot_overrides_vendor_date on public.slot_overrides(vendor_id, date);

-- RLS
alter table public.vendor_working_hours enable row level security;
alter table public.slot_overrides enable row level security;

create policy "Public can read working hours"
  on public.vendor_working_hours for select using (true);

create policy "Vendor manages own working hours"
  on public.vendor_working_hours for all
  using (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

create policy "Public can read slot overrides"
  on public.slot_overrides for select using (true);

create policy "Vendor manages own slot overrides"
  on public.slot_overrides for all
  using (
    vendor_id in (
      select id from public.vendors where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────

create table public.reviews (
  id           uuid primary key default uuid_generate_v4(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  vendor_id    uuid not null references public.vendors(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  comment      text,
  vendor_reply text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (booking_id)   -- one review per booking
);

create index idx_reviews_vendor_id on public.reviews(vendor_id);
create index idx_reviews_user_id   on public.reviews(user_id);

create trigger set_updated_at_reviews
  before update on public.reviews
  for each row execute procedure public.set_updated_at();

alter table public.reviews enable row level security;

create policy "Public can read reviews"
  on public.reviews for select using (true);

create policy "Users can submit their own review"
  on public.reviews for insert
  with check (user_id = auth.uid());

create policy "Users can update their own review"
  on public.reviews for update
  using (user_id = auth.uid());

create policy "Vendor can reply to their reviews"
  on public.reviews for update
  using (vendor_id = public.get_my_vendor_id());

create policy "Admin full access on reviews"
  on public.reviews for all
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

create type notification_type as enum (
  'booking_confirmed',
  'booking_cancelled',
  'booking_status_changed',
  'order_shipped',
  'order_status_changed',
  'message_received',
  'review_reply',
  'vendor_approved',
  'vendor_rejected'
);

create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text not null,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;

create policy "Users see their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

create policy "Users mark own notifications read"
  on public.notifications for update
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO PARTS CATALOG (TecDoc-style product catalog)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.catalog_products (
  id                       uuid primary key default uuid_generate_v4(),
  slug                     text not null unique,
  name                     text not null,
  brand                    text not null,
  manufacturer             text not null,
  manufacturer_part_number text not null,
  ean                      text,
  brand_class              text,   -- 'Premium' | 'OEM' | 'Aftermarket'
  category                 text not null,
  description              text,
  image_url                text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index idx_catalog_products_slug     on public.catalog_products(slug);
create index idx_catalog_products_category on public.catalog_products(category);
create index idx_catalog_products_brand    on public.catalog_products(brand);

create trigger set_updated_at_catalog_products
  before update on public.catalog_products
  for each row execute procedure public.set_updated_at();

-- Product key-value specification attributes
create table public.product_specifications (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.catalog_products(id) on delete cascade,
  spec_name   text not null,
  spec_value  text not null,
  sort_order  int not null default 0
);

create index idx_product_specs_product_id on public.product_specifications(product_id);

-- Vehicle fitment / compatibility data
create table public.compatible_vehicles (
  id                      uuid primary key default uuid_generate_v4(),
  product_id              uuid not null references public.catalog_products(id) on delete cascade,
  make                    text not null,
  model                   text not null,
  generation              text,
  engine                  text,
  engine_code             text,
  fuel_type               text,
  power_hp                int,
  power_kw                int,
  engine_displacement_cc  int,
  body_type               text,
  drive_type              text,
  transmission            text,
  year_from               int,
  year_to                 int
);

create index idx_compat_vehicles_product_id on public.compatible_vehicles(product_id);
create index idx_compat_vehicles_make_model on public.compatible_vehicles(make, model);

-- OE cross-reference numbers
create table public.oe_numbers (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references public.catalog_products(id) on delete cascade,
  manufacturer text not null,
  oe_number    text not null
);

create index idx_oe_numbers_product_id on public.oe_numbers(product_id);
create index idx_oe_numbers_oe_number  on public.oe_numbers(oe_number);

-- RLS — catalog is public read, admin write
alter table public.catalog_products      enable row level security;
alter table public.product_specifications enable row level security;
alter table public.compatible_vehicles   enable row level security;
alter table public.oe_numbers            enable row level security;

create policy "Public can read catalog products"      on public.catalog_products      for select using (true);
create policy "Public can read product specifications" on public.product_specifications for select using (true);
create policy "Public can read compatible vehicles"   on public.compatible_vehicles   for select using (true);
create policy "Public can read OE numbers"            on public.oe_numbers            for select using (true);

create policy "Admin manages catalog products"        on public.catalog_products      for all using (public.get_my_role() = 'admin');
create policy "Admin manages product specifications"  on public.product_specifications for all using (public.get_my_role() = 'admin');
create policy "Admin manages compatible vehicles"     on public.compatible_vehicles   for all using (public.get_my_role() = 'admin');
create policy "Admin manages OE numbers"              on public.oe_numbers            for all using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- VENDOR PRODUCTS — Vendor-managed listings (separate from catalog)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.vendor_products (
  id                       uuid primary key default uuid_generate_v4(),
  vendor_id                uuid not null references public.vendors(id) on delete cascade,
  name                     text not null,
  brand                    text,
  manufacturer             text,
  manufacturer_part_number text,
  ean                      text,
  category                 text,
  subcategory              text,
  description              text,
  price                    numeric(10,2) not null,
  stock_quantity           int not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index idx_vendor_products_vendor_id on public.vendor_products(vendor_id);
create index idx_vendor_products_category  on public.vendor_products(category);

create trigger set_updated_at_vendor_products
  before update on public.vendor_products
  for each row execute procedure public.set_updated_at();

-- Product images (ordered gallery)
create table public.vendor_product_images (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.vendor_products(id) on delete cascade,
  image_url   text not null,
  position    int not null default 0
);

create index idx_vp_images_product_id on public.vendor_product_images(product_id);

-- Vehicle compatibility for vendor products
create table public.product_vehicles (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.vendor_products(id) on delete cascade,
  make        text,
  model       text,
  engine      text,
  fuel_type   text,
  power_hp    int,
  year_from   int,
  year_to     int
);

create index idx_product_vehicles_product_id on public.product_vehicles(product_id);

-- OE numbers for vendor products
create table public.product_oe_numbers (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references public.vendor_products(id) on delete cascade,
  manufacturer text,
  oe_number    text
);

create index idx_product_oe_product_id on public.product_oe_numbers(product_id);

-- RLS
alter table public.vendor_products        enable row level security;
alter table public.vendor_product_images  enable row level security;
alter table public.product_vehicles       enable row level security;
alter table public.product_oe_numbers     enable row level security;

create policy "Public can read active vendor products"
  on public.vendor_products for select using (stock_quantity >= 0);

create policy "Vendors manage their own products"
  on public.vendor_products for all
  using (vendor_id = public.get_my_vendor_id() or public.get_my_role() = 'admin');

create policy "Public can read vendor product images"
  on public.vendor_product_images for select using (true);

create policy "Vendors manage their own product images"
  on public.vendor_product_images for all
  using (
    product_id in (select id from public.vendor_products where vendor_id = public.get_my_vendor_id())
    or public.get_my_role() = 'admin'
  );

create policy "Public can read product vehicles"
  on public.product_vehicles for select using (true);

create policy "Vendors manage their own product vehicles"
  on public.product_vehicles for all
  using (
    product_id in (select id from public.vendor_products where vendor_id = public.get_my_vendor_id())
    or public.get_my_role() = 'admin'
  );

create policy "Public can read product OE numbers"
  on public.product_oe_numbers for select using (true);

create policy "Vendors manage their own product OE numbers"
  on public.product_oe_numbers for all
  using (
    product_id in (select id from public.vendor_products where vendor_id = public.get_my_vendor_id())
    or public.get_my_role() = 'admin'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME — Enable for live tracking and messaging
-- ─────────────────────────────────────────────────────────────────────────────

-- Run these in Supabase Dashboard → Database → Replication, or via CLI:
-- alter publication supabase_realtime add table public.bookings;
-- alter publication supabase_realtime add table public.booking_status_history;
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.notifications;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROMO CODES
-- ─────────────────────────────────────────────────────────────────────────────

create type discount_type as enum ('percentage', 'fixed');

create table public.promo_codes (
  id                uuid primary key default uuid_generate_v4(),
  code              text not null unique,
  discount_type     discount_type not null,
  discount_value    numeric(10,2) not null,
  min_order_amount  numeric(10,2),
  max_uses          int,
  current_uses      int not null default 0,
  active            boolean not null default true,
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

create policy "Public can read active promo codes"
  on public.promo_codes for select
  using (active = true);

create policy "Admin manages promo codes"
  on public.promo_codes for all
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- WISHLIST
-- ─────────────────────────────────────────────────────────────────────────────

create table public.wishlist (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.catalog_products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index idx_wishlist_user_id on public.wishlist(user_id);

alter table public.wishlist enable row level security;

create policy "Users manage their own wishlist"
  on public.wishlist for all
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- SAVED ADDRESSES
-- ─────────────────────────────────────────────────────────────────────────────

create table public.addresses (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  label        text not null default 'Home',
  full_name    text not null,
  phone        text not null,
  address_line text not null,
  city         text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_addresses_user_id on public.addresses(user_id);

alter table public.addresses enable row level security;

create policy "Users manage their own addresses"
  on public.addresses for all
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- MAINTENANCE RECORDS (vehicle history log)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.maintenance_records (
  id           uuid primary key default uuid_generate_v4(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  booking_id   uuid references public.bookings(id) on delete set null,
  service_type text not null,
  description  text,
  mileage      int,
  service_date date not null,
  cost         numeric(10,2),
  vendor_name  text,
  created_at   timestamptz not null default now()
);

create index idx_maintenance_vehicle_id on public.maintenance_records(vehicle_id);
create index idx_maintenance_user_id    on public.maintenance_records(user_id);

alter table public.maintenance_records enable row level security;

create policy "Users see their own maintenance records"
  on public.maintenance_records for all
  using (user_id = auth.uid() or public.get_my_role() = 'admin');

-- Auto-insert maintenance record when a booking is completed
create or replace function public.log_completed_booking_maintenance()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'completed' and OLD.status <> 'completed' then
    -- Increment vendor completed_bookings counter
    update public.vendors
    set completed_bookings = completed_bookings + 1
    where id = NEW.vendor_id;

    -- Insert maintenance record if vehicle is linked
    if NEW.vehicle_id is not null then
      insert into public.maintenance_records
        (vehicle_id, user_id, booking_id, service_type, service_date, cost)
      values (
        NEW.vehicle_id,
        NEW.user_id,
        NEW.id,
        coalesce(
          (select name from public.services where id = NEW.service_id),
          'Service'
        ),
        NEW.booking_date,
        NEW.total_price
      );
    end if;
  end if;
  return NEW;
end;
$$;

create trigger on_booking_completed
  after update on public.bookings
  for each row execute procedure public.log_completed_booking_maintenance();

-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES (parts & service navigation taxonomy)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  parent_id   uuid references public.categories(id) on delete set null,
  type        text not null check (type in ('parts', 'service')),
  icon        text,
  image_url   text,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index idx_categories_parent_id  on public.categories(parent_id);
create index idx_categories_type       on public.categories(type);
create index idx_categories_slug       on public.categories(slug);

alter table public.categories enable row level security;

create policy "Public can read active categories"
  on public.categories for select
  using (active = true);

create policy "Admin manages categories"
  on public.categories for all
  using (public.get_my_role() = 'admin');


