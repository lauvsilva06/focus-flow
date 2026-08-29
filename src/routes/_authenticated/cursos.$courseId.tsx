import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/ui-kit";
import {
  useCourses,
  useModules,
  useModuleMutations,
  useSessions,
  useTopicItems,
  useTopicMutations,
  useTopics,
} from "@/hooks/useStudyData";
import { courseProgress, moduleProgress, topicProgress } from "@/lib/progress";
import { formatDateBR, formatMinutes } from "@/lib/format";
import { lastActivityByKey, minutesByKey } from "@/lib/stats";
import { TOPIC_STATUS_LABELS, type Module, type Topic, type TopicStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/cursos/$courseId")({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const courses = useCourses(),
    modules = useModules(),
    topics = useTopics(),
    items = useTopicItems(),
    sessions = useSessions();
  const moduleMutations = useModuleMutations(),
    topicMutations = useTopicMutations();
  const [moduleOpen, setModuleOpen] = useState(false),
    [topicOpen, setTopicOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null),
    [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [moduleName, setModuleName] = useState(""),
    [moduleDescription, setModuleDescription] = useState("");
  const [topicName, setTopicName] = useState(""),
    [topicDescription, setTopicDescription] = useState(""),
    [topicModuleId, setTopicModuleId] = useState("");
  const course = (courses.data ?? []).find((c) => c.id === courseId);
  const courseModules = (modules.data ?? []).filter((m) => m.course_id === courseId);
  const courseTopics = (topics.data ?? []).filter((t) => t.subject_id === courseId);
  const courseSessions = (sessions.data ?? []).filter((s) => s.subject_id === courseId);
  const total = minutesByKey(courseSessions, (s) => s.subject_id).get(courseId) ?? 0;
  const last = lastActivityByKey(courseSessions, (s) => s.subject_id).get(courseId);
  const loading = [courses, modules, topics, items, sessions].some((q) => q.isLoading);
  if (loading)
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  if (!course)
    return (
      <EmptyState
        title="Curso não encontrado"
        description="Ele pode ter sido removido ou você não tem acesso."
      />
    );

  const openModule = (m?: Module) => {
    setEditingModule(m ?? null);
    setModuleName(m?.name ?? "");
    setModuleDescription(m?.description ?? "");
    setModuleOpen(true);
  };
  const openTopic = (moduleId: string, t?: Topic) => {
    setEditingTopic(t ?? null);
    setTopicName(t?.name ?? "");
    setTopicDescription(t?.description ?? "");
    setTopicModuleId(t?.module_id ?? moduleId);
    setTopicOpen(true);
  };
  async function saveModule(e: React.FormEvent) {
    e.preventDefault();
    if (!moduleName.trim()) return;
    try {
      if (editingModule) {
        await moduleMutations.update.mutateAsync({
          id: editingModule.id,
          input: { name: moduleName.trim(), description: moduleDescription.trim() || null },
        });
      } else {
        await moduleMutations.create.mutateAsync({
          course_id: courseId,
          name: moduleName.trim(),
          description: moduleDescription.trim() || null,
          position: courseModules.length,
        });
      }
      toast.success("Módulo salvo.");
      setModuleOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar módulo.");
    }
  }
  async function saveTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topicName.trim() || !topicModuleId) return;
    try {
      const input = {
        subject_id: courseId,
        module_id: topicModuleId,
        name: topicName.trim(),
        description: topicDescription.trim() || null,
        position: (topics.data ?? []).filter((t) => t.module_id === topicModuleId).length,
      };
      if (editingTopic) await topicMutations.update.mutateAsync({ id: editingTopic.id, input });
      else await topicMutations.create.mutateAsync(input);
      toast.success("Assunto salvo.");
      setTopicOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar assunto.");
    }
  }
  const moveModule = async (index: number, direction: number) => {
    const next = [...courseModules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    await moduleMutations.reorder.mutateAsync(next.map((m) => m.id));
  };
  const moveTopic = async (moduleId: string, index: number, direction: number) => {
    const list = courseTopics.filter((t) => t.module_id === moduleId);
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target]!, list[index]!];
    await topicMutations.reorder.mutateAsync(list.map((t) => t.id));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={course.name}
        description={course.description ?? "Curso sem descrição"}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openModule()}>
              <Plus className="mr-2 size-4" />
              Módulo
            </Button>
            <Button
              variant="secondary"
              onClick={() => courseModules[0] && openTopic(courseModules[0].id)}
              disabled={!courseModules.length}
            >
              <Plus className="mr-2 size-4" />
              Assunto
            </Button>
            <Button asChild variant="outline">
              <Link to="/pomodoro" search={{ courseId }}>
                <Play className="mr-2 size-4" />
                Continuar estudando
              </Link>
            </Button>
          </div>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Progresso"
          value={`${courseProgress(course, courseTopics, items.data ?? [])}%`}
          hint={<ProgressBar value={courseProgress(course, courseTopics, items.data ?? [])} />}
        />
        <StatCard label="Tempo estudado" value={formatMinutes(total)} />
        <StatCard
          label="Assuntos"
          value={courseTopics.length}
          hint={`${courseTopics.filter((t) => t.status === "done").length} concluídos`}
        />
        <StatCard
          label="Última atividade"
          value={last ? formatDateBR(last) : "—"}
          hint={
            course.weekly_goal_hours
              ? `Meta semanal: ${course.weekly_goal_hours}h`
              : "Sem meta semanal"
          }
        />
      </div>
      {courseModules.length === 0 ? (
        <EmptyState
          title="Nenhum módulo"
          description="Crie um módulo para começar a estruturar este curso."
        />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={courseModules.map((m) => m.id)}
          className="space-y-3"
        >
          {courseModules.map((module, moduleIndex) => {
            const moduleTopics = courseTopics.filter((t) => t.module_id === module.id);
            return (
              <AccordionItem key={module.id} value={module.id} className="rounded-xl border px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <AccordionTrigger className="flex-1">
                    <div className="text-left">
                      <p className="font-semibold">{module.name}</p>
                      <p className="text-xs font-normal text-muted-foreground">
                        {moduleTopics.length} assuntos ·{" "}
                        {moduleProgress(module, courseTopics, items.data ?? [])}%
                      </p>
                    </div>
                  </AccordionTrigger>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Mover módulo para cima"
                    disabled={moduleIndex === 0}
                    onClick={() => void moveModule(moduleIndex, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Mover módulo para baixo"
                    disabled={moduleIndex === courseModules.length - 1}
                    onClick={() => void moveModule(moduleIndex, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar módulo"
                    onClick={() => openModule(module)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir módulo"
                    onClick={async () => {
                      if (!confirm(`Excluir “${module.name}” e todos os seus assuntos e itens?`))
                        return;
                      try {
                        await moduleMutations.remove.mutateAsync(module.id);
                        toast.success("Módulo excluído.");
                      } catch {
                        toast.error("Não foi possível excluir o módulo.");
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <AccordionContent>
                  <div className="space-y-2 pb-2">
                    {moduleTopics.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Nenhum assunto neste módulo.
                      </p>
                    ) : (
                      moduleTopics.map((topic, index) => (
                        <Card key={topic.id}>
                          <CardContent className="flex flex-wrap items-center gap-3 p-4">
                            <div className="min-w-0 flex-1">
                              <Link
                                to="/cursos/$courseId/assuntos/$topicId"
                                params={{ courseId, topicId: topic.id }}
                                className="font-medium hover:underline"
                              >
                                {topic.name}
                              </Link>
                              <div className="mt-1 flex items-center gap-2">
                                <ProgressBar
                                  value={topicProgress(topic, items.data ?? [])}
                                  className="max-w-32"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {topicProgress(topic, items.data ?? [])}%
                                </span>
                              </div>
                            </div>
                            <Select
                              value={topic.status}
                              onValueChange={(v) =>
                                void topicMutations.update.mutateAsync({
                                  id: topic.id,
                                  input: { status: v as TopicStatus },
                                })
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(TOPIC_STATUS_LABELS).map(([v, l]) => (
                                  <SelectItem key={v} value={v}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Mover assunto para cima"
                              disabled={index === 0}
                              onClick={() => void moveTopic(module.id, index, -1)}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Mover assunto para baixo"
                              disabled={index === moduleTopics.length - 1}
                              onClick={() => void moveTopic(module.id, index, 1)}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Editar assunto"
                              onClick={() => openTopic(module.id, topic)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Excluir assunto"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    "Excluir este assunto e seus itens? As sessões históricas serão mantidas.",
                                  )
                                )
                                  return;
                                await topicMutations.remove.mutateAsync(topic.id);
                                toast.success("Assunto excluído.");
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openTopic(module.id)}>
                      <Plus className="mr-2 size-4" />
                      Adicionar assunto
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
      <Dialog open={moduleOpen} onOpenChange={setModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Editar módulo" : "Novo módulo"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveModule}>
            <div className="space-y-2">
              <Label htmlFor="module-name">Nome</Label>
              <Input
                id="module-name"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-description">Descrição</Label>
              <Textarea
                id="module-description"
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={topicOpen} onOpenChange={setTopicOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopic ? "Editar assunto" : "Novo assunto"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveTopic}>
            <div className="space-y-2">
              <Label htmlFor="topic-name">Nome</Label>
              <Input
                id="topic-name"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={topicModuleId} onValueChange={setTopicModuleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courseModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-description">Descrição</Label>
              <Textarea
                id="topic-description"
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
