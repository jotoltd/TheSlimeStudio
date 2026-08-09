-- Add is_party column to distinguish party bookings from regular bookings
alter table public.bookings add column if not exists is_party boolean not null default false;

-- Update people check constraint to allow up to 15 (for birthday parties)
alter table public.bookings drop constraint if exists bookings_people_check;
alter table public.bookings add constraint bookings_people_check check (people >= 1 and people <= 15);
