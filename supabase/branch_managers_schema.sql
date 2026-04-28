-- ═══════════════════════════════════════════════════════════════════════════
-- BRANCH MANAGERS — branch_users table + access-control helpers
-- Run this file after schema.sql to add branch-level manager assignment.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM
-- ─────────────────────────────────────────────────────────────────────────────

create type branch_user_role as enum ('owner', 'manager');

-- ─────────────────────────────────────────────────────────────────────────────
-- BRANCH USERS  (relationship table: user ↔ branch with a role)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.branch_users (
  user_id    uuid not null references public.users(id)   on delete cascade,
  branch_id  uuid not null references public.vendor_branches(id) on delete cascade,
  role       branch_user_role not null default 'manager',
  assigned_by uuid references public.users(id),
  created_at timestamptz not null default now(),

  primary key (user_id, branch_id)   -- enforces uniqueness
);

comment on table public.branch_users is
  'Maps users to branches with a role. Owners assign existing users as managers; '
  'no invitation system – the user must already have an account.';

create index idx_branch_users_branch_id on public.branch_users(branch_id);
create index idx_branch_users_user_id   on public.branch_users(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.branch_users enable row level security;

-- Owners of the vendor that owns the branch can read all assignments.
-- Managers can read their own row.
create policy "branch_users: read by owner or self"
  on public.branch_users for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.vendor_branches vb
      join public.vendors v on v.id = vb.vendor_id
      where vb.id = branch_id
        and v.user_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
  );

-- Only the vendor owner (or admin) may insert assignments.
create policy "branch_users: insert by owner"
  on public.branch_users for insert
  with check (
    exists (
      select 1
      from public.vendor_branches vb
      join public.vendors v on v.id = vb.vendor_id
      where vb.id = branch_id
        and v.user_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
  );

-- Only the vendor owner (or admin) may remove assignments.
create policy "branch_users: delete by owner"
  on public.branch_users for delete
  using (
    exists (
      select 1
      from public.vendor_branches vb
      join public.vendors v on v.id = vb.vendor_id
      where vb.id = branch_id
        and v.user_id = auth.uid()
    )
    or public.get_my_role() = 'admin'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS  (used in other RLS policies to scope data to branch)
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns the set of branch IDs the current user is assigned to as manager/owner.
create or replace function public.get_my_branch_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select branch_id from public.branch_users where user_id = auth.uid();
$$;

-- Returns TRUE if the current user has manager (or owner) access to a given branch.
create or replace function public.can_access_branch(p_branch_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.branch_users
    where user_id   = auth.uid()
      and branch_id = p_branch_id
  )
  -- vendor owner always has access to their own branches
  or exists (
    select 1
    from public.vendor_branches vb
    join public.vendors v on v.id = vb.vendor_id
    where vb.id = p_branch_id
      and v.user_id = auth.uid()
  );
$$;

-- Returns TRUE if the current user is the OWNER of the branch's vendor.
create or replace function public.is_branch_owner(p_branch_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_branches vb
    join public.vendors v on v.id = vb.vendor_id
    where vb.id = p_branch_id
      and v.user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTEND EXISTING RLS POLICIES to honour branch-level access
-- ─────────────────────────────────────────────────────────────────────────────

-- Bookings: managers may read/update bookings for their assigned branches.
drop policy if exists "Customers see their own bookings"         on public.bookings;
drop policy if exists "Service centers update their bookings"    on public.bookings;

create policy "Bookings: customer, vendor owner, branch manager, or admin can read"
  on public.bookings for select
  using (
    user_id = auth.uid()
    or vendor_id = public.get_my_vendor_id()
    or (branch_id is not null and public.can_access_branch(branch_id))
    or public.get_my_role() = 'admin'
  );

create policy "Bookings: vendor owner, branch manager, or customer can update"
  on public.bookings for update
  using (
    vendor_id = public.get_my_vendor_id()
    or user_id = auth.uid()
    or (branch_id is not null and public.can_access_branch(branch_id))
    or public.get_my_role() = 'admin'
  );

-- Services: branch managers may read/update services for their branches.
drop policy if exists "Vendors manage their own services"    on public.services;

create policy "Services: vendor owner or branch manager"
  on public.services for all
  using (
    vendor_id = public.get_my_vendor_id()
    or (branch_id is not null and public.can_access_branch(branch_id))
    or public.get_my_role() = 'admin'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- BRANCH SLOT OVERRIDES: managers may manage slots for their branches.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Vendor manages own branch slot overrides" on public.branch_slot_overrides;

create policy "Branch slot overrides: owner or manager"
  on public.branch_slot_overrides for all
  using (public.can_access_branch(branch_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT TRIGGER: log branch_users changes
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.log_branch_user_change()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.booking_status_history(booking_id, status, note, changed_by)
    -- reuse the history mechanism only for bookings; skip for non-booking tables
    -- This is intentionally a no-op placeholder for audit tooling.
    select null, null, null, null where false;
  end if;
  return coalesce(NEW, OLD);
end;
$$;
