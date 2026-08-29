import type { SessionInput } from "@/services/study";
import { uniqueByClientSessionId } from "@/lib/session-rules";

export type PendingSession = {
  clientSessionId: string;
  input: Omit<SessionInput, "client_session_id">;
  queuedAt: string;
};

function storageKey(userId: string) {
  return `focus.pending-sessions.${userId}.v1`;
}

export function readPendingSessions(userId: string): PendingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return uniqueByClientSessionId(
      parsed.filter(
        (item): item is PendingSession =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as PendingSession).clientSessionId === "string" &&
          typeof (item as PendingSession).queuedAt === "string" &&
          typeof (item as PendingSession).input === "object" &&
          (item as PendingSession).input !== null,
      ),
    );
  } catch {
    return [];
  }
}

function writePendingSessions(userId: string, sessions: PendingSession[]) {
  if (typeof window === "undefined") return;
  const key = storageKey(userId);
  if (sessions.length === 0) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, JSON.stringify(sessions));
}

export function enqueueSession(
  userId: string,
  input: Omit<SessionInput, "client_session_id">,
): PendingSession {
  const pending: PendingSession = {
    clientSessionId: crypto.randomUUID(),
    input,
    queuedAt: new Date().toISOString(),
  };
  writePendingSessions(userId, [...readPendingSessions(userId), pending]);
  return pending;
}

export function removePendingSession(userId: string, clientSessionId: string) {
  writePendingSessions(
    userId,
    readPendingSessions(userId).filter((item) => item.clientSessionId !== clientSessionId),
  );
}
