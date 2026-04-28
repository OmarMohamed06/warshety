-- Add branch_id to services table so services can be scoped per branch
-- Run this in the Supabase SQL editor (or via migration)

alter table public.services
  add column if not exists branch_id uuid references public.vendor_branches(id) on delete cascade;

create index if not exists idx_services_branch_id on public.services(branch_id);
