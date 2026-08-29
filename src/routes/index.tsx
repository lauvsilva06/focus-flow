import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Focus — Gerenciador de estudos com Pomodoro" },
      {
        name: "description",
        content:
          "Organize cursos e assuntos, use um Pomodoro configurável e acompanhe metas, histórico e sequências de estudo.",
      },
      { property: "og:title", content: "Focus — Gerenciador de estudos com Pomodoro" },
      {
        property: "og:description",
        content: "Pomodoro, metas, estatísticas e streaks para estudar com consistência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
          F
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Focus</h1>
        <p className="mt-2 text-sm text-muted-foreground">Carregando seu ambiente de estudos…</p>
      </div>
    </div>
  );
}
