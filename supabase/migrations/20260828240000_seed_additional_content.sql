-- Seed additional site_content keys (FAQ, Booking, Shop)
-- These were added after the initial seed migration

INSERT INTO site_content (key, value) VALUES
  ('faq_title', 'Frequently Asked Questions'),
  ('faq_subtitle', 'Everything you need to know about our sessions, products and studio.'),
  ('faq_cta_title', 'Still Got Questions?'),
  ('booking_title', 'Book a Slime-Making Session'),
  ('booking_subtitle', 'Choose Your Session'),
  ('booking_info', 'One-hour sessions, every hour. Up to 5 slime makers per slot at £15.00 per person.'),
  ('booking_walkins', 'Walk-ins also welcome, subject to space'),
  ('shop_title', 'Slime, Kits & Accessories'),
  ('shop_subtitle', 'Handmade in small batches in our Norfolk studio. Every slime is unique, scented and ready to squish.'),
  ('shop_comingsoon_title', 'Something Slimy'),
  ('shop_comingsoon_title2', 'Is Coming...'),
  ('shop_comingsoon_text1', 'We''re busy getting The Slime Studio Shop ready!'),
  ('shop_comingsoon_text2', 'Soon you''ll be able to bring the Slime Studio experience home with our range of DIY slime kits, accessories, charms, add-ins and more.'),
  ('shop_comingsoon_text3', 'Perfect for slime lovers, gifts, rainy days or simply when you need a little more slime in your life.')
ON CONFLICT (key) DO NOTHING;
