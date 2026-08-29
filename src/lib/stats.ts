import type { StudySession } from "@/lib/types";
import { countsAsStudyTime } from "@/lib/session-rules";
import { addDays, dayKey, startOfDay, startOfWeek } from "@/lib/format";

/** Apenas sessões de foco que realmente contam tempo estudado. */
export function studySessions(sessions: StudySession[]): StudySession[] {
  return sessions.filter(countsAsStudyTime);
}

export function minutesIn(sessions: StudySession[], from: Date, to?: Date): number {
  const toTime = to ? to.getTime() : Infinity;
  return studySessions(sessions)
    .filter((s) => {
      const t = new Date(s.started_at).getTime();
      return t >= from.getTime() && t < toTime;
    })
    .reduce((sum, s) => sum + Number(s.duration_minutes), 0);
}

export function minutesByDay(sessions: StudySession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of studySessions(sessions)) {
    const key = dayKey(s.started_at);
    map.set(key, (map.get(key) ?? 0) + Number(s.duration_minutes));
  }
  return map;
}

export function pomodorosIn(sessions: StudySession[], from: Date, to?: Date): number {
  const toTime = to ? to.getTime() : Infinity;
  return sessions.filter((s) => {
    const t = new Date(s.started_at).getTime();
    return (
      s.session_type === "focus" && s.status === "completed" && t >= from.getTime() && t < toTime
    );
  }).length;
}

export type StreakInfo = {
  current: number;
  best: number;
  daysStudied: number;
  lastDay: string | null;
};

export function computeStreak(sessions: StudySession[]): StreakInfo {
  const days = [...minutesByDay(sessions).entries()]
    .filter(([, minutes]) => minutes > 0)
    .map(([key]) => key)
    .sort();
  if (days.length === 0) return { current: 0, best: 0, daysStudied: 0, lastDay: null };

  const set = new Set(days);

  // Streak atual: conta a partir de hoje (ou de ontem, se ainda não estudou hoje).
  let current = 0;
  let cursor = startOfDay();
  if (!set.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  while (set.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of days) {
    const parts = key.split("-").map(Number);
    const date = new Date(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1);
    if (previous && dayKey(addDays(previous, 1)) === key) run += 1;
    else run = 1;
    best = Math.max(best, run);
    previous = date;
  }

  return { current, best, daysStudied: days.length, lastDay: days[days.length - 1] ?? null };
}

export function minutesByKey<T extends string>(
  sessions: StudySession[],
  keyOf: (session: StudySession) => T | null,
): Map<T, number> {
  const map = new Map<T, number>();
  for (const s of studySessions(sessions)) {
    const key = keyOf(s);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + Number(s.duration_minutes));
  }
  return map;
}

/** Todas as sessões de foco (inclui interrompidas e abandonadas) — usado no histórico. */
export function focusSessions(sessions: StudySession[]): StudySession[] {
  return sessions.filter((s) => s.session_type === "focus");
}

/** Pomodoros concluídos: apenas foco com status `completed`. */
export function completedPomodoros(sessions: StudySession[]): number {
  return sessions.filter((s) => s.session_type === "focus" && s.status === "completed").length;
}

/** Quantidade de sessões de estudo válidas agrupadas por chave. */
export function countByKey<T extends string>(
  sessions: StudySession[],
  keyOf: (session: StudySession) => T | null,
): Map<T, number> {
  const map = new Map<T, number>();
  for (const s of studySessions(sessions)) {
    const key = keyOf(s);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** Última atividade (ISO) por chave, considerando sessões de estudo válidas. */
export function lastActivityByKey<T extends string>(
  sessions: StudySession[],
  keyOf: (session: StudySession) => T | null,
): Map<T, string> {
  const map = new Map<T, string>();
  for (const s of studySessions(sessions)) {
    const key = keyOf(s);
    if (!key) continue;
    const current = map.get(key);
    if (!current || new Date(s.started_at) > new Date(current)) map.set(key, s.started_at);
  }
  return map;
}

/** Sessões (de qualquer tipo) iniciadas em um dia específico. */
export function sessionsOnDay(sessions: StudySession[], date: Date): StudySession[] {
  const key = dayKey(date);
  return sessions.filter((s) => dayKey(s.started_at) === key);
}

export function lastNDays(n: number): Date[] {
  const today = startOfDay();
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));
}

export function weekStart(): Date {
  return startOfWeek();
}
