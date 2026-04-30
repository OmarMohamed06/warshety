-- Extend vendor_applications with all onboarding fields
-- Run this migration to align the table with the current apply flow.

alter table public.vendor_applications
  add column if not exists governorate        text,
  add column if not exists national_id_url    text,
  add column if not exists national_id_front_url text,
  add column if not exists national_id_back_url  text,
  add column if not exists bank_name          text,
  add column if not exists account_name       text,
  add column if not exists account_number     text,
  add column if not exists iban               text,
  add column if not exists working_days       text[],
  add column if not exists open_time          text,
  add column if not exists close_time         text,
  add column if not exists specializations    text[],
  add column if not exists supported_makes    text[],
  add column if not exists delivery_options   text[],
  add column if not exists return_policy      text,
  add column if not exists maps_link          text,
  add column if not exists shop_photos        text[],
  add column if not exists terms_accepted     boolean not null default false;
