import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui-kit";
import { useSettings, useSettingsMutation } from "@/hooks/useStudyData";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Focus | Ajustes do Pomodoro" },
      {
        name: "description",
        content: "Ajuste durações de foco e pausas, ciclos, som, notificações e início automático.",
      },
      { property: "og:title", content: "Configurações — Focus" },
      { property: "og:description", content: "Personalize o timer Pomodoro do seu jeito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function clamp(value: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function SettingsPage() {
  const { data: settings } = useSettings();
  const mutation = useSettingsMutation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    focus_minutes: 25,
    short_break_minutes: 5,
    long_break_minutes: 15,
    pomodoros_per_cycle: 4,
    auto_start_break: true,
    auto_start_next: false,
    sound_enabled: true,
    notifications_enabled: true,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      focus_minutes: settings.focus_minutes,
      short_break_minutes: settings.short_break_minutes,
      long_break_minutes: settings.long_break_minutes,
      pomodoros_per_cycle: settings.pomodoros_per_cycle,
      auto_start_break: settings.auto_start_break,
      auto_start_next: settings.auto_start_next,
      sound_enabled: settings.sound_enabled,
      notifications_enabled: settings.notifications_enabled,
    });
  }, [settings]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const sanitized = {
      ...form,
      focus_minutes: clamp(form.focus_minutes, 1, 180),
      short_break_minutes: clamp(form.short_break_minutes, 1, 180),
      long_break_minutes: clamp(form.long_break_minutes, 1, 180),
      pomodoros_per_cycle: clamp(form.pomodoros_per_cycle, 1, 12),
    };
    setForm(sanitized);
    await mutation.mutateAsync(sanitized);
    toast.success("Configurações salvas!");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const numberFields = [
    { key: "focus_minutes" as const, label: "Duração do foco (min)", min: 1, max: 180 },
    { key: "short_break_minutes" as const, label: "Pausa curta (min)", min: 1, max: 180 },
    { key: "long_break_minutes" as const, label: "Pausa longa (min)", min: 1, max: 180 },
    { key: "pomodoros_per_cycle" as const, label: "Pomodoros por ciclo", min: 1, max: 12 },
  ];

  const toggleFields = [
    { key: "auto_start_break" as const, label: "Iniciar pausa automaticamente" },
    { key: "auto_start_next" as const, label: "Iniciar próximo foco automaticamente" },
    { key: "sound_enabled" as const, label: "Som ao finalizar" },
    { key: "notifications_enabled" as const, label: "Notificações do navegador" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configurações" description="Ajuste o Pomodoro ao seu ritmo." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timer</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {numberFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={form[field.key]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [field.key]: clamp(Number(e.target.value), field.min, field.max),
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {toggleFields.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Switch
                    id={field.key}
                    checked={form[field.key]}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, [field.key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              Salvar configurações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Button variant="secondary" onClick={() => void signOut()}>
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
