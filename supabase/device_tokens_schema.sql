-- ═══════════════════════════════════════════════════════════════════════════
-- DEVICE TOKENS — push notification registration
--
-- Stores one row per (user, device) FCM registration token so the backend
-- can send push notifications alongside the in-app `notifications` rows
-- created by inAppNotificationService.ts. A user may have several rows
-- (multiple devices); a token is re-upserted on refresh and removed if the
-- app detects it's stale (Firebase reports NotRegistered on send).
--
-- Run this once against the Supabase project's SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  token      text not null unique,
  platform   text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_device_tokens_user_id on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "Users manage their own device tokens" on public.device_tokens;
create policy "Users manage their own device tokens"
  on public.device_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Service role (backend) needs to read tokens across users to send pushes —
-- it uses the service-role key, which bypasses RLS entirely, so no policy
-- is needed for that path.
