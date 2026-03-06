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
