"use client";

import { authClient } from "@/lib/auth/client";

export type ProgressRating = "again" | "hard" | "good" | "easy";

export type StudyContext = {
  gradeId: string;
  subjectId: string;
  chapterId: string;
  lessonId: string;
};

export type RatingCounts = Record<ProgressRating, number>;

export type CardProgressRow = {
  flashcard_id: string;
  grade_id: string;
  subject_id: string;
  chapter_id: string;
  lesson_id: string;
  status: "new" | "learning" | "review" | "mastered";
  last_rating: ProgressRating | null;
  repetitions: number;
  lapses: number;
  ease_factor: number | string;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string | null;
  updated_at: string;
};

export type StudySessionRow = {
  id: string;
  grade_id: string;
  subject_id: string;
  chapter_id: string;
  lesson_id: string;
  total_cards: number;
  again_count: number;
  hard_count: number;
  good_count: number;
  easy_count: number;
  started_at: string;
  completed_at: string | null;
};

export type ReviewEventRow = {
  id: number;
  lesson_id: string;
  flashcard_id: string;
  rating: ProgressRating;
  reviewed_at: string;
};

const DATA_API_URL = (
  process.env.NEXT_PUBLIC_NEON_DATA_API_URL ||
  "https://ep-long-wind-at258oxo.apirest.c-9.us-east-1.aws.neon.tech/neondb/rest/v1"
).replace(/\/$/, "");

function getNestedUser(data: unknown): { id?: string; name?: string } | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  const directUser = value.user;
  if (directUser && typeof directUser === "object") return directUser as { id?: string; name?: string };
  const session = value.session;
  if (session && typeof session === "object") {
    const sessionUser = (session as Record<string, unknown>).user;
    if (sessionUser && typeof sessionUser === "object") return sessionUser as { id?: string; name?: string };
  }
  return null;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function redirectToFreshSignIn(): never {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`/auth/sign-in?reason=session-expired&returnTo=${encodeURIComponent(returnTo)}`);
  throw new Error("AUTH_REDIRECT");
}

