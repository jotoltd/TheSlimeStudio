-- Site theme switcher: 'default' | 'halloween'
-- Read site-wide via the existing public select policy; updated from the
-- dashboard under the existing anon update policy.
alter table public.site_settings
  add column if not exists theme text not null default 'default';
