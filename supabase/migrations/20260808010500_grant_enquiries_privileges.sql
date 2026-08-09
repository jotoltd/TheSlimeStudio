-- Grant explicit privileges and reload PostgREST schema cache
grant usage on schema public to anon, authenticated;
grant select, insert on public.enquiries to anon;
grant select, delete on public.enquiries to authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
