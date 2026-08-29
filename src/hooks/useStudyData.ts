import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/study";
import type { TopicItem } from "@/lib/types";

export const keys = {
  subjects: ["subjects"] as const,
  courses: ["subjects"] as const,
  modules: ["modules"] as const,
  topics: ["topics"] as const,
  topicItems: ["topic-items"] as const,
  topicMaterials: ["topic-materials"] as const,
  sessions: ["sessions"] as const,
  sessionItems: ["session-items"] as const,
  settings: ["pomodoro-settings"] as const,
  goals: ["goals"] as const,
};

export function useSubjects() {
  return useQuery({ queryKey: keys.subjects, queryFn: api.listSubjects });
}

export function useCourses() {
  return useQuery({ queryKey: keys.courses, queryFn: api.listCourses });
}

export function useModules() {
  return useQuery({ queryKey: keys.modules, queryFn: api.listModules });
}

export function useTopics() {
  return useQuery({ queryKey: keys.topics, queryFn: api.listTopics });
}

export function useTopicItems() {
  return useQuery({ queryKey: keys.topicItems, queryFn: api.listTopicItems });
}

export function useTopicMaterials() {
  return useQuery({ queryKey: keys.topicMaterials, queryFn: api.listTopicMaterials });
}

export function useSessions() {
  return useQuery({ queryKey: keys.sessions, queryFn: api.listSessions });
}

export function useSessionItems() {
  return useQuery({ queryKey: keys.sessionItems, queryFn: api.listSessionItems });
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: api.getSettings });
}

export function useGoals() {
  return useQuery({ queryKey: keys.goals, queryFn: api.listGoals });
}

function useInvalidate(keysToInvalidate: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient();
  return () => {
    for (const key of keysToInvalidate) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

export function useSubjectMutations() {
  const invalidate = useInvalidate([
    keys.subjects,
    keys.modules,
    keys.topics,
    keys.topicItems,
    keys.sessions,
  ]);
  const create = useMutation({ mutationFn: api.createSubject, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: (vars: { id: string; input: Partial<api.SubjectInput> }) =>
      api.updateSubject(vars.id, vars.input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteSubject, onSuccess: invalidate });
  return { create, update, remove };
}

export function useCourseMutations() {
  return useSubjectMutations();
}

export function useModuleMutations() {
  const invalidate = useInvalidate([keys.modules, keys.topics, keys.topicItems, keys.sessions]);
  const create = useMutation({ mutationFn: api.createModule, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: (vars: { id: string; input: Partial<api.ModuleInput> }) =>
      api.updateModule(vars.id, vars.input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteModule, onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: api.reorderModules, onSuccess: invalidate });
  return { create, update, remove, reorder };
}

export function useTopicMutations() {
  const invalidate = useInvalidate([
    keys.topics,
    keys.topicItems,
    keys.topicMaterials,
    keys.sessions,
  ]);
  const create = useMutation({ mutationFn: api.createTopic, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: (vars: { id: string; input: Partial<api.TopicInput> }) =>
      api.updateTopic(vars.id, vars.input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteTopic, onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: api.reorderTopics, onSuccess: invalidate });
  const markReviewed = useMutation({
    mutationFn: (topic: Parameters<typeof api.markTopicReviewed>[0]) =>
      api.markTopicReviewed(topic),
    onSuccess: invalidate,
  });
  return { create, update, remove, reorder, markReviewed };
}

export function useTopicMaterialMutations() {
  const invalidate = useInvalidate([keys.topicMaterials]);
  const create = useMutation({ mutationFn: api.createTopicMaterial, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: (vars: { id: string; input: Partial<api.TopicMaterialInput> }) =>
      api.updateTopicMaterial(vars.id, vars.input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteTopicMaterial, onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: api.reorderTopicMaterials, onSuccess: invalidate });
  return { create, update, remove, reorder };
}

export function useTopicItemMutations() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate([keys.topicItems, keys.topics, keys.modules, keys.subjects]);
  const create = useMutation({ mutationFn: api.createTopicItem, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: (vars: { id: string; input: Partial<api.TopicItemInput> }) =>
      api.updateTopicItem(vars.id, vars.input),
    onSuccess: invalidate,
  });
  const setCompleted = useMutation({
    mutationFn: (vars: { id: string; completed: boolean }) =>
      api.setTopicItemCompleted(vars.id, vars.completed),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: keys.topicItems });
      const previous = queryClient.getQueryData<TopicItem[]>(keys.topicItems);
      queryClient.setQueryData<TopicItem[]>(keys.topicItems, (current = []) =>
        current.map((item) =>
          item.id === vars.id
            ? {
                ...item,
                completed: vars.completed,
                completed_at: vars.completed ? new Date().toISOString() : null,
              }
            : item,
        ),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(keys.topicItems, context.previous);
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteTopicItem, onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: api.reorderTopicItems, onSuccess: invalidate });
  return { create, update, setCompleted, remove, reorder };
}

export function useSessionMutations() {
  const invalidate = useInvalidate([
    keys.sessions,
    keys.sessionItems,
    keys.topicItems,
    keys.topics,
    keys.modules,
    keys.subjects,
  ]);
  const review = useMutation({
    mutationFn: (vars: {
      id: string;
      rating: Parameters<typeof api.reviewSession>[1]["rating"];
      notes: string | null;
    }) => api.reviewSession(vars.id, { rating: vars.rating, notes: vars.notes }),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteSession, onSuccess: invalidate });
  const finishReview = useMutation({
    mutationFn: (vars: {
      id: string;
      rating: Parameters<typeof api.reviewSessionAndCompleteItems>[1]["rating"];
      notes: string | null;
      completedItemIds: string[];
    }) => api.reviewSessionAndCompleteItems(vars.id, vars),
    onSuccess: invalidate,
  });
  return { review, finishReview, remove };
}

export function useSettingsMutation() {
  const invalidate = useInvalidate([keys.settings]);
  return useMutation({ mutationFn: api.updateSettings, onSuccess: invalidate });
}

export function useGoalMutations() {
  const invalidate = useInvalidate([keys.goals]);
  const save = useMutation({ mutationFn: api.upsertGoal, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.deleteGoal, onSuccess: invalidate });
  return { save, remove };
}
