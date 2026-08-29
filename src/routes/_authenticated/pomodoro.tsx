import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee, History, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui-kit";
import { usePomodoro } from "@/hooks/usePomodoro";
import {
  useModules,
  useSessionMutations,
  useSessions,
  useSubjects,
  useTopicItems,
  useTopics,
} from "@/hooks/useStudyData";
import { cn } from "@/lib/utils";
import { formatClock, formatMinutes } from "@/lib/format";

import {
  RATING_LABELS,
  SESSION_TYPE_LABELS,
  STUDY_MODE_LABELS,
  type Rating,
  type StudyMode,
} from "@/lib/types";

type PomodoroSearch = { courseId?: string; topicId?: string; mode?: StudyMode };

export const Route = createFileRoute("/_authenticated/pomodoro")({
  validateSearch: (search: Record<string, unknown>): PomodoroSearch => {
    const courseId = typeof search["courseId"] === "string" ? search["courseId"] : null;
    const topicId = typeof search["topicId"] === "string" ? search["topicId"] : null;
    const mode = ["theory", "practice", "review"].includes(String(search["mode"]))
      ? (search["mode"] as StudyMode)
      : null;
    return {
      ...(courseId ? { courseId } : {}),
      ...(topicId ? { topicId } : {}),
      ...(mode ? { mode } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Pomodoro — Focus | Timer de estudos" },
      {
        name: "description",
        content:
          "Timer Pomodoro configurável com registro automático das sessões por curso, assunto e modo de estudo.",
      },
      { property: "og:title", content: "Pomodoro — Focus" },
      { property: "og:description", content: "Timer Pomodoro com registro automático de sessões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PomodoroPage,
});

const NO_TOPIC = "__none__";
const NO_MODULE = "__none__";

function PomodoroPage() {
  const search = Route.useSearch();
  const {
    settings,
    state,
    phase,
    remainingSec,
    totalSec,
    isRunning,
    isPaused,
    isCompleted,
    isBreak,
    cyclePomodoros,
    pomodorosPerCycle: perCycle,
    pendingSyncCount,
    pendingReview,
    clearReview,
    start,
    pause,
    resume,
    reset,
    skip,
    startNext,
    startBreak,
    requestNotificationPermission,
  } = usePomodoro();

  const subjects = useSubjects();
  const modules = useModules();
  const topics = useTopics();
  const topicItems = useTopicItems();
  const sessions = useSessions();
  const { finishReview } = useSessionMutations();

  const activeSubjects = (subjects.data ?? []).filter((s) => s.status === "active");
  const [subjectId, setSubjectId] = useState<string | null>(search.courseId ?? null);
  const [moduleId, setModuleId] = useState<string>(NO_MODULE);
  const [topicId, setTopicId] = useState<string>(search.topicId ?? NO_TOPIC);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [studyMode, setStudyMode] = useState<StudyMode>(search.mode ?? "theory");
  const [objective, setObjective] = useState("");

  const [rating, setRating] = useState<Rating | null>(null);
  const [notes, setNotes] = useState("");
  const [completedItemIds, setCompletedItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (settings?.notifications_enabled) requestNotificationPermission();
  }, [requestNotificationPermission, settings?.notifications_enabled]);

  useEffect(() => {
    if (!state) return;
    setSubjectId(state.subjectId);
    setModuleId(state.moduleId ?? NO_MODULE);
    setTopicId(state.topicId ?? NO_TOPIC);
    setSelectedItemIds(state.itemIds);
    setStudyMode(state.studyMode);
    setObjective(state.objective);
  }, [state]);

  useEffect(() => {
    if (!search.topicId || topics.isLoading) return;
    const topic = (topics.data ?? []).find((candidate) => candidate.id === search.topicId);
    if (topic && topic.subject_id === (search.courseId ?? topic.subject_id)) {
      setSubjectId(topic.subject_id);
      setModuleId(topic.module_id);
      setTopicId(topic.id);
    }
  }, [search.courseId, search.topicId, topics.data, topics.isLoading]);

  useEffect(() => {
    if (search.mode && !state) setStudyMode(search.mode);
  }, [search.mode, state]);

  useEffect(() => {
    setCompletedItemIds([]);
  }, [pendingReview]);

  const courseModules = useMemo(
    () => (modules.data ?? []).filter((module) => module.course_id === subjectId),
    [modules.data, subjectId],
  );

  const subjectTopics = useMemo(
    () =>
      (topics.data ?? []).filter(
        (topic) => topic.subject_id === subjectId && topic.module_id === moduleId,
      ),
    [moduleId, subjectId, topics.data],
  );

  const availableItems = useMemo(
    () =>
      (topicItems.data ?? []).filter(
        (item) => item.topic_id === (topicId === NO_TOPIC ? null : topicId),
      ),
    [topicId, topicItems.data],
  );

  const currentSubject = activeSubjects.find((s) => s.id === (state?.subjectId ?? subjectId));
  const currentTopic = (topics.data ?? []).find(
    (t) => t.id === (state?.topicId ?? (topicId === NO_TOPIC ? null : topicId)),
  );

  const progress = totalSec > 0 ? 1 - remainingSec / totalSec : 0;

  function handleStart() {
    if (!subjectId) {
      toast.error("Selecione o curso antes de iniciar o Pomodoro.");
      return;
    }
    const selectedTopic = topicId === NO_TOPIC ? null : topicId;
    const selectedModule = moduleId === NO_MODULE ? null : moduleId;
    // Integridade: o assunto precisa pertencer ao curso selecionado.
    if (selectedTopic && (!selectedModule || !subjectTopics.some((t) => t.id === selectedTopic))) {
      toast.error("O assunto selecionado não pertence ao curso escolhido.");
      setTopicId(NO_TOPIC);
      return;
    }
    start({
      subjectId,
      moduleId: selectedModule,
      topicId: selectedTopic,
      itemIds: selectedItemIds,
      studyMode,
      objective: objective.trim(),
    });
  }

  async function submitReview() {
    if (!pendingReview) return;
    try {
      const result = await finishReview.mutateAsync({
        id: pendingReview.id,
        rating,
        notes: notes.trim() || null,
        completedItemIds,
      });
      if (result.failedItemIds.length) {
        toast.warning(
          `Sessão salva, mas ${result.failedItemIds.length} item(ns) não puderam ser concluídos.`,
        );
      } else toast.success("Revisão da sessão salva.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a revisão.");
      return;
    }
    setRating(null);
    setNotes("");
    clearReview();
  }

  function continueStudying() {
    const last = (sessions.data ?? []).find(
      (session) =>
        session.session_type === "focus" && session.status !== "abandoned" && session.subject_id,
    );
    if (!last) {
      toast.info("Ainda não há uma sessão de foco para continuar.");
      return;
    }
    setSubjectId(last.subject_id);
    setModuleId(last.module_id ?? NO_MODULE);
    setTopicId(last.topic_id ?? NO_TOPIC);
    setSelectedItemIds([]);
    if (last.study_mode) setStudyMode(last.study_mode as StudyMode);
    setObjective("");
    toast.success("Último conteúdo preenchido. Defina o objetivo e inicie quando quiser.");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Pomodoro"
        description="Foque, e o sistema registra sua sessão e o conteúdo trabalhado."
        action={
          !state ? (
            <Button variant="outline" onClick={continueStudying} disabled={sessions.isLoading}>
              <History className="mr-2 size-4" /> Continuar estudando
            </Button>
          ) : undefined
        }
      />

      {pendingSyncCount > 0 ? (
        <div
          className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {pendingSyncCount === 1
            ? "Há 1 sessão salva neste dispositivo aguardando sincronização."
            : `Há ${pendingSyncCount} sessões salvas neste dispositivo aguardando sincronização.`}
        </div>
      ) : null}

      <Card
        className={cn(
          "timer-surface overflow-hidden",
          isRunning && !isBreak && "timer-surface-focus",
          isRunning && isBreak && "timer-surface-break",
        )}
      >
        <CardContent className="flex flex-col items-center gap-6 py-10">
          <div className="space-y-2 text-center">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium uppercase tracking-widest",
                isBreak
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-primary/30 bg-primary/10 text-primary",
              )}
            >
              {SESSION_TYPE_LABELS[phase]}
            </span>
            <p className="text-lg font-medium text-foreground">
              {currentSubject ? currentSubject.name : "Sem curso selecionado"}
              {currentTopic ? (
                <span className="text-foreground-secondary"> — {currentTopic.name}</span>
              ) : null}
            </p>
            {state?.objective ? (
              <p className="text-sm text-foreground-secondary">{state.objective}</p>
            ) : null}
          </div>

          <div
            className={cn(
              "relative flex size-56 max-w-full items-center justify-center sm:size-72",
              isRunning && "animate-breathe",
            )}
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <defs>
                <linearGradient id="timerRing" x1="0" y1="0" x2="1" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isBreak ? "var(--success)" : "var(--primary)"}
                    stopOpacity="0.75"
                  />
                  <stop
                    offset="100%"
                    stopColor={isBreak ? "var(--success)" : "var(--primary)"}
                    stopOpacity="1"
                  />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="45"
                className="fill-none stroke-secondary"
                strokeWidth="5"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                className={cn("fill-none transition-all duration-500", isPaused && "opacity-60")}
                stroke="url(#timerRing)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
              />
            </svg>
            <span
              className={cn(
                "text-timer text-5xl font-semibold sm:text-6xl",
                isPaused && "text-foreground-secondary",
              )}
            >
              {formatClock(remainingSec)}
            </span>
          </div>

          <div className="flex items-center gap-2" aria-label="Progresso do ciclo">
            {Array.from({ length: perCycle }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "size-2.5 rounded-full border transition-colors",
                  index < cyclePomodoros
                    ? isBreak
                      ? "border-success bg-success"
                      : "border-primary bg-primary"
                    : "border-border bg-transparent",
                )}
              />
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {!state ? (
              <Button size="lg" onClick={handleStart} disabled={activeSubjects.length === 0}>
                <Play className="mr-2 size-4" /> Iniciar
              </Button>
            ) : isCompleted ? (
              <>
                <Button size="lg" onClick={startNext}>
                  <Play className="mr-2 size-4" />
                  {phase === "focus" ? "Iniciar pausa" : "Iniciar próximo foco"}
                </Button>
                <Button size="lg" variant="ghost" onClick={reset}>
                  <RotateCcw className="mr-2 size-4" /> Encerrar
                </Button>
              </>
            ) : (
              <>
                {isRunning ? (
                  <Button size="lg" onClick={pause}>
                    <Pause className="mr-2 size-4" /> Pausar
                  </Button>
                ) : (
                  <Button size="lg" onClick={resume}>
                    <Play className="mr-2 size-4" /> Retomar
                  </Button>
                )}
                <Button size="lg" variant="secondary" onClick={reset}>
                  <RotateCcw className="mr-2 size-4" /> Reiniciar
                </Button>
                <Button size="lg" variant="ghost" onClick={skip}>
                  <SkipForward className="mr-2 size-4" /> Pular sessão
                </Button>
              </>
            )}
            {!state ? (
              <Button size="lg" variant="ghost" onClick={() => startBreak(false)}>
                <Coffee className="mr-2 size-4" /> Pausa
              </Button>
            ) : null}
          </div>

          {isPaused ? (
            <p className="text-xs text-muted-foreground">Timer pausado — retome quando quiser.</p>
          ) : null}
          {isCompleted ? (
            <p className="text-xs text-muted-foreground">
              {phase === "focus" ? "Foco concluído." : "Intervalo concluído."} Escolha o próximo
              passo.
            </p>
          ) : null}
          {activeSubjects.length === 0 ? (
            <p className="text-sm text-foreground-secondary">
              Cadastre um curso em{" "}
              <Link to="/cursos" className="underline">
                Cursos
              </Link>{" "}
              para começar.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Curso</Label>
            <Select
              value={subjectId ?? ""}
              onValueChange={(value) => {
                setSubjectId(value);
                setModuleId(NO_MODULE);
                setTopicId(NO_TOPIC);
                setSelectedItemIds([]);
              }}
              disabled={!!state}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent>
                {activeSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Módulo (opcional)</Label>
            <Select
              value={moduleId}
              onValueChange={(value) => {
                setModuleId(value);
                setTopicId(NO_TOPIC);
                setSelectedItemIds([]);
              }}
              disabled={!!state || !subjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MODULE}>Somente o curso</SelectItem>
                {courseModules.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assunto (opcional)</Label>
            <Select
              value={topicId}
              onValueChange={(value) => {
                setTopicId(value);
                setSelectedItemIds([]);
              }}
              disabled={!!state || moduleId === NO_MODULE}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem assunto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TOPIC}>Sem assunto</SelectItem>
                {subjectTopics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modo de estudo</Label>
            <Select
              value={studyMode}
              onValueChange={(value) => setStudyMode(value as StudyMode)}
              disabled={!!state}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STUDY_MODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableItems.length ? (
            <fieldset className="space-y-2 md:col-span-2" disabled={!!state}>
              <legend className="text-sm font-medium">Itens que serão trabalhados</legend>
              <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                {availableItems.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={(checked) =>
                        setSelectedItemIds((current) =>
                          checked
                            ? [...new Set([...current, item.id])]
                            : current.filter((id) => id !== item.id),
                        )
                      }
                    />
                    <span className={item.completed ? "line-through opacity-60" : ""}>
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="objective">O que quero concluir nesta sessão?</Label>
            <Input
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex.: Compreender o VLAN tagging 802.1Q"
              disabled={!!state}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!pendingReview} onOpenChange={(open) => !open && clearReview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sessão concluída!</DialogTitle>
            <DialogDescription>
              {pendingReview
                ? `${formatMinutes(Number(pendingReview.duration_minutes))} · ${
                    currentSubject?.name ?? "Sem curso"
                  }${currentTopic ? ` · ${currentTopic.name}` : ""}`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pendingReview?.objective ? (
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <p className="text-xs font-medium uppercase text-muted-foreground">Objetivo</p>
                <p className="mt-1">{pendingReview.objective}</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Como foi a sessão?</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(RATING_LABELS).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={rating === value ? "default" : "secondary"}
                    onClick={() => setRating(value as Rating)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            {pendingReview?.selected_item_ids.length ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Itens concluídos nesta sessão</legend>
                <div className="space-y-2 rounded-lg border p-3">
                  {pendingReview.selected_item_ids.map((itemId) => {
                    const item = (topicItems.data ?? []).find(
                      (candidate) => candidate.id === itemId,
                    );
                    return (
                      <label
                        key={itemId}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={completedItemIds.includes(itemId)}
                          onCheckedChange={(checked) =>
                            setCompletedItemIds((current) =>
                              checked
                                ? [...new Set([...current, itemId])]
                                : current.filter((id) => id !== itemId),
                            )
                          }
                        />
                        {item?.title ?? "Item removido"}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Marque somente o que realmente foi concluído.
                </p>
              </fieldset>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="notes">Observação</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Demorei para entender a diferença entre access e trunk."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={clearReview}>
              Depois
            </Button>
            <Button onClick={() => void submitReview()}>Salvar avaliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
