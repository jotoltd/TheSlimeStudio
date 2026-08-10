-- Add admin_notes column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT '';
