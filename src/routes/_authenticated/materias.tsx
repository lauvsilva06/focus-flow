import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/materias")({
  beforeLoad: () => {
    throw redirect({ to: "/cursos" });
  },
});
