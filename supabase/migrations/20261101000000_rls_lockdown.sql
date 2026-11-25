-- RLS lockdown: the anon key must not be able to read or write customer PII,
-- payment records, admin credentials, gift-card balances, or site secrets.
-- All dashboard/admin access now goes through /api/admin/* routes which use
-- the service role (bypasses RLS). Public pages keep read-only access to
-- genuinely public content and insert-only access to enquiry/subscriber forms.

-- Helper: drop every existing policy on a table so stale permissive policies
-- can't linger.
DO $$
DECLARE t TEXT; pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admins','bookings','booking_settings','subscription_settings','subscribers',
    'enquiries','email_logs','site_content','site_settings','gift_cards',
    'gift_card_redemptions','loyalty_cards','shop_orders','products',
    'gallery_images','faqs','special_events','special_event_instances',
    'special_event_bookings','customers','discount_codes','opening_hours',
    'date_overrides','blocked_dates','shop_settings'
  ] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ===== Fully locked (service role only — no anon/authenticated policies) =====
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_event_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- ===== Public insert-only forms =====
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY enquiries_public_insert ON public.enquiries
  FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscribers_public_insert ON public.subscribers
  FOR INSERT TO anon WITH CHECK (true);

-- ===== Public read-only settings/content =====
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_settings_public_read ON public.site_settings
  FOR SELECT TO anon USING (true);

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY booking_settings_public_read ON public.booking_settings
  FOR SELECT TO anon USING (true);

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_settings_public_read ON public.subscription_settings
  FOR SELECT TO anon USING (true);

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_settings_public_read ON public.shop_settings
  FOR SELECT TO anon USING (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon USING (true);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY gallery_images_public_read ON public.gallery_images
  FOR SELECT TO anon USING (true);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY faqs_public_read ON public.faqs
  FOR SELECT TO anon USING (true);

ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY special_events_public_read ON public.special_events
  FOR SELECT TO anon USING (true);

ALTER TABLE public.special_event_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY special_event_instances_public_read ON public.special_event_instances
  FOR SELECT TO anon USING (true);

ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY opening_hours_public_read ON public.opening_hours
  FOR SELECT TO anon USING (true);

ALTER TABLE public.date_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY date_overrides_public_read ON public.date_overrides
  FOR SELECT TO anon USING (true);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocked_dates_public_read ON public.blocked_dates
  FOR SELECT TO anon USING (true);

-- ===== site_content: public copy only — secrets/PII live under reserved
-- prefixes and must never be anon-readable =====
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_content_public_read ON public.site_content
  FOR SELECT TO anon
  USING (
    key NOT LIKE 'email_%'
    AND key NOT LIKE 'unsub_%'
    AND key NOT LIKE 'google_ads_%'
    AND key NOT LIKE 'ga4_%'
    AND key NOT LIKE 'resend_%'
    AND key <> 'admin_push_broadcasts'
  );
