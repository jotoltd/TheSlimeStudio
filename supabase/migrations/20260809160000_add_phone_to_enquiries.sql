-- Add phone column to enquiries table for contact form
alter table public.enquiries add column if not exists phone text;
