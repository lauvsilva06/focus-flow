import type { Database } from "@/integrations/supabase/types";

export type Course = Database["public"]["Tables"]["subjects"]["Row"];
/** @deprecated Use Course. Kept while the existing UI migrates terminology. */
export type Subject = Course;
export type Module = Database["public"]["Tables"]["modules"]["Row"];
export type Topic = Database["public"]["Tables"]["topics"]["Row"];
export type TopicItem = Database["public"]["Tables"]["topic_items"]["Row"];
export type TopicMaterial = Database["public"]["Tables"]["topic_materials"]["Row"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
export type StudySessionItem = Database["public"]["Tables"]["study_session_items"]["Row"];
export type PomodoroSettings = Database["public"]["Tables"]["pomodoro_settings"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type SessionType = "focus" | "short_break" | "long_break";
export type StudyMode = "theory" | "practice" | "review";
export type Rating = "hard" | "normal" | "good" | "excellent";
export type SessionStatus = "completed" | "interrupted" | "abandoned";
export type TopicStatus = "not_started" | "in_progress" | "done";
export type ModuleStatus = "active" | "archived";
export type CoursePriority = "low" | "medium" | "high";
export type TopicItemType = "theory" | "practice" | "lab" | "exercise" | "review";
export type MaterialType =
  | "video"
  | "article"
  | "documentation"
  | "external_pdf"
  | "lab"
  | "exercise"
  | "repository"
  | "other";

export const STUDY_MODE_LABELS: Record<StudyMode, string> = {
  theory: "Teórico",
  practice: "Prática",
  review: "Revisão",
};

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  focus: "Foco",
  short_break: "Pausa curta",
  long_break: "Pausa longa",
};

export const RATING_LABELS: Record<Rating, string> = {
  hard: "Difícil",
  normal: "Normal",
  good: "Boa",
  excellent: "Excelente",
};

export const STATUS_LABELS: Record<SessionStatus, string> = {
  completed: "Concluída",
  interrupted: "Interrompida",
  abandoned: "Abandonada",
};

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  done: "Concluído",
};

export const TOPIC_ITEM_TYPE_LABELS: Record<TopicItemType, string> = {
  theory: "Teoria",
  practice: "Prática",
  lab: "Laboratório",
  exercise: "Exercício",
  review: "Revisão",
};

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  video: "Vídeo",
  article: "Artigo",
  documentation: "Documentação",
  external_pdf: "PDF externo",
  lab: "Laboratório",
  exercise: "Exercício",
  repository: "Repositório",
  other: "Outro",
};

export const COURSE_PRIORITY_LABELS: Record<CoursePriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};
