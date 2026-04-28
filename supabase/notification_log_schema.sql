-- ─────────────────────────────────────────────────────────────────────────────
-- notification_log — outbound SMS / Email delivery log + rate-limit store
-- ─────────────────────────────────────────────────────────────────────────────

-- Channel enum
create type if not exists notification_channel as enum ('sms', 'email');

-- Status enum
create type if not exists notification_send_status as enum ('sent', 'failed');

-- Outbound event type (separate from in-app notification_type to keep concerns clean)
create type if not exists outbound_notification_type as enum (
  'booking_confirmed',
  'booking_reminder',
  'car_ready',
  'order_confirmed',
  'new_booking_vendor',
  'new_order_vendor',
  'payment_due',
  'payment_overdue'
);

create table if not exists public.notification_log (
  id             uuid primary key default uuid_generate_v4(),
  -- who received it (nullable: vendor may have no user row yet)
  user_id        uuid references public.users(id) on delete set null,
  channel        notification_channel not null,
  event_type     outbound_notification_type not null,
  -- the actual phone / email address sent to
  recipient      text not null,
  -- for email: Resend message ID; for SMS: provider message SID
  provider_id    text,
  status         notification_send_status not null default 'sent',
  error_message  text,
  -- hashed (sha256) body used for dedup within a time window
  message_hash   text,
  sent_at        timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- Fast lookup for rate-limit queries: "how many sms did vendor X get for event Y today?"
create index if not exists idx_notification_log_rate_limit
  on public.notification_log (user_id, channel, event_type, sent_at);

-- RLS — only service-role key can insert/select
alter table public.notification_log enable row level security;

-- No direct client access; all writes happen server-side via service role
create policy "service_role_only" on public.notification_log
  using (false)
  with check (false);
