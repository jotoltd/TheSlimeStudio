-- Referral codes on/off switch (defaults on — existing behaviour preserved)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS referrals_enabled boolean DEFAULT true;
