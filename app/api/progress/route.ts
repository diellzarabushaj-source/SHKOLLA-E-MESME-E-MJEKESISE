import { NextResponse } from "next/server";
import {
  completeSession,
  getDashboard,
  heartbeat,
  openLesson,
  previewReviewSchedule,
  recordReview,
  requireUserId,
  startSession,
  type ProgressRating,
  type StudyContext,
} from "@/lib/progress/server";

export const dynamic = "force-dynamic";

const CONTENT_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const noStoreHeaders = { "Cache-Control": "no-store" };

function unauthorized() {
  return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers: noStoreHeaders });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403, headers: noStoreHeaders });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
}

function validContentId(value: unknown): value is string {
  return typeof value === "string" && CONTENT_ID_PATTERN.test(value);
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function parseContext(value: unknown): StudyContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const context = value as Partial<StudyContext>;
  if (![context.gradeId, context.subjectId, context.chapterId, context.lessonId].every(validContentId)) return null;
  return context as StudyContext;
}

function parseCounts(value: unknown): Record<ProgressRating, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const counts = value as Partial<Record<ProgressRating, unknown>>;
  return {
    again: boundedInteger(counts.again, 0, 100_000),
    hard: boundedInteger(counts.hard, 0, 100_000),
    good: boundedInteger(counts.good, 0, 100_000),
    easy: boundedInteger(counts.easy, 0, 100_000),
  };
}

export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json(await getDashboard(userId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return unauthorized();
    console.error("Progress dashboard failed", error);
    return NextResponse.json({ error: "PROGRESS_LOAD_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const parsedBody = await request.json().catch(() => null);
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) return badRequest("INVALID_JSON");
    const body = parsedBody as Record<string, unknown>;
    if (typeof body.clientUserId !== "string" || body.clientUserId !== userId) return forbidden("PROGRESS_USER_MISMATCH");
    const action = String(body.action || "");

    if (action === "start-session") {
      const context = parseContext(body.context);
      if (!context) return badRequest("INVALID_CONTEXT");
      if (body.sessionId && !validUuid(body.sessionId)) return badRequest("INVALID_SESSION");
      const id = await startSession(
        userId,
        context,
        boundedInteger(body.totalCards, 0, 5_000),
        validUuid(body.sessionId) ? body.sessionId : undefined,
      );
      return NextResponse.json({ id });
    }

    if (action === "complete-session") {
      const counts = parseCounts(body.counts);
      if (!validUuid(body.sessionId) || !counts) return badRequest("INVALID_SESSION");
      await completeSession(userId, body.sessionId, counts);
      return NextResponse.json({ ok: true });
    }

    if (action === "preview-review") {
      if (!validContentId(body.flashcardId)) return badRequest("INVALID_FLASHCARD");
      return NextResponse.json(await previewReviewSchedule(userId, body.flashcardId), {
        headers: noStoreHeaders,
      });
    }

    if (action === "record-review") {
      const context = parseContext(body.context);
      const rating = body.rating as ProgressRating;
      if (!validUuid(body.sessionId) || !validContentId(body.flashcardId) || !context || !["again", "hard", "good", "easy"].includes(rating)) return badRequest("INVALID_REVIEW");
      await recordReview(userId, {
        sessionId: body.sessionId,
        context,
        flashcardId: body.flashcardId,
        rating,
        responseTimeMs: boundedInteger(body.responseTimeMs, 0, 6 * 60 * 60 * 1_000),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "open-lesson") {
      const context = parseContext(body.context);
      if (!context) return badRequest("INVALID_CONTEXT");
      await openLesson(userId, context);
      return NextResponse.json({ ok: true });
    }

    if (action === "heartbeat") {
      const activityType = body.activityType as "app" | "lesson" | "flashcards";
      if (!(["app", "lesson", "flashcards"] as string[]).includes(activityType)) return badRequest("INVALID_ACTIVITY");
      if (body.sessionId && !validUuid(body.sessionId)) return badRequest("INVALID_SESSION");
      const context = body.context ? parseContext(body.context) : null;
      if (activityType !== "app" && !context) return badRequest("INVALID_CONTEXT");
      const sessionId = await heartbeat(userId, {
        sessionId: validUuid(body.sessionId) ? body.sessionId : undefined,
        activityType,
        context: context || undefined,
        activeSeconds: boundedInteger(body.activeSeconds, 0, 60),
        maxScrollPercent: boundedInteger(body.maxScrollPercent, 0, 100),
        ended: Boolean(body.ended),
      });
      return NextResponse.json({ sessionId });
    }

    return badRequest("UNKNOWN_ACTION");
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return unauthorized();
    if (error instanceof Error && ["INVALID_SESSION", "SESSION_ID_CONFLICT"].includes(error.message)) return badRequest(error.message);
    console.error("Progress action failed", error);
    return NextResponse.json({ error: "PROGRESS_SAVE_FAILED" }, { status: 500, headers: noStoreHeaders });
  }
}
