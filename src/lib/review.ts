export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

export type ReviewState = "not_studied" | "up_to_date" | "due_today" | "overdue";

export function reviewIntervalForCount(completedReviewCount: number): number {
  return REVIEW_INTERVALS_DAYS[
    Math.min(Math.max(completedReviewCount, 0), REVIEW_INTERVALS_DAYS.length - 1)
  ]!;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextReviewDate(reviewedAt: Date, completedReviewCount: number): string {
  const next = new Date(reviewedAt);
  next.setDate(next.getDate() + reviewIntervalForCount(completedReviewCount));
  return dateKey(next);
}

export function getReviewState(
  nextReviewAt: string | null,
  reviewCount: number,
  now = new Date(),
): ReviewState {
  if (!nextReviewAt && reviewCount === 0) return "not_studied";
  if (!nextReviewAt) return "up_to_date";
  const today = dateKey(now);
  if (nextReviewAt < today) return "overdue";
  if (nextReviewAt === today) return "due_today";
  return "up_to_date";
}

export const REVIEW_STATE_LABELS: Record<ReviewState, string> = {
  not_studied: "Ainda não estudado",
  up_to_date: "Revisão em dia",
  due_today: "Revisar hoje",
  overdue: "Revisão atrasada",
};
