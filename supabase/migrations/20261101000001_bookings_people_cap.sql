-- Align the bookings.people CHECK constraint with the application cap
-- (MAX_BOOKING_PEOPLE = 50 in lib/booking-price.ts). The old ≤15 limit made
-- paid bookings for 16–50 people fail at INSERT time — customer charged,
-- booking never recorded.
alter table public.bookings drop constraint if exists bookings_people_check;
alter table public.bookings add constraint bookings_people_check check (people >= 1 and people <= 50);
