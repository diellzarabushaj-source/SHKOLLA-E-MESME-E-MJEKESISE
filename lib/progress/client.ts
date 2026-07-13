"use client";

import { authClient } from "@/lib/auth/client";

export type ProgressRating = "again" | "hard" | "good" | "easy";
export type StudyContext = { gradeId: string; subjectId: string; chapterId: string; lessonId: string };
export type RatingCounts = Record<ProgressRating, number>;
export type ReviewSchedulePreview = Record<ProgressRating, { label: string; dueAt: string; intervalDays: number; status: string }>;
export type CardProgressRow = { flashcard_id: string; grade_id: string; subject_id: string; chapter_id: string; lesson_id: string; status: "new" | "learning" | "review" | "mastered"; last_rating: ProgressRating | null; repetitions: number; lapses: number; ease_factor: number | string; interval_days: number; due_at: string; last_reviewed_at: string | null; updated_at: string };
export type StudySessionRow = { id: string; grade_id: string; subject_id: string; chapter_id: string; lesson_id: string; total_cards: number; again_count: number; hard_count: number; good_count: number; easy_count: number; started_at: string; completed_at: string | null };
export type ReviewEventRow = { id: number; lesson_id: string; flashcard_id: string; rating: ProgressRating; response_time_ms?: number | null; reviewed_at: string };
export type LessonProgressRow = { lesson_id: string; grade_id: string; subject_id: string; chapter_id: string; first_opened_at: string; last_opened_at: string; active_seconds: number; open_count: number; max_scroll_percent: number; completed_at: string | null; updated_at: string };
export type ActivitySessionRow = { id: string; activity_type: "app" | "lesson" | "flashcards"; lesson_id: string | null; started_at: string; last_seen_at: string; ended_at: string | null; active_seconds: number };

function nestedUser(data: unknown): { id?: string; name?: string } | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (value.user && typeof value.user === "object") return value.user as { id?: string; name?: string };
  if (value.session && typeof value.session === "object") {
    const user = (value.session as Record<string, unknown>).user;
    if (user && typeof user === "object") return user as { id?: string; name?: string };
  }
  return null;
}

export async function getSignedInUser(): Promise<{ id: string; name?: string } | null> {
  try {
    const result = await authClient.getSession();
    const user = nestedUser(result.data);
    return user?.id ? { id: user.id, name: user.name } : null;
  } catch {
    return null;
  }
}

async function api<T>(body?: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/progress", {
    method: body ? "POST" : "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) throw new Error("AUTH_REQUIRED");
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || `PROGRESS_${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function startStudySession(context: StudyContext, totalCards: number): Promise<string> {
  const result = await api<{ id: string }>({ action: "start-session", context, totalCards });
  return result.id;
}

export async function fetchReviewSchedule(flashcardId: string): Promise<ReviewSchedulePreview> {
  return api<ReviewSchedulePreview>({ action: "preview-review", flashcardId });
}

export async function recordCardReview(input: { sessionId: string; context: StudyContext; flashcardId: string; rating: ProgressRating; responseTimeMs?: number }): Promise<void> {
  await api({ action: "record-review", ...input });
}

export async function completeStudySession(sessionId: string, counts: RatingCounts): Promise<void> {
  await api({ action: "complete-session", sessionId, counts });
}

export async function markLessonOpened(context: StudyContext): Promise<void> {
  await api({ action: "open-lesson", context });
}

export async function sendActivityHeartbeat(input: { sessionId?: string; activityType: "app" | "lesson" | "flashcards"; context?: Partial<StudyContext>; activeSeconds: number; maxScrollPercent?: number; ended?: boolean }): Promise<string> {
  const result = await api<{ sessionId: string }>({ action: "heartbeat", ...input });
  return result.sessionId;
}

export async function fetchProgressDashboard(): Promise<{
  progress: CardProgressRow[];
  sessions: StudySessionRow[];
  reviews: ReviewEventRow[];
  lessons: LessonProgressRow[];
  activity: ActivitySessionRow[];
}> {
  return api();
}
