import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { PomodoroProvider, usePomodoro } from "@/hooks/usePomodoro";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatClock } from "@/lib/format";
import { SESSION_TYPE_LABELS } from "@/lib/types";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function TimerIndicator() {
  const { state, remainingSec, isRunning, isBreak } = usePomodoro();
  if (!state) return null;
  const dotColor = !isRunning ? "bg-muted-foreground" : isBreak ? "bg-success" : "bg-primary";
  return (
    <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs sm:flex">
      <span className={`size-2 rounded-full ${dotColor}`} />
      <span className="text-foreground-secondary">{SESSION_TYPE_LABELS[state.phase]}</span>
      <span className="text-timer font-semibold">{formatClock(remainingSec)}</span>
    </div>
  );
}

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <PomodoroProvider userId={user.id}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-6">
              <SidebarTrigger />
              <div className="ml-auto flex items-center gap-3">
                <TimerIndicator />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="size-4" />
                      <span className="hidden max-w-40 truncate sm:inline">{user?.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/configuracoes" })}>
                      <SettingsIcon className="mr-2 size-4" /> Configurações
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void signOut()}>
                      <LogOut className="mr-2 size-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <main className="min-w-0 flex-1 p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PomodoroProvider>
  );
}
