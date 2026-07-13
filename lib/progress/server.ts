import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/server";

export type ProgressRating = "again" | "hard" | "good" | "easy";
export type StudyContext = { gradeId: string; subjectId: string; chapterId: string; lessonId: string };
export type ReviewSchedulePreview = Record<ProgressRating, {
  label: string;
  dueAt: string;
  intervalDays: number;
  status: string;
}>;

const MIN_EASE = 1.3;
const MAX_EASE = 3.2;
const MASTERED_INTERVAL_DAYS = 21;

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}

export async function requireUserId(): Promise<string> {
  const { data } = await auth.getSession();
  const value = data as unknown as { user?: { id?: string }; session?: { user?: { id?: string } } } | null;
  const id = value?.user?.id || value?.session?.user?.id;
  if (!id) throw new Error("AUTH_REQUIRED");
  return id;
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nextProgress(current: Record<string, unknown> | null, rating: ProgressRating, at = new Date()) {
  const now = new Date(at);
  const previousStatus = String(current?.status || "new");
  const previousRating = current?.last_rating as ProgressRating | undefined;
  const previousRepetitions = Math.max(0, Math.round(numberValue(current?.repetitions, 0)));
  const previousLapses = Math.max(0, Math.round(numberValue(current?.lapses, 0)));
  const previousEase = Math.min(MAX_EASE, Math.max(MIN_EASE, numberValue(current?.ease_factor, 2.5)));
  const previousInterval = Math.max(0, Math.round(numberValue(current?.interval_days, 0)));
  const isLearning = !current || previousStatus === "new" || previousStatus === "learning" || previousInterval === 0;

  let repetitions = previousRepetitions;
  let lapses = previousLapses;
  let easeFactor = previousEase;
  let intervalDays = previousInterval;
  let status = previousStatus;
  const dueAt = new Date(now);

  if (rating === "again") {
    repetitions = 0;
    lapses += 1;
    intervalDays = 0;
    status = "learning";
    if (!isLearning) easeFactor = Math.max(MIN_EASE, previousEase - 0.2);
    dueAt.setMinutes(dueAt.getMinutes() + 1);
  } else if (rating === "hard") {
    if (isLearning) {
      intervalDays = 0;
      status = "learning";
      dueAt.setMinutes(dueAt.getMinutes() + 6);
    } else {
      easeFactor = Math.max(MIN_EASE, previousEase - 0.15);
      intervalDays = Math.max(1, Math.round(previousInterval * 1.2));
      status = intervalDays >= MASTERED_INTERVAL_DAYS ? "mastered" : "review";
      dueAt.setDate(dueAt.getDate() + intervalDays);
    }
  } else if (rating === "good") {
    repetitions = previousRepetitions + 1;
    if (isLearning) {
      if (previousRepetitions >= 1 && previousRating === "good") {
        intervalDays = 1;
        status = "review";
        dueAt.setDate(dueAt.getDate() + 1);
      } else {
        intervalDays = 0;
        status = "learning";
        dueAt.setMinutes(dueAt.getMinutes() + 10);
      }
    } else {
      intervalDays = Math.max(previousInterval + 1, Math.round(previousInterval * previousEase));
      status = intervalDays >= MASTERED_INTERVAL_DAYS ? "mastered" : "review";
      dueAt.setDate(dueAt.getDate() + intervalDays);
    }
  } else {
    repetitions = previousRepetitions + 1;
    easeFactor = isLearning ? previousEase : Math.min(MAX_EASE, previousEase + 0.15);
    intervalDays = isLearning
      ? 4
      : Math.max(previousInterval + 1, Math.round(previousInterval * previousEase * 1.3));
    status = intervalDays >= MASTERED_INTERVAL_DAYS ? "mastered" : "review";
    dueAt.setDate(dueAt.getDate() + intervalDays);
  }

  return {
    status,
    repetitions,
    lapses,
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    dueAt,
    now,
  };
}

function intervalLabel(now: Date, dueAt: Date): string {
  const totalSeconds = Math.max(60, Math.round((dueAt.getTime() - now.getTime()) / 1000));
  if (totalSeconds < 3600) return `${Math.max(1, Math.round(totalSeconds / 60))} min`;
  if (totalSeconds < 86400) {
    const hours = Math.max(1, Math.round(totalSeconds / 3600));
    return hours === 1 ? "1 orë" : `${hours} orë`;
  }
  const days = Math.max(1, Math.round(totalSeconds / 86400));
  return days === 1 ? "1 ditë" : `${days} ditë`;
}

export async function previewReviewSchedule(userId: string, flashcardId: string): Promise<ReviewSchedulePreview> {
  const sql = database();
  const rows = await sql`SELECT status, last_rating, repetitions, lapses, ease_factor, interval_days, due_at FROM public.card_progress WHERE user_id=${userId} AND flashcard_id=${flashcardId} LIMIT 1`;
  const current = (rows[0] as Record<string, unknown> | undefined) || null;
  const now = new Date();
  const ratings: ProgressRating[] = ["again", "hard", "good", "easy"];

  return ratings.reduce<ReviewSchedulePreview>((preview, rating) => {
    const next = nextProgress(current, rating, now);
    preview[rating] = {
      label: intervalLabel(now, next.dueAt),
      dueAt: next.dueAt.toISOString(),
      intervalDays: next.intervalDays,
      status: next.status,
    };
    return preview;
  }, {} as ReviewSchedulePreview);
}

export async function getDashboard(userId: string) {
  const sql = database();
  const [progress, sessions, reviews, lessons, activity] = await Promise.all([
    sql`SELECT flashcard_id, grade_id, subject_id, chapter_id, lesson_id, status, last_rating, repetitions, lapses, ease_factor, interval_days, due_at, last_reviewed_at, updated_at FROM public.card_progress WHERE user_id=${userId} ORDER BY updated_at DESC LIMIT 1000`,
    sql`SELECT id, grade_id, subject_id, chapter_id, lesson_id, total_cards, again_count, hard_count, good_count, easy_count, started_at, completed_at FROM public.study_sessions WHERE user_id=${userId} ORDER BY started_at DESC LIMIT 200`,
    sql`SELECT id, lesson_id, flashcard_id, rating, response_time_ms, reviewed_at FROM public.review_events WHERE user_id=${userId} ORDER BY reviewed_at DESC LIMIT 1000`,
    sql`SELECT lesson_id, grade_id, subject_id, chapter_id, first_opened_at, last_opened_at, active_seconds, open_count, max_scroll_percent, completed_at, updated_at FROM public.lesson_progress WHERE user_id=${userId} ORDER BY updated_at DESC LIMIT 500`,
    sql`SELECT id, activity_type, lesson_id, started_at, last_seen_at, ended_at, active_seconds FROM public.activity_sessions WHERE user_id=${userId} ORDER BY started_at DESC LIMIT 500`,
  ]);
  return { progress, sessions, reviews, lessons, activity };
}

export async function startSession(userId: string, context: StudyContext, totalCards: number, requestedId?: string) {
  const sql = database();
  const validRequestedId = requestedId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedId)
    ? requestedId
    : null;

  if (validRequestedId) {
    const rows = await sql`INSERT INTO public.study_sessions (id, user_id, grade_id, subject_id, chapter_id, lesson_id, total_cards) VALUES (${validRequestedId}, ${userId}, ${context.gradeId}, ${context.subjectId}, ${context.chapterId}, ${context.lessonId}, ${Math.max(0, totalCards)}) ON CONFLICT (id) DO UPDATE SET total_cards=EXCLUDED.total_cards WHERE public.study_sessions.user_id=${userId} RETURNING id`;
    return String(rows[0]?.id || validRequestedId);
  }

  const rows = await sql`INSERT INTO public.study_sessions (user_id, grade_id, subject_id, chapter_id, lesson_id, total_cards) VALUES (${userId}, ${context.gradeId}, ${context.subjectId}, ${context.chapterId}, ${context.lessonId}, ${Math.max(0, totalCards)}) RETURNING id`;
  return String(rows[0]?.id);
}

