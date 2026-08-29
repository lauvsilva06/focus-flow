-- Fase 2: planejamento opcional do curso e ordenação visual de assuntos.
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS target_completion_date DATE,
  ADD COLUMN IF NOT EXISTS priority TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subjects'::regclass
      AND conname = 'subjects_priority_check'
  ) THEN
    ALTER TABLE public.subjects
      ADD CONSTRAINT subjects_priority_check
      CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS position INTEGER;

WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY module_id ORDER BY created_at, id) - 1 AS new_position
  FROM public.topics
  WHERE position IS NULL
)
UPDATE public.topics t
SET position = ordered.new_position
FROM ordered
WHERE t.id = ordered.id;

ALTER TABLE public.topics ALTER COLUMN position SET DEFAULT 0;
ALTER TABLE public.topics ALTER COLUMN position SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.topics'::regclass
      AND conname = 'topics_position_nonnegative'
  ) THEN
    ALTER TABLE public.topics
      ADD CONSTRAINT topics_position_nonnegative CHECK (position >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS topics_module_position_idx
  ON public.topics (user_id, module_id, position, created_at);
