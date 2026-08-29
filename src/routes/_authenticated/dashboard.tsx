import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CalendarClock, Flame, Play, Target, Timer, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/ui-kit";
import { useGoals, useSessions, useSubjects, useTopics } from "@/hooks/useStudyData";
import { formatMinutes, formatTimeBR, percent, startOfDay, startOfWeek } from "@/lib/format";
import { computeStreak, minutesByKey, minutesIn, pomodorosIn, studySessions } from "@/lib/stats";
import { STATUS_LABELS, STUDY_MODE_LABELS } from "@/lib/types";
import { getReviewState } from "@/lib/review";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Focus | Painel de estudos" },
      {
        name: "description",
        content:
          "Acompanhe tempo estudado hoje, pomodoros concluídos, progresso das metas e sua sequência de dias de estudo.",
      },
      { property: "og:title", content: "Dashboard — Focus" },
      { property: "og:description", content: "Resumo diário dos seus estudos e metas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const sessions = useSessions();
  const subjects = useSubjects();
  const topics = useTopics();
  const goals = useGoals();

  const all = sessions.data ?? [];
  const today = startOfDay();
  const week = startOfWeek();

  const todayMinutes = minutesIn(all, today);
  const weekMinutes = minutesIn(all, week);
  const todayPomodoros = pomodorosIn(all, today);
  const todaySessions = studySessions(all).filter(
    (s) => new Date(s.started_at).getTime() >= today.getTime(),
  );
  const streak = computeStreak(all);

  const dailyGoal = (goals.data ?? []).find((g) => g.period === "daily" && !g.subject_id);
  const weeklyGoal = (goals.data ?? []).find((g) => g.period === "weekly" && !g.subject_id);
  const dailyTarget = Number(dailyGoal?.target_hours ?? 0) * 60;
  const weeklyTarget = Number(weeklyGoal?.target_hours ?? 0) * 60;

  const subjectMinutes = minutesByKey(
    studySessions(all).filter((s) => new Date(s.started_at) >= week),
    (s) => s.subject_id,
  );
  const subjectRanking = (subjects.data ?? [])
    .map((subject) => ({ subject, minutes: subjectMinutes.get(subject.id) ?? 0 }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  const recent = all.slice(0, 6);
  const validRecent = studySessions(all);
  const lastTopicId = validRecent.find((s) => s.topic_id)?.topic_id ?? null;
  const lastTopic = (topics.data ?? []).find((t) => t.id === lastTopicId);
  const reviewTopics = (topics.data ?? []).filter((topic) =>
    ["due_today", "overdue"].includes(getReviewState(topic.next_review_at, topic.review_count)),
  );
  const overdueCount = reviewTopics.filter(
    (topic) => getReviewState(topic.next_review_at, topic.review_count) === "overdue",
  ).length;
  const inProgress = (topics.data ?? []).filter((topic) => topic.status === "in_progress");
  const topicName = (id: string | null) =>
    (topics.data ?? []).find((t) => t.id === id)?.name ?? "—";
  const subjectName = (id: string | null) =>
    (subjects.data ?? []).find((s) => s.id === id)?.name ?? "Sem curso";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Resumo do seu dia de estudos."
        action={
          <Button asChild>
            <Link to="/pomodoro">
              <Play className="mr-2 size-4" /> Iniciar Pomodoro
            </Link>
          </Button>
        }
      />

      <Card className="mb-6 border-primary/30">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              O que estudar agora
            </p>
            <h2 className="mt-1 font-semibold">
              {reviewTopics[0]?.name ?? lastTopic?.name ?? "Comece pelo seu primeiro assunto"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {reviewTopics.length
                ? `${reviewTopics.length} revisão(ões) precisam de atenção.`
                : lastTopic
                  ? "Continue de onde parou na última sessão."
                  : "Crie um curso e organize seu conteúdo."}
            </p>
          </div>
          <Button asChild>
            {reviewTopics[0] || lastTopic ? (
              <Link
                to="/pomodoro"
                search={{
                  courseId: (reviewTopics[0] ?? lastTopic)!.subject_id,
                  topicId: (reviewTopics[0] ?? lastTopic)!.id,
                  ...(reviewTopics[0] ? { mode: "review" as const } : {}),
                }}
              >
                <Play className="mr-2 size-4" />
                Continuar estudando
              </Link>
            ) : (
              <Link to="/cursos">
                <BookOpen className="mr-2 size-4" />
                Criar curso
              </Link>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tempo estudado hoje"
          value={formatMinutes(todayMinutes)}
          hint={`Semana: ${formatMinutes(weekMinutes)}`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Pomodoros hoje"
          value={todayPomodoros}
          hint={`${todaySessions.length} sessões registradas`}
          icon={<Timer className="size-4" />}
        />
        <StatCard
          label="Meta diária"
          value={dailyTarget ? formatMinutes(dailyTarget) : "—"}
          hint={
            dailyTarget ? (
              <div className="space-y-1">
                <ProgressBar value={percent(todayMinutes, dailyTarget)} />
                <span>
                  {formatMinutes(todayMinutes)} / {formatMinutes(dailyTarget)}
                </span>
              </div>
            ) : (
              <Link to="/metas" className="underline">
                Definir meta
              </Link>
            )
          }
          icon={<Target className="size-4" />}
        />
        <StatCard
          label="Streak"
          value={`${streak.current} dias`}
          hint={`Melhor: ${streak.best} dias · ${streak.daysStudied} dias estudados`}
          icon={<Flame className="size-4" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sessões recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                title="Nenhuma sessão ainda"
                description="Inicie um Pomodoro para registrar sua primeira sessão."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((session) => (
                  <li key={session.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                    <span className="w-14 text-muted-foreground">
                      {formatTimeBR(session.started_at)}
                    </span>
                    <span className="font-medium">{subjectName(session.subject_id)}</span>
                    {session.topic_id ? (
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cursos mais estudados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectRanking.length === 0 ? (
              <EmptyState title="Sem dados" description="Registre sessões para ver o ranking." />
            ) : (
              subjectRanking.map(({ subject, minutes }) => (
                <div key={subject.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{subject.name}</span>
                    <span className="text-muted-foreground">{formatMinutes(minutes)}</span>
                  </div>
                  <ProgressBar value={percent(minutes, subjectRanking[0]?.minutes ?? minutes)} />
                </div>
              ))
            )}
            {weeklyTarget ? (
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Meta semanal</span>
                  <span className="text-muted-foreground">
                    {formatMinutes(weekMinutes)} / {formatMinutes(weeklyTarget)}
                  </span>
                </div>
                <ProgressBar className="mt-2" value={percent(weekMinutes, weeklyTarget)} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Assuntos em andamento"
          value={inProgress.length}
          icon={<BookOpen className="size-4" />}
        />
        <StatCard
          label="Revisões para hoje"
          value={reviewTopics.length - overdueCount}
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="Revisões atrasadas"
          value={overdueCount}
          hint={
            overdueCount ? (
              <Link to="/cursos" className="underline">
                Ver assuntos
              </Link>
            ) : (
              "Tudo em dia"
            )
          }
          icon={<CalendarClock className="size-4" />}
        />
      </div>
    </div>
  );
}
