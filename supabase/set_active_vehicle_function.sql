-- ─────────────────────────────────────────────────────────────────────────────
-- set_active_vehicle — atomic "set default vehicle" RPC.
--
-- The Flutter app previously did this as two separate UPDATE calls (clear
-- is_default on all of the user's vehicles, then set it on one). Two
-- sequential network round-trips are not atomic: rapid repeated taps on
-- "Set Active" (or just unlucky timing) could interleave the two calls
-- across different vehicles and leave more than one vehicle — or none —
-- flagged as is_default. A single UPDATE with a CASE-shaped assignment runs
-- as one statement in one transaction, so there is no interleaving window.
--
-- Run once in the Supabase SQL editor or via migration.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_active_vehicle(p_vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.vehicles
  SET is_default = (id = p_vehicle_id)
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_vehicle(uuid) TO authenticated;