export async function completeSession(userId: string, sessionId: string, counts: Record<ProgressRating, number>) {
  const sql = database();
  await sql`UPDATE public.study_sessions SET again_count=${counts.again}, hard_count=${counts.hard}, good_count=${counts.good}, easy_count=${counts.easy}, completed_at=now() WHERE id=${sessionId} AND user_id=${userId}`;
}

export async function recordReview(userId: string, input: { sessionId: string; context: StudyContext; flashcardId: string; rating: ProgressRating; responseTimeMs?: number }) {
  const sql = database();
  const rows = await sql`SELECT status, last_rating, repetitions, lapses, ease_factor, interval_days, due_at FROM public.card_progress WHERE user_id=${userId} AND flashcard_id=${input.flashcardId} LIMIT 1`;
  const next = nextProgress((rows[0] as Record<string, unknown> | undefined) || null, input.rating);
  await sql`INSERT INTO public.review_events (user_id, session_id, grade_id, subject_id, chapter_id, lesson_id, flashcard_id, rating, response_time_ms) VALUES (${userId}, ${input.sessionId}, ${input.context.gradeId}, ${input.context.subjectId}, ${input.context.chapterId}, ${input.context.lessonId}, ${input.flashcardId}, ${input.rating}, ${Number.isFinite(input.responseTimeMs) ? Math.max(0, Math.round(input.responseTimeMs || 0)) : null})`;
  await sql`INSERT INTO public.card_progress (user_id, grade_id, subject_id, chapter_id, lesson_id, flashcard_id, last_rating, status, repetitions, lapses, ease_factor, interval_days, due_at, last_reviewed_at, updated_at) VALUES (${userId}, ${input.context.gradeId}, ${input.context.subjectId}, ${input.context.chapterId}, ${input.context.lessonId}, ${input.flashcardId}, ${input.rating}, ${next.status}, ${next.repetitions}, ${next.lapses}, ${next.easeFactor}, ${next.intervalDays}, ${next.dueAt.toISOString()}, ${next.now.toISOString()}, ${next.now.toISOString()}) ON CONFLICT (user_id, flashcard_id) DO UPDATE SET grade_id=EXCLUDED.grade_id, subject_id=EXCLUDED.subject_id, chapter_id=EXCLUDED.chapter_id, lesson_id=EXCLUDED.lesson_id, last_rating=EXCLUDED.last_rating, status=EXCLUDED.status, repetitions=EXCLUDED.repetitions, lapses=EXCLUDED.lapses, ease_factor=EXCLUDED.ease_factor, interval_days=EXCLUDED.interval_days, due_at=EXCLUDED.due_at, last_reviewed_at=EXCLUDED.last_reviewed_at, updated_at=EXCLUDED.updated_at`;
}

