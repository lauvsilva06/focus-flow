-- Fase 3: integra sessões Pomodoro à hierarquia de conteúdo sem alterar registros antigos.
ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS module_id UUID,
  ADD COLUMN IF NOT EXISTS planned_duration_minutes NUMERIC,
  ADD COLUMN IF NOT EXISTS effective_duration_minutes NUMERIC;

UPDATE public.study_sessions s
SET module_id = t.module_id
FROM public.topics t
WHERE s.topic_id = t.id AND s.module_id IS NULL;

UPDATE public.study_sessions
SET planned_duration_minutes = duration_minutes
WHERE planned_duration_minutes IS NULL;

UPDATE public.study_sessions
SET effective_duration_minutes = duration_minutes
WHERE effective_duration_minutes IS NULL;

ALTER TABLE public.study_sessions
  ALTER COLUMN planned_duration_minutes SET NOT NULL,
  ALTER COLUMN effective_duration_minutes SET NOT NULL;

-- Clientes anteriores à Fase 3 continuam podendo gravar apenas duration_minutes.
CREATE OR REPLACE FUNCTION public.sync_study_session_durations()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.planned_duration_minutes := COALESCE(NEW.planned_duration_minutes, NEW.duration_minutes);
  NEW.effective_duration_minutes := COALESCE(NEW.effective_duration_minutes, NEW.duration_minutes);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_study_session_durations() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sessions_sync_durations ON public.study_sessions;
CREATE TRIGGER sessions_sync_durations
  BEFORE INSERT OR UPDATE OF duration_minutes, planned_duration_minutes, effective_duration_minutes
  ON public.study_sessions FOR EACH ROW EXECUTE FUNCTION public.sync_study_session_durations();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.study_sessions'::regclass AND conname='study_sessions_planned_duration_range') THEN
    ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_planned_duration_range CHECK (planned_duration_minutes BETWEEN 0 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.study_sessions'::regclass AND conname='study_sessions_effective_duration_range') THEN
    ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_effective_duration_range CHECK (effective_duration_minutes BETWEEN 0 AND 180);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS topics_session_hierarchy_unique
  ON public.topics (id, module_id, subject_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_id_user_unique
  ON public.study_sessions (id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_topic_hierarchy_unique
  ON public.study_sessions (id, topic_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS topic_items_topic_owner_unique
  ON public.topic_items (id, topic_id, user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.study_sessions'::regclass AND conname='sessions_module_hierarchy_fkey') THEN
    ALTER TABLE public.study_sessions ADD CONSTRAINT sessions_module_hierarchy_fkey
      FOREIGN KEY (module_id, subject_id, user_id)
      REFERENCES public.modules(id, course_id, user_id) ON DELETE SET NULL (module_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.study_sessions'::regclass AND conname='sessions_topic_hierarchy_fkey') THEN
    ALTER TABLE public.study_sessions ADD CONSTRAINT sessions_topic_hierarchy_fkey
      FOREIGN KEY (topic_id, module_id, subject_id, user_id)
      REFERENCES public.topics(id, module_id, subject_id, user_id) ON DELETE SET NULL (topic_id, module_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS sessions_user_module_started_idx
  ON public.study_sessions (user_id, module_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.study_session_items (
  session_id UUID NOT NULL,
  item_id UUID NOT NULL,
  topic_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_during_session BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, item_id),
  CONSTRAINT session_items_session_topic_owner_fkey
    FOREIGN KEY (session_id, topic_id, user_id)
    REFERENCES public.study_sessions(id, topic_id, user_id) ON DELETE CASCADE,
  CONSTRAINT session_items_item_topic_owner_fkey
    FOREIGN KEY (item_id, topic_id, user_id)
    REFERENCES public.topic_items(id, topic_id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS session_items_user_session_idx
  ON public.study_session_items (user_id, session_id);
CREATE INDEX IF NOT EXISTS session_items_user_item_idx
  ON public.study_session_items (user_id, item_id);

ALTER TABLE public.study_session_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_session_items TO authenticated;
GRANT ALL ON public.study_session_items TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='study_session_items' AND policyname='own study session items') THEN
    CREATE POLICY "own study session items" ON public.study_session_items
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
