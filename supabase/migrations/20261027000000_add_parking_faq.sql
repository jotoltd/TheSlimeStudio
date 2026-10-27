-- Parking FAQ — idempotent so it's safe alongside a manual dashboard insert.
insert into public.faqs (question, answer, sort_order, is_visible)
select
  'Where can I park?',
  'The nearest car park is at Budgens — a 30-second walk from the studio. An alternative car park is at Albert Street, about a 5-minute walk away.',
  coalesce((select max(sort_order) + 1 from public.faqs), 0),
  true
where not exists (
  select 1 from public.faqs where question = 'Where can I park?'
);
