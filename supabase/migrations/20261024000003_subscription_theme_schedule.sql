-- Schedule the subscription box theme swap: on theme_change_date the
-- next_theme fields become the live theme shown on /subscribe.
ALTER TABLE public.subscription_settings ADD COLUMN IF NOT EXISTS next_theme text NOT NULL DEFAULT '';
ALTER TABLE public.subscription_settings ADD COLUMN IF NOT EXISTS next_theme_description text NOT NULL DEFAULT '';
ALTER TABLE public.subscription_settings ADD COLUMN IF NOT EXISTS theme_change_date date;
