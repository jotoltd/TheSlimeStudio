-- Admin task board (Trello-style kanban for studio organisation)

CREATE TABLE IF NOT EXISTS public.task_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.task_cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.task_lists(id) on delete cascade,
  title text not null,
  description text,
  color text,
  due_date date,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage task lists" ON public.task_lists
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage task cards" ON public.task_cards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS task_cards_list_id_idx ON public.task_cards(list_id, position);

-- Seed a sensible starter board when empty
INSERT INTO public.task_lists (title, position)
SELECT v.title, v.position
FROM (VALUES ('To Do', 0), ('In Progress', 1), ('Done', 2)) AS v(title, position)
WHERE NOT EXISTS (SELECT 1 FROM public.task_lists);
