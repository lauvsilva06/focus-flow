import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { keys, useSettings } from "@/hooks/useStudyData";
import { createSession } from "@/services/study";
import {
  enqueueSession,
  readPendingSessions,
  removePendingSession,
  type PendingSession,
} from "@/lib/pending-sessions";
import type { PomodoroSettings, SessionType, StudyMode, StudySession } from "@/lib/types";
import { elapsedTimerSeconds, shouldRecordFocus } from "@/lib/session-rules";

const TIMER_STORAGE_VERSION = "v3";
const CYCLE_STORAGE_VERSION = "v2";

function timerStorageKey(userId: string) {
  return `focus.timer.${userId}.${TIMER_STORAGE_VERSION}`;
}

function cycleStorageKey(userId: string) {
  return `focus.cycle.${userId}.${CYCLE_STORAGE_VERSION}`;
}

/** Limites de sanidade para as configurações vindas do banco. */
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const MIN_CYCLE = 1;
const MAX_CYCLE = 12;

export type TimerConfig = {
  subjectId: string | null;
  moduleId: string | null;
  topicId: string | null;
  itemIds: string[];
  studyMode: StudyMode;
  objective: string;
};

/** Estado operacional do timer. `idle` é representado por `state === null`. */
export type TimerStatus = "running" | "paused" | "completed";

type TimerState = TimerConfig & {
  phase: SessionType;
  status: TimerStatus;
  startedAt: number;
  durationSec: number;
  pausedAt: number | null;
  pausedMs: number;
  /** Evita registros duplicados, inclusive após refresh. */
  recorded: boolean;
};

type PomodoroContextValue = {
  settings: PomodoroSettings | undefined;
  state: TimerState | null;
  phase: SessionType;
  status: TimerStatus | "idle";
  remainingSec: number;
  totalSec: number;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isBreak: boolean;
  cyclePomodoros: number;
  pomodorosPerCycle: number;
  pendingSyncCount: number;
  pendingReview: ReviewableSession | null;
  clearReview: () => void;
  start: (config: TimerConfig) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  startNext: () => void;
  startBreak: (long?: boolean) => void;
  requestNotificationPermission: () => void;
};

export type ReviewableSession = StudySession & { selected_item_ids: string[] };

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

function clamp(value: number | null | undefined, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function safeSettings(settings: PomodoroSettings | undefined) {
  return {
    focusMinutes: clamp(settings?.focus_minutes, MIN_MINUTES, MAX_MINUTES, 25),
    shortBreakMinutes: clamp(settings?.short_break_minutes, MIN_MINUTES, MAX_MINUTES, 5),
    longBreakMinutes: clamp(settings?.long_break_minutes, MIN_MINUTES, MAX_MINUTES, 15),
    perCycle: clamp(settings?.pomodoros_per_cycle, MIN_CYCLE, MAX_CYCLE, 4),
  };
}

function readState(userId: string): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(timerStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TimerState>;
    if (!parsed || typeof parsed.startedAt !== "number" || typeof parsed.durationSec !== "number") {
      return null;
    }
    return {
      subjectId: parsed.subjectId ?? null,
      moduleId: parsed.moduleId ?? null,
      topicId: parsed.topicId ?? null,
      itemIds: Array.isArray(parsed.itemIds)
        ? parsed.itemIds.filter((id): id is string => typeof id === "string")
        : [],
      studyMode: parsed.studyMode ?? "theory",
      objective: parsed.objective ?? "",
      phase: parsed.phase ?? "focus",
      status: parsed.status ?? "running",
      startedAt: parsed.startedAt,
      durationSec: parsed.durationSec,
      pausedAt: parsed.pausedAt ?? null,
      pausedMs: parsed.pausedMs ?? 0,
      recorded: parsed.recorded ?? false,
    };
  } catch {
    return null;
  }
}

function writeState(userId: string, state: TimerState | null) {
  if (typeof window === "undefined") return;
  const key = timerStorageKey(userId);
  if (state) window.localStorage.setItem(key, JSON.stringify(state));
  else window.localStorage.removeItem(key);
}

