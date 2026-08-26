-- ─────────────────────────────────────────────────────────────────────────────
-- Enable realtime for booking status changes.
--
-- The app subscribes to postgres_changes on public.bookings in three places:
--   • components/tracking/BookingTracker.tsx  (customer live tracking)
--   • app/[lang]/vendor/bookings/page.tsx     (vendor booking list)
--   • app/[lang]/vendor/billing/page.tsx      (live period count)
--
-- Those subscriptions connect and report SUBSCRIBED even when the table is not
-- in the supabase_realtime publication — they simply never receive an event.
-- That silent no-op is why "live" updates can look broken with no error.
--
-- Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end
$$;

-- Row-level security still applies to realtime: a customer only receives
-- changes for bookings the "Customers see their own bookings" policy lets them
-- select, so no extra grants are needed.
