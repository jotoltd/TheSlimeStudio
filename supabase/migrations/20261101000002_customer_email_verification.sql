-- Customer email verification. Defaults to true so all existing accounts
-- (created before verification existed) remain usable; new registrations
-- explicitly set false until they click the verification link.
alter table public.customers
  add column if not exists email_verified boolean not null default true,
  add column if not exists email_verify_token text,
  add column if not exists email_verify_sent_at timestamptz;

create unique index if not exists customers_email_verify_token_idx
  on public.customers (email_verify_token)
  where email_verify_token is not null;
