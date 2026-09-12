-- Update slot capacity from 5 to 10 (max daily bookings stays at 5)
update public.booking_settings
set slot_capacity = 10,
    updated_at = now()
where id = 1;
