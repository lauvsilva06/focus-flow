import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, ProgressBar } from "@/components/ui-kit";
import { useGoalMutations, useGoals, useSessions, useSubjects } from "@/hooks/useStudyData";
import { formatMinutes, percent, startOfDay, startOfWeek } from "@/lib/format";
import { minutesByKey, minutesIn, studySessions } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Focus | Objetivos diários e semanais" },
      {
        name: "description",
        content:
          "Defina metas diárias e semanais de estudo, globais ou por curso, e acompanhe o progresso.",
      },
      { property: "og:title", content: "Metas — Focus" },
      {
        property: "og:description",
        content: "Metas diárias e semanais de estudo com progresso em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const goals = useGoals();
  const sessions = useSessions();
  const subjects = useSubjects();
  const { save } = useGoalMutations();

  const all = sessions.data ?? [];
  const daily = (goals.data ?? []).find((g) => g.period === "daily" && !g.subject_id);
  const weekly = (goals.data ?? []).find((g) => g.period === "weekly" && !g.subject_id);

  const [dailyHours, setDailyHours] = useState(String(daily?.target_hours ?? ""));
  const [weeklyHours, setWeeklyHours] = useState(String(weekly?.target_hours ?? ""));

  const todayMinutes = minutesIn(all, startOfDay());
  const weekMinutes = minutesIn(all, startOfWeek());
  const weekBySubject = minutesByKey(
    studySessions(all).filter((s) => new Date(s.started_at) >= startOfWeek()),
    (s) => s.subject_id,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (dailyHours) {
      await save.mutateAsync({
        period: "daily",
        target_hours: Number(dailyHours),
        subject_id: null,
      });
    }
    if (weeklyHours) {
      await save.mutateAsync({
        period: "weekly",
        target_hours: Number(weeklyHours),
        subject_id: null,
      });
    }
    toast.success("Metas salvas!");
  }

  const dailyTarget = Number(daily?.target_hours ?? 0) * 60;
  const weeklyTarget = Number(weekly?.target_hours ?? 0) * 60;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Metas" description="Defina o volume de estudo que você quer manter." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metas globais</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="daily">Meta diária (horas)</Label>
                <Input
                  id="daily"
                  type="number"
                  min="0"
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekly">Meta semanal (horas)</Label>
                <Input
                  id="weekly"
                  type="number"
                  min="0"
                  step="0.5"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={save.isPending}>
                Salvar metas
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Hoje</span>
                <span className="text-muted-foreground">
                  {formatMinutes(todayMinutes)}
                  {dailyTarget ? ` / ${formatMinutes(dailyTarget)}` : ""}
                </span>
              </div>
              <ProgressBar value={percent(todayMinutes, dailyTarget)} />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Esta semana</span>
                <span className="text-muted-foreground">
                  {formatMinutes(weekMinutes)}
                  {weeklyTarget ? ` / ${formatMinutes(weeklyTarget)}` : ""}
                </span>
              </div>
              <ProgressBar value={percent(weekMinutes, weeklyTarget)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Metas semanais por curso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(subjects.data ?? []).filter((s) => s.weekly_goal_hours).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Defina metas semanais por curso na página Cursos.
            </p>
          ) : (
            (subjects.data ?? [])
              .filter((s) => s.weekly_goal_hours)
              .map((subject) => {
                const target = Number(subject.weekly_goal_hours) * 60;
                const minutes = weekBySubject.get(subject.id) ?? 0;
                return (
                  <div key={subject.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{subject.name}</span>
                      <span className="text-muted-foreground">
                        {formatMinutes(minutes)} / {formatMinutes(target)}
                      </span>
                    </div>
                    <ProgressBar value={percent(minutes, target)} />
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
