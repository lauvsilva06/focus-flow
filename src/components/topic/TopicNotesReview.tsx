import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTopicMutations } from "@/hooks/useStudyData";
import { formatDateBR } from "@/lib/format";
import { getReviewState, REVIEW_STATE_LABELS } from "@/lib/review";
import type { Topic } from "@/lib/types";

export function TopicNotesReview({ topic, courseId }: { topic: Topic; courseId: string }) {
  const mutations = useTopicMutations();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic.notes ?? "");
  const [date, setDate] = useState(topic.next_review_at ?? "");
  useEffect(() => {
    if (!editing) setDraft(topic.notes ?? "");
  }, [topic.notes, editing]);
  const state = getReviewState(topic.next_review_at, topic.review_count);
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Anotações</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)}>
            <Pencil className="mr-2 size-4" />
            {editing ? "Visualizar" : "Editar"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <>
              <Textarea
                aria-label="Anotações em Markdown"
                className="min-h-48 font-mono text-sm"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Use Markdown simples: títulos, listas, **negrito**, `código` e blocos ```"
              />
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await mutations.update.mutateAsync({
                      id: topic.id,
                      input: { notes: draft || null },
                    });
                    toast.success("Anotações salvas.");
                    setEditing(false);
                  } catch {
                    toast.error("Não foi possível salvar as anotações.");
                  }
                }}
              >
                Salvar anotações
              </Button>
            </>
          ) : draft ? (
            <SafeMarkdown value={draft} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Registre conceitos, exemplos e trechos de código. O conteúdo é exibido sem executar
              HTML.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="size-5" />
            Revisão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium">{REVIEW_STATE_LABELS[state]}</span>
            <p className="text-muted-foreground">
              {topic.next_review_at
                ? `Próxima: ${formatDateBR(`${topic.next_review_at}T12:00:00`)}`
                : "Nenhuma revisão programada."}
            </p>
          </div>
          <p className="text-muted-foreground">
            Após confirmar uma revisão, o próximo intervalo segue 1, 3, 7, 14 e então 30 dias.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await mutations.markReviewed.mutateAsync(topic);
                  toast.success("Revisão registrada e próxima data calculada.");
                } catch {
                  toast.error("Não foi possível registrar a revisão.");
                }
              }}
            >
              <CheckCircle2 className="mr-2 size-4" />
              Marcar como revisado
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/pomodoro" search={{ courseId, topicId: topic.id, mode: "review" }}>
                <Play className="mr-2 size-4" />
                Iniciar revisão
              </Link>
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              aria-label="Próxima revisão"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await mutations.update.mutateAsync({
                    id: topic.id,
                    input: { next_review_at: date || null },
                  });
                  toast.success("Data de revisão atualizada.");
                } catch {
                  toast.error("Não foi possível atualizar a data.");
                }
              }}
            >
              Programar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
