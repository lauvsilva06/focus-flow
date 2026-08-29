import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CheckCircle2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TopicMaterials } from "@/components/topic/TopicMaterials";
import { TopicNotesReview } from "@/components/topic/TopicNotesReview";
import {
  useCourses,
  useModules,
  useSessions,
  useTopicItemMutations,
  useTopicItems,
  useTopicMutations,
  useTopics,
} from "@/hooks/useStudyData";
import { topicProgress } from "@/lib/progress";
import { formatDateBR, formatMinutes } from "@/lib/format";
import {
  TOPIC_ITEM_TYPE_LABELS,
  TOPIC_STATUS_LABELS,
  type TopicItem,
  type TopicItemType,
  type TopicStatus,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/cursos/$courseId/assuntos/$topicId")({
  component: TopicDetailPage,
});
const ALL = "all";

function TopicDetailPage() {
  const { courseId, topicId } = Route.useParams();
  const courses = useCourses(),
    modules = useModules(),
    topics = useTopics(),
    items = useTopicItems(),
    sessions = useSessions();
  const topicMutations = useTopicMutations(),
    itemMutations = useTopicItemMutations();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<TopicItem | null>(null),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [type, setType] = useState<TopicItemType>("theory");
  const [statusFilter, setStatusFilter] = useState(ALL),
    [typeFilter, setTypeFilter] = useState(ALL),
    [editingDescription, setEditingDescription] = useState(false),
    [topicDescription, setTopicDescription] = useState("");
  const course = (courses.data ?? []).find((c) => c.id === courseId),
    topic = (topics.data ?? []).find((t) => t.id === topicId && t.subject_id === courseId),
    module = (modules.data ?? []).find((m) => m.id === topic?.module_id);
  const topicItems = (items.data ?? []).filter((i) => i.topic_id === topicId);
  const topicSessions = (sessions.data ?? []).filter((s) => s.topic_id === topicId);
  const total = topicSessions.reduce((sum, s) => sum + Number(s.duration_minutes), 0);
  const last = topicSessions[0]?.started_at;
  const filtered = useMemo(
    () =>
      topicItems.filter(
        (i) =>
          (statusFilter === ALL || (statusFilter === "done" ? i.completed : !i.completed)) &&
          (typeFilter === ALL || i.item_type === typeFilter),
      ),
    [topicItems, statusFilter, typeFilter],
  );
  if ([courses, modules, topics, items, sessions].some((q) => q.isLoading))
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  if (!course || !topic)
    return (
      <EmptyState
        title="Assunto não encontrado"
        description="Verifique o endereço ou volte para seus cursos."
      />
    );
  const progress = topicProgress(topic, topicItems);
  const openItem = (item?: TopicItem) => {
    setEditing(item ?? null);
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setType((item?.item_type as TopicItemType) ?? "theory");
    setOpen(true);
  };
  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const input = {
        topic_id: topicId,
        title: title.trim(),
        description: description.trim() || null,
        item_type: type,
        position: editing?.position ?? topicItems.length,
      };
      if (editing) await itemMutations.update.mutateAsync({ id: editing.id, input });
      else await itemMutations.create.mutateAsync(input);
      toast.success("Item salvo.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o item.");
    }
  }
  const move = async (item: TopicItem, direction: number) => {
    const index = topicItems.findIndex((i) => i.id === item.id),
      target = index + direction;
    if (target < 0 || target >= topicItems.length) return;
    const next = [...topicItems];
    [next[index], next[target]] = [next[target]!, next[index]!];
    try {
      await itemMutations.reorder.mutateAsync(next.map((i) => i.id));
    } catch {
      toast.error("Não foi possível reordenar os itens.");
    }
  };
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={topic.name}
        description={`${course.name} · ${module?.name ?? "Módulo"}`}
        action={
          <Button asChild>
            <Link to="/pomodoro" search={{ courseId, topicId }}>
              <Play className="mr-2 size-4" />
              Estudar agora
            </Link>
          </Button>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Progresso"
          value={`${progress}%`}
          hint={<ProgressBar value={progress} />}
        />
        <StatCard
          label="Status"
          value={TOPIC_STATUS_LABELS[topic.status as TopicStatus] ?? topic.status}
        />
        <StatCard
          label="Tempo total"
          value={formatMinutes(total)}
          hint={`${topicSessions.length} sessões`}
        />
        <StatCard label="Última sessão" value={last ? formatDateBR(last) : "—"} />
      </div>
      <Card className="mb-6">
        <CardContent className="p-5">
          {editingDescription ? (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await topicMutations.update.mutateAsync({
                    id: topic.id,
                    input: { description: topicDescription.trim() || null },
                  });
                  toast.success("Descrição atualizada.");
                  setEditingDescription(false);
                } catch {
                  toast.error("Não foi possível atualizar a descrição.");
                }
              }}
            >
              <Label htmlFor="topic-detail-description">Descrição</Label>
              <Textarea
                id="topic-detail-description"
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Salvar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingDescription(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {topic.description || "Este assunto ainda não possui descrição."}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTopicDescription(topic.description ?? "");
                  setEditingDescription(true);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Editar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <TopicNotesReview topic={topic} courseId={courseId} />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Itens de estudo</h2>
          <p className="text-sm text-muted-foreground">Marque cada etapa conforme avançar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" aria-label="Filtrar por situação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="done">Concluídos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os tipos</SelectItem>
              {Object.entries(TOPIC_ITEM_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => openItem()}>
            <Plus className="mr-2 size-4" />
            Novo item
          </Button>
        </div>
      </div>
      {topicItems.length === 0 ? (
        <EmptyState
          title="Nenhum item de estudo"
          description={`Enquanto não houver itens, o progresso legado de ${topic.progress}% será preservado.`}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum item encontrado"
          description="Ajuste os filtros para ver outros itens."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <Checkbox
                  checked={item.completed}
                  aria-label={`Marcar ${item.title} como ${item.completed ? "pendente" : "concluído"}`}
                  onCheckedChange={async (checked) => {
                    try {
                      await itemMutations.setCompleted.mutateAsync({
                        id: item.id,
                        completed: checked === true,
                      });
                      toast.success(checked ? "Item concluído." : "Item reaberto.");
                    } catch {
                      toast.error("Não foi possível atualizar o item.");
                    }
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      item.completed ? "font-medium line-through opacity-60" : "font-medium"
                    }
                  >
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  ) : null}
                  <span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {TOPIC_ITEM_TYPE_LABELS[item.item_type as TopicItemType]}
                  </span>
                </div>
                {item.completed ? <CheckCircle2 className="size-5 text-success" /> : null}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Mover item para cima"
                  disabled={topicItems[0]?.id === item.id}
                  onClick={() => void move(item, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Mover item para baixo"
                  disabled={topicItems.at(-1)?.id === item.id}
                  onClick={() => void move(item, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Editar item"
                  onClick={() => openItem(item)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Excluir item"
                  onClick={async () => {
                    if (!confirm(`Excluir o item “${item.title}”?`)) return;
                    try {
                      await itemMutations.remove.mutateAsync(item.id);
                      toast.success("Item excluído.");
                    } catch {
                      toast.error("Não foi possível excluir o item.");
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveItem}>
            <div className="space-y-2">
              <Label htmlFor="item-title">Título</Label>
              <Input
                id="item-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Descrição</Label>
              <Textarea
                id="item-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as TopicItemType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TOPIC_ITEM_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <TopicMaterials topicId={topicId} />
    </div>
  );
}
