-- Multiple named task boards; lists belong to a board

CREATE TABLE IF NOT EXISTS public.task_boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage task boards" ON public.task_boards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.task_lists ADD COLUMN IF NOT EXISTS board_id uuid
  REFERENCES public.task_boards(id) ON DELETE CASCADE;

-- Existing lists move onto a default board
INSERT INTO public.task_boards (name, position)
SELECT 'Main Board', 0
WHERE NOT EXISTS (SELECT 1 FROM public.task_boards);

UPDATE public.task_lists
SET board_id = (SELECT id FROM public.task_boards ORDER BY position LIMIT 1)
WHERE board_id IS NULL;

ALTER TABLE public.task_lists ALTER COLUMN board_id SET NOT NULL;
