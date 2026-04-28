-- ═══════════════════════════════════════════════════════════════════════════
-- ADD LOCATION + MISSING COLUMNS
-- Run once against your Supabase project (SQL editor or CLI migration).
-- All statements use IF NOT EXISTS / DO blocks so they are safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- vendors
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.vendors
  add column if not exists latitude          double precision,
  add column if not exists longitude         double precision,
  add column if not exists governorate       text,
  add column if not exists district          text,
  add column if not exists city_ar           text,
  add column if not exists business_name_ar  text,
  add column if not exists description_ar    text,
  add column if not exists specializations   text[] not null default '{}',
  add column if not exists supported_makes   text[] not null default '{}',
  add column if not exists approved_at       timestamptz,
  add column if not exists featured          boolean not null default false,
  add column if not exists featured_priority int;

comment on column public.vendors.latitude  is 'WGS-84 latitude of the main location. Used for map pins and Google Maps links.';
comment on column public.vendors.longitude is 'WGS-84 longitude of the main location.';

-- ─────────────────────────────────────────────────────────────────────────────
-- vendor_branches
-- ─────────────────────────────────────────────────────────────────────────────

-- vendor_branches may already exist; create it if it does not.
create table if not exists public.vendor_branches (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references public.vendors(id) on delete cascade,
  name        text not null,
  name_ar     text,
  address     text,
  city        text,
  city_ar     text,
  governorate text,
  latitude    double precision,
  longitude   double precision,
  phone       text,
  status      text not null default 'active' check (status in ('active','inactive')),
  is_main     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Add columns that may be missing if the table already existed
alter table public.vendor_branches
  add column if not exists latitude    double precision,
  add column if not exists longitude   double precision,
  add column if not exists city_ar     text,
  add column if not exists governorate text;

comment on column public.vendor_branches.latitude  is 'WGS-84 latitude. Used for map pins and Google Maps links in booking notifications.';
comment on column public.vendor_branches.longitude is 'WGS-84 longitude.';

create index if not exists idx_vendor_branches_vendor_id on public.vendor_branches(vendor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- vendor_applications
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.vendor_applications
  add column if not exists latitude    double precision,
  add column if not exists longitude   double precision,
  add column if not exists governorate text,
  add column if not exists district    text;

comment on column public.vendor_applications.latitude  is 'Captured during onboarding via map picker. Copied to vendors.latitude on approval.';
comment on column public.vendor_applications.longitude is 'WGS-84 longitude captured during onboarding.';
