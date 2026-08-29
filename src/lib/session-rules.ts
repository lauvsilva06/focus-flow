export type SessionSelection = {
  courseId: string | null;
  moduleId: string | null;
  topicId: string | null;
  itemIds: readonly string[];
};

export function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

/** Valida a forma da seleção antes das verificações de propriedade feitas no Supabase. */
export function validateSessionSelection(selection: SessionSelection): string | null {
  if (
    !selection.courseId &&
    (selection.moduleId || selection.topicId || selection.itemIds.length)
  ) {
    return "Conteúdo selecionado exige um curso";
  }
  if (selection.topicId && !selection.moduleId) return "Assunto selecionado exige um módulo";
  if (selection.itemIds.length && !selection.topicId) return "Itens selecionados exigem um assunto";
  return null;
}

export function countsAsStudyTime(session: { session_type: string; status: string }): boolean {
  return session.session_type === "focus" && session.status !== "abandoned";
}

export function elapsedTimerSeconds(
  state: {
    status: string;
    durationSec: number;
    startedAt: number;
    pausedMs: number;
    pausedAt: number | null;
  },
  now: number,
): number {
  if (state.status === "completed") return state.durationSec;
  const pausedExtra = state.pausedAt ? now - state.pausedAt : 0;
  const elapsed = Math.floor((now - state.startedAt - state.pausedMs - pausedExtra) / 1000);
  return Math.min(state.durationSec, Math.max(0, elapsed));
}

export function shouldRecordFocus(input: {
  phase: string;
  recorded: boolean;
  seconds: number;
}): boolean {
  return input.phase === "focus" && !input.recorded && input.seconds >= 60;
}

export function uniqueByClientSessionId<T extends { clientSessionId: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.clientSessionId)) return false;
    seen.add(row.clientSessionId);
    return true;
  });
}
