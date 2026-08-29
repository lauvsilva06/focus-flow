import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui-kit";
import {
  useCourses,
  useCourseMutations,
  useModules,
  useSessions,
  useTopicItems,
  useTopics,
} from "@/hooks/useStudyData";
import { courseProgress } from "@/lib/progress";
import { formatDateBR, formatMinutes, startOfWeek } from "@/lib/format";
import { lastActivityByKey, minutesByKey, studySessions } from "@/lib/stats";
import { COURSE_PRIORITY_LABELS, type Course, type CoursePriority } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/cursos/")({
  head: () => ({ meta: [{ title: "Meus cursos — Focus" }] }),
  component: CoursesPage,
});

const COLORS = ["#8b5cf6", "#22d3ee", "#34d399", "#f59e0b", "#f43f5e", "#60a5fa", "#a3e635"];

function CoursesPage() {
  const courses = useCourses();
  const modules = useModules();
  const topics = useTopics();
  const items = useTopicItems();
  const sessions = useSessions();
  const { create, update, remove } = useCourseMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [weeklyGoal, setWeeklyGoal] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<string>("none");
  const [searchText, setSearchText] = useState(""),
    [searchTerm, setSearchTerm] = useState(""),
    [status, setStatus] = useState("all");
  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearchTerm(searchText.trim().toLocaleLowerCase("pt-BR")),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [searchText]);
  const visibleCourses = useMemo(
    () =>
      (courses.data ?? []).filter((course) => {
        if (status !== "all" && course.status !== status) return false;
        if (!searchTerm) return true;
        const courseModuleIds = (modules.data ?? [])
          .filter(
            (m) =>
              m.course_id === course.id &&
              `${m.name} ${m.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(searchTerm),
          )
          .map((m) => m.id);
        const courseTopicIds = (topics.data ?? [])
          .filter(
            (t) =>
              t.subject_id === course.id &&
              `${t.name} ${t.description ?? ""} ${t.notes ?? ""}`
                .toLocaleLowerCase("pt-BR")
                .includes(searchTerm),
          )
          .map((t) => t.id);
        const itemMatch = (items.data ?? []).some(
          (item) =>
            `${item.title} ${item.description ?? ""}`
              .toLocaleLowerCase("pt-BR")
              .includes(searchTerm) &&
            (topics.data ?? []).some(
              (topic) => topic.id === item.topic_id && topic.subject_id === course.id,
            ),
        );
        return (
          `${course.name} ${course.description ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(searchTerm) ||
          courseModuleIds.length > 0 ||
          courseTopicIds.length > 0 ||
          itemMatch
        );
      }),
    [courses.data, items.data, modules.data, searchTerm, status, topics.data],
  );

  const reset = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setColor(COLORS[0]!);
    setWeeklyGoal("");
    setDate("");
    setPriority("none");
  };
  const edit = (course: Course) => {
    setEditing(course);
    setName(course.name);
    setDescription(course.description ?? "");
    setColor(course.color);
    setWeeklyGoal(course.weekly_goal_hours == null ? "" : String(course.weekly_goal_hours));
    setDate(course.target_completion_date ?? "");
    setPriority(course.priority ?? "none");
    setOpen(true);
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const goal = weeklyGoal ? Number(weeklyGoal) : null;
    if (!name.trim() || (goal !== null && (!Number.isFinite(goal) || goal <= 0))) {
      toast.error("Informe um nome e uma meta semanal válida.");
      return;
    }
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      weekly_goal_hours: goal,
      target_completion_date: date || null,
      priority: priority === "none" ? null : (priority as CoursePriority),
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input });
      else await create.mutateAsync(input);
      toast.success(editing ? "Curso atualizado." : "Curso criado.");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o curso.");
    }
  }

  const allSessions = sessions.data ?? [];
  const week = studySessions(allSessions).filter((s) => new Date(s.started_at) >= startOfWeek());
  const totalMinutes = minutesByKey(allSessions, (s) => s.subject_id);
  const weekMinutes = minutesByKey(week, (s) => s.subject_id);
  const last = lastActivityByKey(allSessions, (s) => s.subject_id);
  const loading =
    courses.isLoading ||
    modules.isLoading ||
    topics.isLoading ||
    items.isLoading ||
    sessions.isLoading;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Meus cursos"
        description="Organize módulos, assuntos e itens de estudo em um só lugar."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) reset();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={reset}>
                <Plus className="mr-2 size-4" />
                Novo curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar curso" : "Novo curso"}</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="course-name">Nome</Label>
                  <Input
                    id="course-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-description">Descrição</Label>
                  <Textarea
                    id="course-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="course-goal">Meta semanal (horas)</Label>
                    <Input
                      id="course-goal"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={weeklyGoal}
                      onChange={(e) => setWeeklyGoal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-date">Conclusão pretendida</Label>
                    <Input
                      id="course-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem prioridade</SelectItem>
                      {Object.entries(COURSE_PRIORITY_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Cor</legend>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Selecionar cor ${c}`}
                        onClick={() => setColor(c)}
                        className={`size-8 rounded-full ring-offset-2 ${color === c ? "ring-2 ring-ring" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </fieldset>
                <DialogFooter>
                  <Button type="submit" disabled={create.isPending || update.isPending}>
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Pesquisar cursos, módulos, assuntos e itens"
            placeholder="Pesquisar cursos, módulos, assuntos e itens…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44" aria-label="Filtrar cursos por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ativos e arquivados</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="archived">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (courses.data ?? []).length === 0 ? (
        <EmptyState
          title="Nenhum curso cadastrado"
          description="Crie seu primeiro curso para começar a organizar os estudos."
        />
      ) : visibleCourses.length === 0 ? (
        <EmptyState
          title="Nenhum resultado"
          description="Tente outro termo ou ajuste os filtros."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleCourses.map((course) => {
            const courseModules = (modules.data ?? []).filter((m) => m.course_id === course.id);
            const courseTopics = (topics.data ?? []).filter((t) => t.subject_id === course.id);
            const progress = courseProgress(course, topics.data ?? [], items.data ?? []);
            const weekly = weekMinutes.get(course.id) ?? 0;
            const target = Number(course.weekly_goal_hours ?? 0) * 60;
            return (
              <Card key={course.id} className={course.status === "archived" ? "opacity-70" : ""}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/cursos/$courseId"
                        params={{ courseId: course.id }}
                        className="font-semibold hover:underline"
                      >
                        {course.name}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {course.description || "Sem descrição"}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {course.status === "active" ? "Ativo" : "Arquivado"}
                    </span>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Progresso</span>
                      <span>{progress}%</span>
                    </div>
                    <ProgressBar value={progress} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>{courseModules.length} módulos</span>
                    <span>{courseTopics.length} assuntos</span>
                    <span>{courseTopics.filter((t) => t.status === "done").length} concluídos</span>
                    <span>{formatMinutes(totalMinutes.get(course.id) ?? 0)} estudados</span>
                    <span>Semana: {formatMinutes(weekly)}</span>
                    <span>
                      {last.get(course.id)
                        ? `Última: ${formatDateBR(last.get(course.id)!)}`
                        : "Sem atividade"}
                    </span>
                    {target > 0 ? (
                      <span className="col-span-2">
                        Meta: {formatMinutes(weekly)} / {formatMinutes(target)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link to="/cursos/$courseId" params={{ courseId: course.id }}>
                        <BookOpen className="mr-2 size-4" />
                        Abrir
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/pomodoro" search={{ courseId: course.id }}>
                        <Play className="mr-2 size-4" />
                        Continuar
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Editar ${course.name}`}
                      onClick={() => edit(course)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={course.status === "active" ? "Arquivar" : "Reativar"}
                      onClick={async () => {
                        try {
                          await update.mutateAsync({
                            id: course.id,
                            input: { status: course.status === "active" ? "archived" : "active" },
                          });
                          toast.success("Status atualizado.");
                        } catch {
                          toast.error("Não foi possível atualizar o curso.");
                        }
                      }}
                    >
                      {course.status === "active" ? (
                        <Archive className="size-4" />
                      ) : (
                        <ArchiveRestore className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Excluir ${course.name}`}
                      onClick={() => setDeleting(course)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá módulos, assuntos, itens e metas vinculados. Sessões históricas serão
              preservadas, mas ficarão sem o curso associado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  await remove.mutateAsync(deleting.id);
                  toast.success("Curso excluído.");
                  setDeleting(null);
                } catch {
                  toast.error("Não foi possível excluir o curso.");
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
