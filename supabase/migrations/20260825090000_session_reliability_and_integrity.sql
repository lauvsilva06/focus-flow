-- Identificador gerado no dispositivo: permite repetir uma sincronização sem duplicar a sessão.
ALTER TABLE public.study_sessions
  ADD COLUMN client_session_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX study_sessions_user_client_session_idx
  ON public.study_sessions(user_id, client_session_id);

-- Os limites também precisam existir no banco, pois o cliente pode ser contornado.
ALTER TABLE public.pomodoro_settings
  ADD CONSTRAINT pomodoro_focus_minutes_range CHECK (focus_minutes BETWEEN 1 AND 180),
  ADD CONSTRAINT pomodoro_short_break_minutes_range CHECK (short_break_minutes BETWEEN 1 AND 180),
  ADD CONSTRAINT pomodoro_long_break_minutes_range CHECK (long_break_minutes BETWEEN 1 AND 180),
  ADD CONSTRAINT pomodoro_cycle_range CHECK (pomodoros_per_cycle BETWEEN 1 AND 12);

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_weekly_goal_positive
  CHECK (weekly_goal_hours IS NULL OR weekly_goal_hours > 0);

ALTER TABLE public.study_sessions
  ADD CONSTRAINT study_sessions_duration_range
  CHECK (duration_minutes >= 0 AND duration_minutes <= 180);

-- Impede relacionamentos entre registros de usuários diferentes, inclusive via API direta.
CREATE OR REPLACE FUNCTION public.validate_owned_relationships() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_id UUID;
  related_subject_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'topics' THEN
    SELECT user_id INTO owner_id FROM public.subjects WHERE id = NEW.subject_id;
    IF owner_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Subject does not belong to the current user';
    END IF;
  ELSIF TG_TABLE_NAME = 'goals' AND NEW.subject_id IS NOT NULL THEN
    SELECT user_id INTO owner_id FROM public.subjects WHERE id = NEW.subject_id;
    IF owner_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Subject does not belong to the current user';
    END IF;
  ELSIF TG_TABLE_NAME = 'study_sessions' THEN
    IF NEW.subject_id IS NOT NULL THEN
      SELECT user_id INTO owner_id FROM public.subjects WHERE id = NEW.subject_id;
      IF owner_id IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'Subject does not belong to the current user';
      END IF;
    END IF;

    IF NEW.topic_id IS NOT NULL THEN
      SELECT user_id, subject_id INTO owner_id, related_subject_id
      FROM public.topics WHERE id = NEW.topic_id;
      IF owner_id IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'Topic does not belong to the current user';
      END IF;
      IF NEW.subject_id IS NULL OR related_subject_id IS DISTINCT FROM NEW.subject_id THEN
        RAISE EXCEPTION 'Topic does not belong to the selected subject';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_owned_relationships() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER topics_validate_owner
  BEFORE INSERT OR UPDATE OF user_id, subject_id ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.validate_owned_relationships();

CREATE TRIGGER goals_validate_owner
  BEFORE INSERT OR UPDATE OF user_id, subject_id ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.validate_owned_relationships();

CREATE TRIGGER sessions_validate_owner
  BEFORE INSERT OR UPDATE OF user_id, subject_id, topic_id ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_owned_relationships();
