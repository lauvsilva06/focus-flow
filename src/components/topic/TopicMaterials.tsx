import { useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
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
import { EmptyState } from "@/components/ui-kit";
import { useTopicMaterialMutations, useTopicMaterials } from "@/hooks/useStudyData";
import { isSafeExternalUrl } from "@/lib/url";
import { MATERIAL_TYPE_LABELS, type MaterialType, type TopicMaterial } from "@/lib/types";

export function TopicMaterials({ topicId }: { topicId: string }) {
  const query = useTopicMaterials(),
    mutations = useTopicMaterialMutations();
  const materials = (query.data ?? []).filter((m) => m.topic_id === topicId);
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<TopicMaterial | null>(null);
  const [title, setTitle] = useState(""),
    [url, setUrl] = useState(""),
    [description, setDescription] = useState(""),
    [type, setType] = useState<MaterialType>("other");
  const edit = (m?: TopicMaterial) => {
    setEditing(m ?? null);
    setTitle(m?.title ?? "");
    setUrl(m?.url ?? "");
    setDescription(m?.description ?? "");
    setType((m?.material_type as MaterialType) ?? "other");
    setOpen(true);
  };
  const move = async (material: TopicMaterial, delta: number) => {
    const index = materials.findIndex((m) => m.id === material.id),
      target = index + delta;
    if (target < 0 || target >= materials.length) return;
    const next = [...materials];
    [next[index], next[target]] = [next[target]!, next[index]!];
    try {
      await mutations.reorder.mutateAsync(next.map((m) => m.id));
    } catch {
      toast.error("Não foi possível reordenar os materiais.");
    }
  };
  return (
    <section className="mt-8" aria-labelledby="materials-heading">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id="materials-heading" className="text-lg font-semibold">
            Materiais
          </h2>
          <p className="text-sm text-muted-foreground">
            Links externos de apoio. Arquivos não são enviados ao Focus Flow.
          </p>
        </div>
        <Button onClick={() => edit()}>
          <Plus className="mr-2 size-4" />
          Novo material
        </Button>
      </div>
      {query.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : materials.length === 0 ? (
        <EmptyState
          title="Nenhum material"
          description="Adicione vídeos, artigos, documentação ou exercícios para este assunto."
        />
      ) : (
        <div className="space-y-2">
          {materials.map((m, index) => (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <Checkbox
                  checked={m.completed}
                  aria-label={`Marcar ${m.title} como concluído`}
                  onCheckedChange={async (checked) => {
                    try {
                      await mutations.update.mutateAsync({
                        id: m.id,
                        input: { completed: checked === true },
                      });
                    } catch {
                      toast.error("Não foi possível atualizar o material.");
                    }
                  }}
                />
                <div className="min-w-0 flex-1">
                  <a
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.title}
                    <ExternalLink className="size-3" />
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {MATERIAL_TYPE_LABELS[m.material_type as MaterialType]}
                    {m.description ? ` · ${m.description}` : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={index === 0}
                  aria-label="Mover material para cima"
                  onClick={() => void move(m, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={index === materials.length - 1}
                  aria-label="Mover material para baixo"
                  onClick={() => void move(m, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Editar material"
                  onClick={() => edit(m)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Excluir material"
                  onClick={async () => {
                    if (!confirm(`Excluir o material “${m.title}”?`)) return;
                    try {
                      await mutations.remove.mutateAsync(m.id);
                      toast.success("Material excluído.");
                    } catch {
                      toast.error("Não foi possível excluir o material.");
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
            <DialogTitle>{editing ? "Editar material" : "Novo material"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!isSafeExternalUrl(url)) {
                toast.error("Informe uma URL completa iniciada por http:// ou https://.");
                return;
              }
              const input = {
                topic_id: topicId,
                title: title.trim(),
                url: url.trim(),
                description: description.trim() || null,
                material_type: type,
                position: editing?.position ?? materials.length,
              };
              try {
                if (editing) await mutations.update.mutateAsync({ id: editing.id, input });
                else await mutations.create.mutateAsync(input);
                toast.success("Material salvo.");
                setOpen(false);
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Não foi possível salvar o material.",
                );
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="material-title">Título</Label>
              <Input
                id="material-title"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-url">URL</Label>
              <Input
                id="material-url"
                required
                type="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as MaterialType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MATERIAL_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-description">Descrição</Label>
              <Textarea
                id="material-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
