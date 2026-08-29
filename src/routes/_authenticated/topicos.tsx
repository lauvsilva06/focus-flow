import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/topicos")({
  beforeLoad: () => {
    throw redirect({ to: "/cursos" });
  },
});
