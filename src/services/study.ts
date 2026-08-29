import { supabase } from "@/integrations/supabase/client";
import { uniqueIds, validateSessionSelection } from "@/lib/session-rules";
import type {
  Goal,
  Module,
  ModuleStatus,
  PomodoroSettings,
  Rating,
  SessionStatus,
  SessionType,
  StudyMode,
  StudySession,
  StudySessionItem,
  Course,
  CoursePriority,
  Subject,
  Topic,
  TopicItem,
  TopicItemType,
  TopicStatus,
  TopicMaterial,
  MaterialType,
} from "@/lib/types";
import { nextReviewDate, reviewIntervalForCount } from "@/lib/review";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

/* ---------------- Subjects ---------------- */

// `subjects` remains the physical table name during the compatibility phase.
export async function listCourses(): Promise<Course[]> {
  return listSubjects();
}

export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export type SubjectInput = {
  name: string;
  description?: string | null;
  color?: string;
  status?: "active" | "archived";
  weekly_goal_hours?: number | null;
  target_completion_date?: string | null;
  priority?: CoursePriority | null;
};

export async function createSubject(input: SubjectInput): Promise<Subject> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("subjects")
    .insert({ ...input, user_id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubject(id: string, input: Partial<SubjectInput>): Promise<void> {
  const { error } = await supabase.from("subjects").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

export type CourseInput = SubjectInput;
export const createCourse = createSubject;
export const updateCourse = updateSubject;
export const deleteCourse = deleteSubject;

/* ---------------- Modules ---------------- */

export async function listModules(): Promise<Module[]> {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export type ModuleInput = {
  course_id: string;
  name: string;
  description?: string | null;
  position?: number;
  status?: ModuleStatus;
};

export async function createModule(input: ModuleInput): Promise<Module> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("modules")
    .insert({ ...input, user_id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateModule(id: string, input: Partial<ModuleInput>): Promise<void> {
  const { error } = await supabase.from("modules").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabase.from("modules").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderModules(orderedIds: readonly string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, position) => updateModule(id, { position })));
}

/* ---------------- Topics ---------------- */

export async function listTopics(): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export type TopicInput = {
  subject_id: string;
  module_id?: string;
  name: string;
  description?: string | null;
  status?: TopicStatus;
  progress?: number;
  position?: number;
  notes?: string | null;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
  review_interval_days?: number | null;
  review_count?: number;
};

async function resolveTopicModuleId(courseId: string, moduleId?: string): Promise<string> {
  if (moduleId) return moduleId;
  const fallback = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId)
    .eq("name", "Conteúdo geral")
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  if (!fallback.data) throw new Error("Selecione um módulo para o assunto");
  return fallback.data.id;
}

export async function createTopic(input: TopicInput): Promise<Topic> {
  const user_id = await requireUserId();
  const module_id = await resolveTopicModuleId(input.subject_id, input.module_id);
  const { data, error } = await supabase
    .from("topics")
    .insert({ ...input, module_id, user_id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTopic(id: string, input: Partial<TopicInput>): Promise<void> {
  // Progresso de conteúdo 100% conclui o tópico; reduzir o progresso não altera o status.
  let hierarchyPatch = input;
  if (input.subject_id && !input.module_id) {
    hierarchyPatch = {
      ...input,
      module_id: await resolveTopicModuleId(input.subject_id),
    };
  }
  const patch =
    input.progress === 100 && input.status === undefined
      ? { ...hierarchyPatch, status: "done" as TopicStatus }
      : hierarchyPatch;
  const { error } = await supabase.from("topics").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderTopics(orderedIds: readonly string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, position) => updateTopic(id, { position })));
}

/* ---------------- Topic items ---------------- */

export async function listTopicItems(): Promise<TopicItem[]> {
  const { data, error } = await supabase
    .from("topic_items")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export type TopicItemInput = {
  topic_id: string;
  title: string;
  description?: string | null;
  item_type: TopicItemType;
  completed?: boolean;
  position?: number;
};

export async function createTopicItem(input: TopicItemInput): Promise<TopicItem> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("topic_items")
    .insert({ ...input, user_id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTopicItem(id: string, input: Partial<TopicItemInput>): Promise<void> {
  const { error } = await supabase.from("topic_items").update(input).eq("id", id);
  if (error) throw error;
}

export async function setTopicItemCompleted(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from("topic_items").update({ completed }).eq("id", id);
  if (error) throw error;
}

export async function deleteTopicItem(id: string): Promise<void> {
  const { error } = await supabase.from("topic_items").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderTopicItems(orderedIds: readonly string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, position) => updateTopicItem(id, { position })));
}

/* ---------------- Topic materials ---------------- */

export type TopicMaterialInput = {
  topic_id: string;
  title: string;
  url: string;
  material_type: MaterialType;
  description?: string | null;
  completed?: boolean;
  position?: number;
};

export async function listTopicMaterials(): Promise<TopicMaterial[]> {
  const { data, error } = await supabase
    .from("topic_materials")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTopicMaterial(input: TopicMaterialInput): Promise<TopicMaterial> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("topic_materials")
    .insert({ ...input, user_id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTopicMaterial(
  id: string,
  input: Partial<TopicMaterialInput>,
): Promise<void> {
  const { error } = await supabase.from("topic_materials").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteTopicMaterial(id: string): Promise<void> {
  const { error } = await supabase.from("topic_materials").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderTopicMaterials(orderedIds: readonly string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, position) => updateTopicMaterial(id, { position })));
}

export async function markTopicReviewed(topic: Topic, reviewedAt = new Date()): Promise<void> {
  const completedCount = topic.review_count + 1;
  const interval = reviewIntervalForCount(topic.review_count);
  await updateTopic(topic.id, {
    last_reviewed_at: reviewedAt.toISOString(),
    next_review_at: nextReviewDate(reviewedAt, topic.review_count),
    review_interval_days: interval,
    review_count: completedCount,
  });
}

/* ---------------- Sessions ---------------- */

export async function listSessions(): Promise<StudySession[]> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return data;
}

export async function listSessionItems(): Promise<StudySessionItem[]> {
  const { data, error } = await supabase.from("study_session_items").select("*");
  if (error) throw error;
  return data;
}

export type SessionInput = {
  client_session_id: string;
  subject_id: string | null;
  module_id: string | null;
  topic_id: string | null;
  item_ids: string[];
  session_type: SessionType;
  study_mode: StudyMode | null;
  duration_minutes: number;
  planned_duration_minutes: number;
  effective_duration_minutes: number;
  started_at: string;
  finished_at: string;
  objective: string | null;
  status: SessionStatus;
  completed: boolean;
};

/**
 * Garante a integridade relacional matéria → tópico antes de gravar a sessão.
 * A consulta passa pelas policies de RLS, portanto também valida a propriedade dos registros.
 */
async function assertSessionContentIntegrity(
  subjectId: string | null,
  moduleId: string | null,
  topicId: string | null,
  itemIds: readonly string[],
): Promise<void> {
  const selectionError = validateSessionSelection({
    courseId: subjectId,
    moduleId,
    topicId,
    itemIds,
  });
  if (selectionError) throw new Error(selectionError);
  if (moduleId) {
    const moduleResult = await supabase
      .from("modules")
      .select("id, course_id")
      .eq("id", moduleId)
      .maybeSingle();
    if (moduleResult.error) throw moduleResult.error;
    if (!moduleResult.data || moduleResult.data.course_id !== subjectId) {
      throw new Error("O módulo selecionado não pertence ao curso da sessão");
    }
  }
  if (!topicId) return;
  const { data, error } = await supabase
    .from("topics")
    .select("id, subject_id, module_id")
    .eq("id", topicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Assunto não encontrado");
  if (!subjectId || !moduleId || data.subject_id !== subjectId || data.module_id !== moduleId) {
    throw new Error("O assunto selecionado não pertence ao curso da sessão");
  }
  if (itemIds.length) {
    const selectedItems = await supabase
      .from("topic_items")
      .select("id, topic_id")
      .in("id", [...new Set(itemIds)]);
    if (selectedItems.error) throw selectedItems.error;
    if (
      selectedItems.data.length !== new Set(itemIds).size ||
      selectedItems.data.some((item) => item.topic_id !== topicId)
    ) {
      throw new Error("Um ou mais itens não pertencem ao assunto selecionado");
    }
  }
}

export async function createSession(input: SessionInput): Promise<StudySession> {
  const user_id = await requireUserId();
  const { item_ids, ...sessionInput } = input;
  const uniqueItemIds = uniqueIds(item_ids);
  await assertSessionContentIntegrity(
    input.subject_id,
    input.module_id,
    input.topic_id,
    uniqueItemIds,
  );
  const { data, error } = await supabase
    .from("study_sessions")
    .upsert({ ...sessionInput, user_id }, { onConflict: "user_id,client_session_id" })
    .select("*")
    .single();
  if (error) throw error;
  if (uniqueItemIds.length && input.topic_id) {
    const linked = await supabase.from("study_session_items").upsert(
      uniqueItemIds.map((item_id) => ({
        session_id: data.id,
        item_id,
        topic_id: input.topic_id!,
        user_id,
      })),
      { onConflict: "session_id,item_id" },
    );
    if (linked.error) throw linked.error;
  }
  return data;
}

export async function reviewSession(
  id: string,
  review: { rating: Rating | null; notes: string | null },
): Promise<void> {
  const { error } = await supabase.from("study_sessions").update(review).eq("id", id);
  if (error) throw error;
}

export type SessionReviewResult = { completedItemIds: string[]; failedItemIds: string[] };

/** Salva a revisão principal primeiro; falhas em itens nunca apagam ou invalidam a sessão. */
export async function reviewSessionAndCompleteItems(
  id: string,
  review: { rating: Rating | null; notes: string | null; completedItemIds: string[] },
): Promise<SessionReviewResult> {
  await reviewSession(id, { rating: review.rating, notes: review.notes });
  const completedItemIds: string[] = [];
  const failedItemIds: string[] = [];
  for (const itemId of [...new Set(review.completedItemIds)]) {
    try {
      const linkedItem = await supabase
        .from("study_session_items")
        .select("item_id")
        .eq("session_id", id)
        .eq("item_id", itemId)
        .maybeSingle();
      if (linkedItem.error) throw linkedItem.error;
      if (!linkedItem.data) throw new Error("Item não selecionado nesta sessão");
      await setTopicItemCompleted(itemId, true);
      const { error } = await supabase
        .from("study_session_items")
        .update({ completed_during_session: true })
        .eq("session_id", id)
        .eq("item_id", itemId);
      if (error) throw error;
      completedItemIds.push(itemId);
    } catch {
      failedItemIds.push(itemId);
    }
  }
  return { completedItemIds, failedItemIds };
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Pomodoro settings ---------------- */

export const DEFAULT_SETTINGS = {
  focus_minutes: 25,
  short_break_minutes: 5,
  long_break_minutes: 15,
  pomodoros_per_cycle: 4,
  auto_start_break: true,
  auto_start_next: false,
  sound_enabled: true,
  notifications_enabled: true,
};

export async function getSettings(): Promise<PomodoroSettings> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("pomodoro_settings")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const created = await supabase
    .from("pomodoro_settings")
    .insert({ user_id, ...DEFAULT_SETTINGS })
    .select("*")
    .single();
  if (created.error) throw created.error;
  return created.data;
}

export async function updateSettings(
  input: Partial<Omit<PomodoroSettings, "user_id" | "created_at" | "updated_at">>,
): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase.from("pomodoro_settings").update(input).eq("user_id", user_id);
  if (error) throw error;
}

/* ---------------- Goals ---------------- */

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from("goals").select("*");
  if (error) throw error;
  return data;
}

export async function upsertGoal(input: {
  period: "daily" | "weekly";
  target_hours: number;
  subject_id: string | null;
}): Promise<void> {
  const user_id = await requireUserId();
  const base = supabase.from("goals").select("id").eq("period", input.period);
  const existing =
    input.subject_id === null
      ? await base.is("subject_id", null)
      : await base.eq("subject_id", input.subject_id);
  if (existing.error) throw existing.error;
  const currentId: string | null = existing.data[0]?.id ?? null;

  if (currentId) {
    const { error } = await supabase
      .from("goals")
      .update({ target_hours: input.target_hours })
      .eq("id", currentId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("goals").insert({ ...input, user_id });
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}
