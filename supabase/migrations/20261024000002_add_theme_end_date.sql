-- Theme scheduling: after this timestamp the site falls back to the default theme
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS theme_end_date timestamptz;