function readCycle(userId: string): number {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(cycleStorageKey(userId)) ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Segundos efetivamente decorridos, descontando o tempo pausado. */
function elapsedSeconds(state: TimerState, now = Date.now()): number {
  return elapsedTimerSeconds(state, now);
}

function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.3);
    setTimeout(() => void ctx.close(), 1600);
  } catch {
    /* som é opcional */
  }
}

function notify(enabled: boolean, title: string, body: string) {
  if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") new Notification(title, { body });
}

export function PomodoroProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const { data: settings } = useSettings();
  const queryClient = useQueryClient();
  const [state, setState] = useState<TimerState | null>(null);
  const [cyclePomodoros, setCyclePomodoros] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [pendingReview, setPendingReview] = useState<ReviewableSession | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const finishingRef = useRef(false);
  const permissionAskedRef = useRef(false);

  const config = safeSettings(settings);
  const { focusMinutes, shortBreakMinutes, longBreakMinutes, perCycle } = config;

  // Reconstrói o estado após refresh (baseado em timestamps).
  useEffect(() => {
    setState(readState(userId));
    setCyclePomodoros(readCycle(userId));
    setPendingSyncCount(readPendingSessions(userId).length);
  }, [userId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const persist = useCallback(
    (next: TimerState | null) => {
      writeState(userId, next);
      setState(next);
    },
    [userId],
  );

  const persistCycle = useCallback(
    (next: number) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(cycleStorageKey(userId), String(next));
      }
      setCyclePomodoros(next);
    },
    [userId],
  );

  const totalSec = state?.durationSec ?? focusMinutes * 60;
  const elapsed = state ? elapsedSeconds(state, now) : 0;
  const remainingSec = state ? Math.max(0, state.durationSec - elapsed) : totalSec;

  const savePendingSession = useCallback(
    async (pending: PendingSession): Promise<StudySession> => {
      const session = await createSession({
        ...pending.input,
        module_id: pending.input.module_id ?? null,
        item_ids: pending.input.item_ids ?? [],
        planned_duration_minutes:
          pending.input.planned_duration_minutes ?? pending.input.duration_minutes,
        effective_duration_minutes:
          pending.input.effective_duration_minutes ?? pending.input.duration_minutes,
        client_session_id: pending.clientSessionId,
      });
      removePendingSession(userId, pending.clientSessionId);
      setPendingSyncCount(readPendingSessions(userId).length);
      return session;
    },
    [userId],
  );

  const syncPendingSessions = useCallback(async () => {
    let synced = 0;
    for (const pending of readPendingSessions(userId)) {
      try {
        await savePendingSession(pending);
        synced += 1;
      } catch {
        // Mantém a sessão na fila e tenta novamente quando a conexão retornar.
        break;
      }
    }
    if (synced > 0) {
      void queryClient.invalidateQueries({ queryKey: keys.sessions });
      void queryClient.invalidateQueries({ queryKey: keys.sessionItems });
      void queryClient.invalidateQueries({ queryKey: keys.goals });
      void queryClient.invalidateQueries({ queryKey: keys.subjects });
      void queryClient.invalidateQueries({ queryKey: keys.topics });
      toast.success(
        synced === 1 ? "Sessão pendente sincronizada." : `${synced} sessões sincronizadas.`,
      );
    }
  }, [queryClient, savePendingSession, userId]);

  useEffect(() => {
    void syncPendingSessions();
    const handleOnline = () => void syncPendingSessions();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncPendingSessions]);

  const record = useCallback(
    async (
      source: TimerState,
      seconds: number,
      status: "completed" | "interrupted" | "abandoned",
    ) => {
      const minutes = Math.round((seconds / 60) * 100) / 100;
      const finished = new Date();
      const pending = enqueueSession(userId, {
        subject_id: source.subjectId,
        module_id: source.moduleId,
        topic_id: source.topicId,
        item_ids: source.itemIds,
        session_type: source.phase,
        study_mode: source.phase === "focus" ? source.studyMode : null,
        duration_minutes: minutes,
        planned_duration_minutes: source.durationSec / 60,
        effective_duration_minutes: minutes,
        started_at: new Date(source.startedAt).toISOString(),
        finished_at: finished.toISOString(),
        objective: source.objective || null,
        status,
        completed: status === "completed",
      });
      setPendingSyncCount(readPendingSessions(userId).length);
      let session: StudySession;
      try {
        session = await savePendingSession(pending);
      } catch {
        toast.warning("Sessão salva neste dispositivo e aguardando sincronização.");
        return null;
      }
      // study_sessions é a fonte de verdade: revalida tudo que deriva dela.
      void queryClient.invalidateQueries({ queryKey: keys.sessions });
      void queryClient.invalidateQueries({ queryKey: keys.sessionItems });
      void queryClient.invalidateQueries({ queryKey: keys.goals });
      void queryClient.invalidateQueries({ queryKey: keys.subjects });
      void queryClient.invalidateQueries({ queryKey: keys.topics });
      return { ...session, selected_item_ids: source.itemIds };
    },
    [queryClient, savePendingSession, userId],
  );

  const minutesFor = useCallback(
    (phase: SessionType) =>
      phase === "focus"
        ? focusMinutes
        : phase === "short_break"
          ? shortBreakMinutes
          : longBreakMinutes,
    [focusMinutes, longBreakMinutes, shortBreakMinutes],
  );

  const beginPhase = useCallback(
    (phase: SessionType, cfg: TimerConfig, autoRun: boolean) => {
      const next: TimerState = {
        subjectId: cfg.subjectId,
        moduleId: cfg.moduleId,
        topicId: cfg.topicId,
        itemIds: cfg.itemIds,
        studyMode: cfg.studyMode,
        objective: cfg.objective,
        phase,
        status: autoRun ? "running" : "paused",
        startedAt: Date.now(),
        durationSec: minutesFor(phase) * 60,
        pausedAt: autoRun ? null : Date.now(),
        pausedMs: 0,
        recorded: false,
      };
      persist(next);
    },
    [minutesFor, persist],
  );

  /** A próxima pausa é longa quando o ciclo configurado foi completado. */
  const nextBreakPhase = useCallback(
    (completedCount: number): SessionType =>
      completedCount > 0 && completedCount % perCycle === 0 ? "long_break" : "short_break",
    [perCycle],
  );

  const handleFinish = useCallback(
    async (current: TimerState) => {
      if (settings?.sound_enabled) playChime();

      if (current.phase === "focus") {
        // Marca como registrado ANTES do await para evitar duplicidade.
        const completedState: TimerState = {
          ...current,
          status: "completed",
          pausedAt: null,
          recorded: true,
        };
        persist(completedState);

        const nextCount = cyclePomodoros + 1;
        persistCycle(nextCount);

        const session = current.recorded
          ? null
          : await record(current, current.durationSec, "completed");
        if (session) setPendingReview(session);

        notify(!!settings?.notifications_enabled, "Pomodoro concluído!", "Hora da pausa.");
        if (session) toast.success("Pomodoro concluído! Sessão registrada.");

        if (settings?.auto_start_break) {
          beginPhase(nextBreakPhase(nextCount), current, true);
        }
        return;
      }

      // Fim de uma pausa: nunca gera sessão de estudo.
      const wasLong = current.phase === "long_break";
      persist({ ...current, status: "completed", pausedAt: null, recorded: true });
      if (wasLong) persistCycle(0);

      notify(
        !!settings?.notifications_enabled,
        "Intervalo encerrado",
        "Hora de voltar aos estudos.",
      );
      toast.info("Intervalo encerrado. Hora de voltar aos estudos.");
      if (settings?.auto_start_next) beginPhase("focus", current, true);
    },
    [beginPhase, cyclePomodoros, nextBreakPhase, persist, persistCycle, record, settings],
  );

  useEffect(() => {
    if (!state || state.status !== "running") return;
    if (remainingSec > 0 || finishingRef.current) return;
    finishingRef.current = true;
    void handleFinish(state).finally(() => {
      finishingRef.current = false;
    });
  }, [handleFinish, remainingSec, state]);

  const start = useCallback(
    (cfg: TimerConfig) => {
      if (cyclePomodoros >= perCycle) persistCycle(0);
      beginPhase("focus", cfg, true);
    },
    [beginPhase, cyclePomodoros, perCycle, persistCycle],
  );

  const pause = useCallback(() => {
    if (!state || state.status !== "running") return;
    persist({ ...state, status: "paused", pausedAt: Date.now() });
  }, [persist, state]);

  const resume = useCallback(() => {
    if (!state || state.status !== "paused" || state.pausedAt === null) return;
    persist({
      ...state,
      status: "running",
      pausedMs: state.pausedMs + (Date.now() - state.pausedAt),
      pausedAt: null,
    });
  }, [persist, state]);

  /** Reinicia a fase atual: não conta Pomodoro, registra apenas o tempo real estudado. */
  const reset = useCallback(() => {
    if (!state) return;
    const seconds = elapsedSeconds(state);
    const shouldRecord = shouldRecordFocus({
      phase: state.phase,
      recorded: state.recorded,
      seconds,
    });
    if (shouldRecord) {
      persist({ ...state, recorded: true });
      void record(state, seconds, "interrupted").then(() =>
        toast.info("Sessão interrompida registrada."),
      );
    }
    persist(null);
  }, [persist, record, state]);

  /** Pula a fase atual sem concluí-la: nunca incrementa o contador do ciclo. */
  const skip = useCallback(() => {
    if (!state) return;
    const seconds = elapsedSeconds(state);
    if (state.phase === "focus") {
      if (shouldRecordFocus({ phase: state.phase, recorded: state.recorded, seconds })) {
        persist({ ...state, recorded: true });
        void record(state, seconds, "abandoned");
      }
      beginPhase(nextBreakPhase(cyclePomodoros), state, false);
      return;
    }
    if (state.phase === "long_break") persistCycle(0);
    beginPhase("focus", state, false);
  }, [beginPhase, cyclePomodoros, nextBreakPhase, persist, persistCycle, record, state]);

  /** Avança manualmente a partir de uma fase concluída (auto start desligado). */
  const startNext = useCallback(() => {
    if (!state || state.status !== "completed") return;
    if (state.phase === "focus") {
      beginPhase(nextBreakPhase(cyclePomodoros), state, true);
      return;
    }
    if (state.phase === "long_break") persistCycle(0);
    beginPhase("focus", state, true);
  }, [beginPhase, cyclePomodoros, nextBreakPhase, persistCycle, state]);

  const startBreak = useCallback(
    (long = false) => {
      const cfg: TimerConfig = state
        ? {
            subjectId: state.subjectId,
            moduleId: state.moduleId,
            topicId: state.topicId,
            itemIds: state.itemIds,
            studyMode: state.studyMode,
            objective: state.objective,
          }
        : {
            subjectId: null,
            moduleId: null,
            topicId: null,
            itemIds: [],
            studyMode: "theory",
            objective: "",
          };
      beginPhase(long ? "long_break" : "short_break", cfg, true);
    },
    [beginPhase, state],
  );

  const requestNotificationPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (permissionAskedRef.current) return;
    permissionAskedRef.current = true;
    if (Notification.permission === "default") void Notification.requestPermission();
  }, []);

  const value = useMemo<PomodoroContextValue>(
    () => ({
      settings,
      state,
      phase: state?.phase ?? "focus",
      status: state?.status ?? "idle",
      remainingSec,
      totalSec,
      isRunning: state?.status === "running",
      isPaused: state?.status === "paused",
      isCompleted: state?.status === "completed",
      isBreak: !!state && state.phase !== "focus",
      cyclePomodoros,
      pomodorosPerCycle: perCycle,
      pendingSyncCount,
      pendingReview,
      clearReview: () => setPendingReview(null),
      start,
      pause,
      resume,
      reset,
      skip,
      startNext,
      startBreak,
      requestNotificationPermission,
    }),
    [
      cyclePomodoros,
      pendingReview,
      pendingSyncCount,
      pause,
      perCycle,
      remainingSec,
      requestNotificationPermission,
      reset,
      resume,
      settings,
      skip,
      start,
      startBreak,
      startNext,
      state,
      totalSec,
    ],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro deve ser usado dentro de PomodoroProvider");
  return ctx;
}