export async function getSignedInUser(): Promise<{ id: string; name?: string } | null> {
  try {
    const result = await authClient.getSession();
    const user = getNestedUser(result.data);
    return user?.id ? { id: user.id, name: user.name } : null;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string> {
  // Neon Auth can briefly expose the new session before the client token endpoint
  // is ready. Retrying after refreshing the session avoids false AUTH_REQUIRED errors.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await authClient.token();
    const token = result.data?.token;
    if (!result.error && token) return token;

    if (attempt < 2) {
      await authClient.getSession().catch(() => undefined);
      await sleep(250 * (attempt + 1));
    }
  }

  redirectToFreshSignIn();
}

async function dataApiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${DATA_API_URL}/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  if ((response.status === 401 || response.status === 403) && retry) {
    await authClient.getSession().catch(() => undefined);
    await sleep(250);
    return dataApiRequest<T>(path, init, false);
  }

  if (response.status === 401 || response.status === 403) {
    redirectToFreshSignIn();
  }

  if (!response.ok) {
    let message = `Data API error ${response.status}`;
    try {
      const body = await response.json() as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep the status-based message when the response has no JSON body.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function startStudySession(context: StudyContext, totalCards: number): Promise<string> {
  const rows = await dataApiRequest<StudySessionRow[]>("study_sessions?select=id", {
    method: "POST",
    headers: { Prefer: "missing=default,return=representation" },
    body: JSON.stringify({
      grade_id: context.gradeId,
      subject_id: context.subjectId,
      chapter_id: context.chapterId,
      lesson_id: context.lessonId,
      total_cards: Math.max(0, totalCards),
    }),
  });

  const id = rows?.[0]?.id;
  if (!id) throw new Error("Sesioni nuk u krijua.");
  return id;
}

async function getCardProgress(flashcardId: string): Promise<CardProgressRow | null> {
  const rows = await dataApiRequest<CardProgressRow[]>(
    `card_progress?select=*&flashcard_id=eq.${encodeURIComponent(flashcardId)}&limit=1`,
  );
  return rows[0] || null;
}

function calculateNextProgress(current: CardProgressRow | null, rating: ProgressRating) {
  const now = new Date();
  const repetitions = (current?.repetitions || 0) + 1;
  const lapses = (current?.lapses || 0) + (rating === "again" ? 1 : 0);
  const previousEase = Number(current?.ease_factor || 2.5);
  const previousInterval = current?.interval_days || 0;

  let easeFactor = previousEase;
  let intervalDays = previousInterval;
  const dueAt = new Date(now);
  let status: CardProgressRow["status"] = "learning";

  if (rating === "again") {
    easeFactor = Math.max(1.3, previousEase - 0.2);
    intervalDays = 0;
    dueAt.setMinutes(dueAt.getMinutes() + 1);
  } else if (rating === "hard") {
    easeFactor = Math.max(1.3, previousEase - 0.05);
    intervalDays = previousInterval > 0 ? Math.max(1, Math.round(previousInterval * 1.2)) : 0;
    if (intervalDays) dueAt.setDate(dueAt.getDate() + intervalDays);
    else dueAt.setMinutes(dueAt.getMinutes() + 6);
    status = repetitions >= 2 ? "review" : "learning";
  } else if (rating === "good") {
    intervalDays = previousInterval > 0 ? Math.max(1, Math.round(previousInterval * previousEase)) : 0;
    if (intervalDays) dueAt.setDate(dueAt.getDate() + intervalDays);
    else dueAt.setMinutes(dueAt.getMinutes() + 10);
    status = repetitions >= 5 ? "mastered" : "review";
  } else {
    easeFactor = Math.min(3.2, previousEase + 0.15);
    intervalDays = Math.max(4, Math.round(Math.max(previousInterval, 1) * 2.5));
    dueAt.setDate(dueAt.getDate() + intervalDays);
    status = repetitions >= 3 ? "mastered" : "review";
  }

  return {
    status,
    repetitions,
    lapses,
    ease_factor: Number(easeFactor.toFixed(2)),
    interval_days: intervalDays,
    due_at: dueAt.toISOString(),
    last_reviewed_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

export async function recordCardReview(input: {
  sessionId: string;
  context: StudyContext;
  flashcardId: string;
  rating: ProgressRating;
  responseTimeMs?: number;
}): Promise<void> {
  const current = await getCardProgress(input.flashcardId);
  const next = calculateNextProgress(current, input.rating);

  await dataApiRequest<void>("review_events", {
    method: "POST",
    headers: { Prefer: "missing=default,return=minimal" },
    body: JSON.stringify({
      session_id: input.sessionId,
      grade_id: input.context.gradeId,
      subject_id: input.context.subjectId,
      chapter_id: input.context.chapterId,
      lesson_id: input.context.lessonId,
      flashcard_id: input.flashcardId,
      rating: input.rating,
      response_time_ms: Number.isFinite(input.responseTimeMs) ? Math.max(0, Math.round(input.responseTimeMs || 0)) : null,
    }),
  });

  await dataApiRequest<void>("card_progress?on_conflict=user_id,flashcard_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,missing=default,return=minimal" },
    body: JSON.stringify({
      grade_id: input.context.gradeId,
      subject_id: input.context.subjectId,
      chapter_id: input.context.chapterId,
      lesson_id: input.context.lessonId,
      flashcard_id: input.flashcardId,
      last_rating: input.rating,
      ...next,
    }),
  });
}

export async function completeStudySession(sessionId: string, counts: RatingCounts): Promise<void> {
  await dataApiRequest<void>(`study_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      again_count: counts.again,
      hard_count: counts.hard,
      good_count: counts.good,
      easy_count: counts.easy,
      completed_at: new Date().toISOString(),
    }),
  });
}

export async function fetchProgressDashboard(): Promise<{
  progress: CardProgressRow[];
  sessions: StudySessionRow[];
  reviews: ReviewEventRow[];
}> {
  const [progress, sessions, reviews] = await Promise.all([
    dataApiRequest<CardProgressRow[]>("card_progress?select=*&order=updated_at.desc&limit=1000"),
    dataApiRequest<StudySessionRow[]>("study_sessions?select=*&order=started_at.desc&limit=100"),
    dataApiRequest<ReviewEventRow[]>("review_events?select=id,lesson_id,flashcard_id,rating,reviewed_at&order=reviewed_at.desc&limit=500"),
  ]);
  return { progress, sessions, reviews };
}
