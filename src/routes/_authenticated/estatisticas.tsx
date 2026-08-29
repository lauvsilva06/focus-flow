import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/ui-kit";
import {
  useModules,
  useSessions,
  useSubjects,
  useTopicItems,
  useTopics,
} from "@/hooks/useStudyData";
import { dayKey, formatMinutes, percent, startOfMonth, startOfWeek } from "@/lib/format";
import {
  completedPomodoros,
  computeStreak,
  focusSessions,
  lastNDays,
  minutesByDay,
  minutesByKey,
  minutesIn,
  studySessions,
} from "@/lib/stats";
import { STUDY_MODE_LABELS, type StudyMode } from "@/lib/types";
import { courseProgress } from "@/lib/progress";

export const Route = createFileRoute("/_authenticated/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas — Focus | Análise dos estudos" },
      {
        name: "description",
        content: "Gráficos de tempo estudado por dia, distribuição por curso e por modo de estudo.",
      },
      { property: "og:title", content: "Estatísticas — Focus" },
      {
        property: "og:description",
        content: "Visualize a evolução e a distribuição dos seus estudos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const sessions = useSessions();
  const subjects = useSubjects();
  const topics = useTopics();
  const modules = useModules();
  const items = useTopicItems();
  const all = sessions.data ?? [];

  const byDay = minutesByDay(all);
  const daily = lastNDays(14).map((date) => ({
    label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    minutos: Math.round(byDay.get(dayKey(date)) ?? 0),
  }));

  const bySubject = minutesByKey(all, (s) => s.subject_id);
  const subjectData = (subjects.data ?? [])
    .map((subject) => ({
      name: subject.name,
      value: Math.round(bySubject.get(subject.id) ?? 0),
      color: subject.color ?? "#8b5cf6",
    }))
    .filter((row) => row.value > 0);

  const byMode = minutesByKey(all, (s) => (s.study_mode as StudyMode | null) ?? null);
  const modeData = (Object.keys(STUDY_MODE_LABELS) as StudyMode[])
    .map((mode) => ({ name: STUDY_MODE_LABELS[mode], value: Math.round(byMode.get(mode) ?? 0) }))
    .filter((row) => row.value > 0);

  const streak = computeStreak(all);
  const focus = studySessions(all);
  const totalMinutes = focus.reduce((sum, s) => sum + Number(s.duration_minutes), 0);

  const allFocus = focusSessions(all);
  const pomodoros = completedPomodoros(all);
  const interrupted = allFocus.filter((s) => s.status === "interrupted").length;
  const abandoned = allFocus.filter((s) => s.status === "abandoned").length;
  const completed = allFocus.filter((s) => s.status === "completed").length;
  const lowProgressCourses = (subjects.data ?? []).filter(
    (course) =>
      course.status === "active" &&
      courseProgress(course, topics.data ?? [], items.data ?? []) < 25,
  ).length;

  const byTopic = minutesByKey(all, (s) => s.topic_id);
  // Agrega uma vez por sessão; itens associados nunca multiplicam minutos.
  const byModule = minutesByKey(all, (s) => s.module_id);
  const moduleRanking = (modules.data ?? [])
    .map((module) => ({ module, minutes: byModule.get(module.id) ?? 0 }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);
  const topicRanking = (topics.data ?? [])
    .map((topic) => ({
      topic,
      minutes: byTopic.get(topic.id) ?? 0,
      subject: (subjects.data ?? []).find((s) => s.id === topic.subject_id),
    }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);

  const MODE_COLORS = ["#8b5cf6", "#22d3ee", "#34d399"];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Estatísticas" description="Como seu tempo de estudo se distribui." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tempo total" value={formatMinutes(totalMinutes)} />
        <StatCard label="Esta semana" value={formatMinutes(minutesIn(all, startOfWeek()))} />
        <StatCard label="Este mês" value={formatMinutes(minutesIn(all, startOfMonth()))} />
        <StatCard
          label="Média por dia estudado"
          value={formatMinutes(streak.daysStudied ? totalMinutes / streak.daysStudied : 0)}
          hint={`${streak.daysStudied} dias com estudo`}
        />
        <StatCard label="Pomodoros concluídos" value={pomodoros} />
        <StatCard label="Sessões de foco" value={allFocus.length} />
        <StatCard label="Sessões interrompidas" value={interrupted} />
        <StatCard label="Sessões concluídas" value={completed} />
        <StatCard label="Sessões abandonadas" value={abandoned} />
        <StatCard label="Cursos abaixo de 25%" value={lowProgressCourses} />
        <StatCard
          label="Sequência atual"
          value={`${streak.current} dias`}
          hint={`Melhor: ${streak.best} dias`}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Tempo por assunto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topicRanking.length === 0 ? (
            <EmptyState title="Sem dados suficientes" />
          ) : (
            topicRanking.map(({ topic, minutes, subject }) => (
              <div key={topic.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">
                    {topic.name}
                    <span className="text-muted-foreground"> · {subject?.name ?? "Sem curso"}</span>
                  </span>
                  <span className="text-muted-foreground">{formatMinutes(minutes)}</span>
                </div>
                <ProgressBar value={percent(minutes, topicRanking[0]?.minutes ?? minutes)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Tempo por módulo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {moduleRanking.length === 0 ? (
            <EmptyState title="Sem dados de módulos" />
          ) : (
            moduleRanking.map(({ module, minutes }) => (
              <div key={module.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{module.name}</span>
                  <span className="text-muted-foreground">{formatMinutes(minutes)}</span>
                </div>
                <ProgressBar value={percent(minutes, moduleRanking[0]?.minutes ?? minutes)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Últimos 14 dias</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--popover-foreground)",
                }}
                formatter={(value: number) => [formatMinutes(value), "Estudado"]}
              />
              <Bar dataKey="minutos" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por curso</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {subjectData.length === 0 ? (
              <EmptyState title="Sem dados suficientes" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjectData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                  >
                    {subjectData.map((row) => (
                      <Cell key={row.name} fill={row.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(value: number, name: string) => [formatMinutes(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teoria x Prática x Revisão</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {modeData.length === 0 ? (
              <EmptyState title="Sem dados suficientes" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                  >
                    {modeData.map((row, index) => (
                      <Cell key={row.name} fill={MODE_COLORS[index % MODE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(value: number, name: string) => [formatMinutes(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
