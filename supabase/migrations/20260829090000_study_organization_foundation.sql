-- Fase 1: Curso (subjects) -> Modulo -> Assunto (topics) -> Item de estudo.
--
-- Os nomes fisicos `subjects` e `topics` sao mantidos nesta fase para preservar todas
-- as FKs, sessoes historicas e clientes existentes. No dominio da aplicacao, `subjects`
-- passa a representar Course e `topics` continua representando Topic (assunto).

-- Chaves compostas permitem que as FKs abaixo garantam propriedade e hierarquia sem
-- depender apenas de RLS ou de validacao no cliente.
CREATE UNIQUE INDEX IF NOT EXISTS subjects_id_user_unique
  ON public.subjects (id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS topics_id_user_unique
  ON public.topics (id, user_id);

CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT modules_course_owner_fkey
    FOREIGN KEY (course_id, user_id)
    REFERENCES public.subjects(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT modules_course_name_unique UNIQUE (course_id, name),
  CONSTRAINT modules_hierarchy_unique UNIQUE (id, course_id, user_id),
  CONSTRAINT modules_id_user_unique UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS modules_user_course_position_idx
  ON public.modules (user_id, course_id, position, created_at);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'modules' AND policyname = 'own modules'
  ) THEN
    CREATE POLICY "own modules" ON public.modules
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS modules_updated ON public.modules;
CREATE TRIGGER modules_updated
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS module_id UUID;

-- Todo curso existente recebe um modulo de compatibilidade. ON CONFLICT torna o
-- backfill repetivel e evita duplicacao caso a migracao seja retomada.
INSERT INTO public.modules (user_id, course_id, name, description, position, status)
SELECT s.user_id, s.id, 'Conteúdo geral',
       'Módulo criado automaticamente para preservar assuntos existentes.',
       0, 'active'
FROM public.subjects s
ON CONFLICT (course_id, name) DO NOTHING;

UPDATE public.topics t
SET module_id = m.id
FROM public.modules m
WHERE t.module_id IS NULL
  AND m.course_id = t.subject_id
  AND m.user_id = t.user_id
  AND m.name = 'Conteúdo geral';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.topics WHERE module_id IS NULL) THEN
    RAISE EXCEPTION 'Backfill de modules incompleto: existem topics sem module_id';
  END IF;
END $$;

ALTER TABLE public.topics ALTER COLUMN module_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.topics'::regclass
      AND conname = 'topics_module_hierarchy_fkey'
  ) THEN
    ALTER TABLE public.topics
      ADD CONSTRAINT topics_module_hierarchy_fkey
      FOREIGN KEY (module_id, subject_id, user_id)
      REFERENCES public.modules(id, course_id, user_id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS topics_user_module_idx
  ON public.topics (user_id, module_id, created_at);

CREATE TABLE IF NOT EXISTS public.topic_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT,
  item_type TEXT NOT NULL DEFAULT 'theory'
    CHECK (item_type IN ('theory', 'practice', 'lab', 'exercise', 'review')),
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT topic_items_topic_owner_fkey
    FOREIGN KEY (topic_id, user_id)
    REFERENCES public.topics(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT topic_items_completion_consistency CHECK (
    (completed AND completed_at IS NOT NULL)
    OR (NOT completed AND completed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS topic_items_user_topic_position_idx
  ON public.topic_items (user_id, topic_id, position, created_at);

ALTER TABLE public.topic_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_items TO authenticated;
GRANT ALL ON public.topic_items TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'topic_items' AND policyname = 'own topic items'
  ) THEN
    CREATE POLICY "own topic items" ON public.topic_items
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS topic_items_updated ON public.topic_items;
CREATE TRIGGER topic_items_updated
  BEFORE UPDATE ON public.topic_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- completed_at e sempre derivado da transicao de completed no banco, inclusive
-- para escritas feitas fora deste cliente.
CREATE OR REPLACE FUNCTION public.sync_topic_item_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.completed THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_topic_item_completed_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS topic_items_sync_completed_at ON public.topic_items;
CREATE TRIGGER topic_items_sync_completed_at
  BEFORE INSERT OR UPDATE OF completed, completed_at ON public.topic_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_topic_item_completed_at();
