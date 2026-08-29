import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { useGoals, useSessions, useSubjects, useTopics } from "@/hooks/useStudyData";
import {
  addDays,
  dayKey,
  formatDateBR,
  formatMinutes,
  formatTimeBR,
  startOfDay,
} from "@/lib/format";
import {
  completedPomodoros,
  computeStreak,
  focusSessions,
  minutesByDay,
  sessionsOnDay,
  studySessions,
} from "@/lib/stats";
import { STATUS_LABELS, STUDY_MODE_LABELS } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Focus | Consistência de estudos" },
      {
        name: "description",
        content: "Mapa de calor com os dias estudados nas últimas semanas e sua sequência atual.",
      },
      { property: "og:title", content: "Calendário — Focus" },
      { property: "og:description", content: "Veja sua consistência de estudos dia a dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

function intensity(minutes: number): string {
  if (minutes <= 0) return "bg-secondary";
  if (minutes < 30) return "bg-primary/25";
  if (minutes < 60) return "bg-primary/50";
  if (minutes < 120) return "bg-primary/75";
  return "bg-primary";
}

function CalendarPage() {
  const sessions = useSessions();
  const subjects = useSubjects();
  const topics = useTopics();
  const goals = useGoals();

  const all = sessions.data ?? [];
  const byDay = minutesByDay(all);
  const streak = computeStreak(all);

  const today = startOfDay();
  const weekday = (today.getDay() + 6) % 7;
  const lastCell = addDays(today, 6 - weekday);
  const days = Array.from({ length: 7 * 18 }, (_, i) => addDays(lastCell, -(7 * 18 - 1 - i)));

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const [selected, setSelected] = useState<Date>(today);

  // Detalhe do dia derivado exclusivamente de study_sessions.
  const daySessions = focusSessions(sessionsOnDay(all, selected)).sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
  const dayValid = studySessions(daySessions);
  const dayMinutes = dayValid.reduce((sum, s) => sum + Number(s.duration_minutes), 0);
  const dayPomodoros = completedPomodoros(daySessions);
  const daySubjects = [
    ...new Set(dayValid.map((s) => s.subject_id).filter((id): id is string => !!id)),
  ];
  const dayTopics = [
    ...new Set(dayValid.map((s) => s.topic_id).filter((id): id is string => !!id)),
  ];
  const subjectName = (id: string | null) =>
    (subjects.data ?? []).find((s) => s.id === id)?.name ?? "Sem curso";
  const topicName = (id: string | null) => (topics.data ?? []).find((t) => t.id === id)?.name;
  const selectedKey = dayKey(selected);
  const dueReviews = (topics.data ?? []).filter((topic) => topic.next_review_at === selectedKey);
  const dueCourses = (subjects.data ?? []).filter(
    (course) => course.target_completion_date === selectedKey,
  );
  const dailyGoal = (goals.data ?? []).find((goal) => goal.period === "daily" && !goal.subject_id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Calendário" description="Sua consistência nas últimas 18 semanas." />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Sequência atual" value={`${streak.current} dias`} />
        <StatCard label="Melhor sequência" value={`${streak.best} dias`} />
        <StatCard label="Dias estudados" value={streak.daysStudied} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapa de calor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {weeks.map((week, index) => (
              <div key={index} className="flex flex-col gap-1">
                {week.map((date) => {
                  const minutes = byDay.get(dayKey(date)) ?? 0;
                  const future = date.getTime() > today.getTime();
                  const isSelected = dayKey(date) === dayKey(selected);
                  return (
                    <button
                      key={dayKey(date)}
                      type="button"
                      disabled={future}
                      onClick={() => setSelected(date)}
                      aria-label={`${formatDateBR(date)} — ${formatMinutes(minutes)}`}
                      title={`${formatDateBR(date)} — ${formatMinutes(minutes)}`}
                      className={`size-4 rounded-sm transition ${
                        future ? "bg-secondary/40" : intensity(minutes)
                      } ${isSelected ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Menos</span>
            <span className="size-3 rounded-sm bg-secondary" />
            <span className="size-3 rounded-sm bg-primary/25" />
            <span className="size-3 rounded-sm bg-primary/50" />
            <span className="size-3 rounded-sm bg-primary/75" />
            <span className="size-3 rounded-sm bg-primary" />
            <span>Mais</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{formatDateBR(selected)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Tempo estudado" value={formatMinutes(dayMinutes)} />
            <StatCard label="Pomodoros" value={dayPomodoros} />
            <StatCard label="Cursos" value={daySubjects.length} />
            <StatCard label="Assuntos" value={dayTopics.length} />
          </div>

          {daySessions.length === 0 ? (
            <EmptyState title="Nenhuma sessão neste dia" />
          ) : (
            <ul className="divide-y divide-border">
              {daySessions.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                  <span className="w-14 text-muted-foreground">
                    {formatTimeBR(session.started_at)}
                  </span>
                  <span className="font-medium">{subjectName(session.subject_id)}</span>
                  {topicName(session.topic_id) ? (
                    <span className="text-muted-foreground">· {topicName(session.topic_id)}</span>
                  ) : null}
                  {session.study_mode ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {STUDY_MODE_LABELS[session.study_mode as keyof typeof STUDY_MODE_LABELS]}
                    </span>
                  ) : null}
                  <span className="ml-auto text-timer">
                    {formatMinutes(Number(session.duration_minutes))}
                  </span>
                  <span className="w-24 text-right text-xs text-muted-foreground">
                    {STATUS_LABELS[session.status as keyof typeof STATUS_LABELS]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {dueReviews.length > 0 || dueCourses.length > 0 ? (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 font-medium">Planejamento</h3>
              <ul className="space-y-2 text-sm">
                {dueReviews.map((topic) => (
                  <li key={topic.id} className="rounded-lg bg-warning/10 p-3">
                    <span className="font-medium">Revisão:</span> {topic.name}
                  </li>
                ))}
                {dueCourses.map((course) => (
                  <li key={course.id} className="rounded-lg bg-primary/10 p-3">
                    <span className="font-medium">Conclusão pretendida:</span> {course.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {dailyGoal ? (
            <p className="text-xs text-muted-foreground">
              Meta diária: {formatMinutes(Number(dailyGoal.target_hours) * 60)}. Sessões concluídas
              aparecem no mapa; revisões e prazos permanecem pendentes até a data.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