export async function openLesson(userId: string, context: StudyContext) {
  const sql = database();
  await sql`INSERT INTO public.lesson_progress (user_id, grade_id, subject_id, chapter_id, lesson_id) VALUES (${userId}, ${context.gradeId}, ${context.subjectId}, ${context.chapterId}, ${context.lessonId}) ON CONFLICT (user_id, lesson_id) DO UPDATE SET last_opened_at=now(), open_count=public.lesson_progress.open_count + 1, updated_at=now()`;
}

export async function heartbeat(userId: string, input: { sessionId?: string; activityType: "app" | "lesson" | "flashcards"; context?: Partial<StudyContext>; activeSeconds: number; maxScrollPercent?: number; ended?: boolean }) {
  const sql = database();
  const increment = Math.min(60, Math.max(0, Math.round(input.activeSeconds)));
  let sessionId = input.sessionId;
  if (!sessionId) {
    const rows = await sql`INSERT INTO public.activity_sessions (user_id, activity_type, grade_id, subject_id, chapter_id, lesson_id) VALUES (${userId}, ${input.activityType}, ${input.context?.gradeId || null}, ${input.context?.subjectId || null}, ${input.context?.chapterId || null}, ${input.context?.lessonId || null}) RETURNING id`;
    sessionId = String(rows[0]?.id);
  }
  await sql`UPDATE public.activity_sessions SET active_seconds=active_seconds + ${increment}, last_seen_at=now(), ended_at=${input.ended ? new Date().toISOString() : null}, updated_at=now() WHERE id=${sessionId} AND user_id=${userId}`;
  if (input.activityType === "lesson" && input.context?.lessonId && input.context.gradeId && input.context.subjectId && input.context.chapterId) {
    const scroll = Math.min(100, Math.max(0, Math.round(input.maxScrollPercent || 0)));
    await sql`INSERT INTO public.lesson_progress (user_id, grade_id, subject_id, chapter_id, lesson_id, active_seconds, max_scroll_percent) VALUES (${userId}, ${input.context.gradeId}, ${input.context.subjectId}, ${input.context.chapterId}, ${input.context.lessonId}, ${increment}, ${scroll}) ON CONFLICT (user_id, lesson_id) DO UPDATE SET active_seconds=public.lesson_progress.active_seconds + ${increment}, max_scroll_percent=GREATEST(public.lesson_progress.max_scroll_percent, ${scroll}), last_opened_at=now(), completed_at=CASE WHEN (public.lesson_progress.active_seconds + ${increment}) >= 60 AND GREATEST(public.lesson_progress.max_scroll_percent, ${scroll}) >= 80 THEN COALESCE(public.lesson_progress.completed_at, now()) ELSE public.lesson_progress.completed_at END, updated_at=now()`;
  }
  return sessionId;
}
