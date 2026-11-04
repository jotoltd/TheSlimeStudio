-- Theme A/B testing: when enabled, visitors are randomly assigned one of the
-- variants (theme keys) and keep it on every visit. The assigned variant is
-- tagged onto bookings/gift cards as "[Theme:x]" so conversions can be
-- reported per theme. Read site-wide via the existing public select policy;
-- updated from the dashboard under the existing anon update policy.
alter table public.site_settings
  add column if not exists theme_ab_enabled boolean not null default false,
  add column if not exists theme_ab_variants text[] not null default '{}';
