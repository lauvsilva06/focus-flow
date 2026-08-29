import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import {
  useModules,
  useSessionItems,
  useSessionMutations,
  useSessions,
  useSubjects,
  useTopicItems,
  useTopics,
} from "@/hooks/useStudyData";
import { formatDateBR, formatMinutes, formatTimeBR } from "@/lib/format";
import { completedPomodoros, focusSessions, studySessions } from "@/lib/stats";
import { RATING_LABELS, SESSION_TYPE_LABELS, STATUS_LABELS, STUDY_MODE_LABELS } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Focus | Sessões de estudo" },
      {
        name: "description",
        content:
          "Consulte todas as sessões registradas com filtros por curso, período e modo de estudo.",
      },
      { property: "og:title", content: "Histórico — Focus" },
      { property: "og:description", content: "Todas as suas sessões de estudo registradas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

const ALL = "__all__";

function HistoryPage() {
  const sessions = useSessions();
  const subjects = useSubjects();
  const topics = useTopics();
  const modules = useModules();
  const topicItems = useTopicItems();
  const sessionItems = useSessionItems();
  const { remove } = useSessionMutations();

  const [subjectFilter, setSubjectFilter] = useState(ALL);
  const [days, setDays] = useState("30");

  const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
  // Todas as sessões de foco do período (concluídas e interrompidas), fonte de verdade única.
  const filtered = focusSessions(sessions.data ?? []).filter((session) => {
    if (subjectFilter !== ALL && session.subject_id !== subjectFilter) return false;
    return new Date(session.started_at).getTime() >= cutoff;
  });

  // Tempo estudado usa a mesma regra do dashboard/estatísticas.
  const valid = studySessions(filtered);
  const totalMinutes = valid.reduce((sum, s) => sum + Number(s.duration_minutes), 0);
  const pomodoros = completedPomodoros(filtered);
  const subjectName = (id: string | null) =>
    (subjects.data ?? []).find((s) => s.id === id)?.name ?? "Sem curso";
  const topicName = (id: string | null) => (topics.data ?? []).find((t) => t.id === id)?.name;
  const moduleName = (id: string | null) => (modules.data ?? []).find((m) => m.id === id)?.name;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Histórico"
        description="Todas as sessões registradas automaticamente pelo Pomodoro."
        action={
          <div className="flex gap-2">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os cursos</SelectItem>
                {(subjects.data ?? []).map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="3650">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <StatCard label="Sessões" value={filtered.length} />
        <StatCard label="Pomodoros concluídos" value={pomodoros} />
        <StatCard label="Tempo estudado" value={formatMinutes(totalMinutes)} />
        <StatCard
          label="Média por sessão"
          value={formatMinutes(valid.length ? totalMinutes / valid.length : 0)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma sessão no período" />
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <div className="w-32">
                  <p className="font-medium">{formatDateBR(session.started_at)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeBR(session.started_at)}
                  </p>
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="font-medium">{subjectName(session.subject_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {[moduleName(session.module_id), topicName(session.topic_id)]
                      .filter(Boolean)
                      .join(" · ") || SESSION_TYPE_LABELS.focus}
                    {session.objective ? ` · ${session.objective}` : ""}
                  </p>
                  {(() => {
                    const links = (sessionItems.data ?? []).filter(
                      (link) => link.session_id === session.id,
                    );
                    if (!links.length) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {links.map((link) => (
                          <span
                            key={link.item_id}
                            className="rounded bg-secondary px-2 py-0.5 text-xs"
                          >
                            {(topicItems.data ?? []).find((item) => item.id === link.item_id)
                              ?.title ?? "Item removido"}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {session.study_mode ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {STUDY_MODE_LABELS[session.study_mode as keyof typeof STUDY_MODE_LABELS]}
                  </span>
                ) : null}
                {session.rating ? (
                  <span className="text-xs text-muted-foreground">
                    {RATING_LABELS[session.rating as keyof typeof RATING_LABELS]}
                  </span>
                ) : null}
                <span className="text-timer">
                  {formatMinutes(Number(session.duration_minutes))}
                </span>
                <span
                  className={`w-24 text-right text-xs ${
                    session.status === "completed" ? "text-muted-foreground" : "text-primary"
                  }`}
                >
                  {STATUS_LABELS[session.status as keyof typeof STATUS_LABELS]}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Excluir sessão"
                  onClick={() => {
                    if (window.confirm("Excluir esta sessão?")) remove.mutate(session.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
