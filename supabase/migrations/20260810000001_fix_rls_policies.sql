-- Fix RLS policies for all public tables

-- bookings
DROP POLICY IF EXISTS "Public bookings select" ON public.bookings;
DROP POLICY IF EXISTS "Public bookings insert" ON public.bookings;
DROP POLICY IF EXISTS "Public bookings update" ON public.bookings;
DROP POLICY IF EXISTS "Public bookings delete" ON public.bookings;
CREATE POLICY "Public bookings select" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Public bookings insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public bookings update" ON public.bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public bookings delete" ON public.bookings FOR DELETE USING (true);

-- booking_settings
DROP POLICY IF EXISTS "Public booking_settings select" ON public.booking_settings;
DROP POLICY IF EXISTS "Public booking_settings update" ON public.booking_settings;
CREATE POLICY "Public booking_settings select" ON public.booking_settings FOR SELECT USING (true);
CREATE POLICY "Public booking_settings update" ON public.booking_settings FOR UPDATE USING (true) WITH CHECK (true);

-- subscription_settings
DROP POLICY IF EXISTS "Public subscription_settings select" ON public.subscription_settings;
DROP POLICY IF EXISTS "Public subscription_settings update" ON public.subscription_settings;
CREATE POLICY "Public subscription_settings select" ON public.subscription_settings FOR SELECT USING (true);
CREATE POLICY "Public subscription_settings update" ON public.subscription_settings FOR UPDATE USING (true) WITH CHECK (true);

-- subscribers
DROP POLICY IF EXISTS "Public subscribers select" ON public.subscribers;
DROP POLICY IF EXISTS "Public subscribers insert" ON public.subscribers;
DROP POLICY IF EXISTS "Public subscribers update" ON public.subscribers;
DROP POLICY IF EXISTS "Public subscribers delete" ON public.subscribers;
CREATE POLICY "Public subscribers select" ON public.subscribers FOR SELECT USING (true);
CREATE POLICY "Public subscribers insert" ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public subscribers update" ON public.subscribers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public subscribers delete" ON public.subscribers FOR DELETE USING (true);

-- enquiries
DROP POLICY IF EXISTS "Public enquiries select" ON public.enquiries;
DROP POLICY IF EXISTS "Public enquiries insert" ON public.enquiries;
CREATE POLICY "Public enquiries select" ON public.enquiries FOR SELECT USING (true);
CREATE POLICY "Public enquiries insert" ON public.enquiries FOR INSERT WITH CHECK (true);

-- email_logs
DROP POLICY IF EXISTS "Public email_logs select" ON public.email_logs;
DROP POLICY IF EXISTS "Public email_logs insert" ON public.email_logs;
CREATE POLICY "Public email_logs select" ON public.email_logs FOR SELECT USING (true);
CREATE POLICY "Public email_logs insert" ON public.email_logs FOR INSERT WITH CHECK (true);

-- site_content
DROP POLICY IF EXISTS "Public site_content select" ON public.site_content;
DROP POLICY IF EXISTS "Public site_content update" ON public.site_content;
CREATE POLICY "Public site_content select" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Public site_content update" ON public.site_content FOR UPDATE USING (true) WITH CHECK (true);

-- products
DROP POLICY IF EXISTS "Public products select" ON public.products;
CREATE POLICY "Public products select" ON public.products FOR SELECT USING (true);

-- site_settings
DROP POLICY IF EXISTS "Public site_settings select" ON public.site_settings;
DROP POLICY IF EXISTS "Public site_settings update" ON public.site_settings;
CREATE POLICY "Public site_settings select" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Public site_settings update" ON public.site_settings FOR UPDATE USING (true) WITH CHECK (true);

-- admins
DROP POLICY IF EXISTS "Public admins select" ON public.admins;
CREATE POLICY "Public admins select" ON public.admins FOR SELECT USING (true);
