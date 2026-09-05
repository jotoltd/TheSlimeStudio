-- Add ad/marketing tracking columns to site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS fb_pixel_id text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS fb_pixel_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ga_measurement_id text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ga_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tiktok_pixel_id text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tiktok_pixel_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS google_ads_id text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS google_ads_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS snapchat_pixel_id text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS snapchat_pixel_enabled boolean NOT NULL DEFAULT false;
