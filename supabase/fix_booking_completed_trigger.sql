-- Fix: trigger function must be SECURITY DEFINER so the maintenance_records
-- INSERT bypasses RLS (which otherwise blocks vendor writing customer rows).
-- Root cause: vendor auth context has uid != customer user_id, so the
-- maintenance_records RLS policy `user_id = auth.uid()` fails on INSERT,
-- rolling back the entire `status = 'completed'` update.
CREATE OR REPLACE FUNCTION public.log_completed_booking_maintenance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    -- Increment vendor completed_bookings counter
    UPDATE public.vendors
    SET completed_bookings = completed_bookings + 1
    WHERE id = NEW.vendor_id;

    -- Insert maintenance record if vehicle is linked
    -- Note: bookings table uses service_key (text slug), not service_id
    IF NEW.vehicle_id IS NOT NULL THEN
      INSERT INTO public.maintenance_records
        (vehicle_id, user_id, booking_id, service_type, service_date, cost)
      VALUES (
        NEW.vehicle_id,
        NEW.user_id,
        NEW.id,
        COALESCE(
          REPLACE(NEW.service_key, '-', ' '),
          NEW.booking_type,
          'Service'
        ),
        NEW.booking_date,
        NEW.total_price
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
