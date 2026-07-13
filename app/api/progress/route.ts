import { NextResponse } from "next/server";
import {
  completeSession,
  getDashboard,
  heartbeat,
  openLesson,
  recordReview,
  requireUserId,
  startSession,
  type ProgressRating,
  type StudyContext,
} from "@/lib/progress/server";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
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
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action || "");

    if (action === "start-session") {
      const context = body.context as StudyContext;
      if (!context?.gradeId || !context.subjectId || !context.chapterId || !context.lessonId) return badRequest("INVALID_CONTEXT");
      const id = await startSession(userId, context, Number(body.totalCards || 0), body.sessionId ? String(body.sessionId) : undefined);
      return NextResponse.json({ id });
    }

    if (action === "complete-session") {
      const counts = body.counts as Record<ProgressRating, number>;
      if (!body.sessionId || !counts) return badRequest("INVALID_SESSION");
      await completeSession(userId, String(body.sessionId), counts);
      return NextResponse.json({ ok: true });
    }

    if (action === "record-review") {
      const context = body.context as StudyContext;
      const rating = body.rating as ProgressRating;
      if (!body.sessionId || !body.flashcardId || !context || !["again", "hard", "good", "easy"].includes(rating)) return badRequest("INVALID_REVIEW");
      await recordReview(userId, {
        sessionId: String(body.sessionId),
        context,
        flashcardId: String(body.flashcardId),
        rating,
        responseTimeMs: Number(body.responseTimeMs || 0),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "open-lesson") {
      const context = body.context as StudyContext;
      if (!context?.gradeId || !context.subjectId || !context.chapterId || !context.lessonId) return badRequest("INVALID_CONTEXT");
      await openLesson(userId, context);
      return NextResponse.json({ ok: true });
    }

    if (action === "heartbeat") {
      const activityType = body.activityType as "app" | "lesson" | "flashcards";
      if (!(["app", "lesson", "flashcards"] as string[]).includes(activityType)) return badRequest("INVALID_ACTIVITY");
      const sessionId = await heartbeat(userId, {
        sessionId: body.sessionId ? String(body.sessionId) : undefined,
        activityType,
        context: body.context as Partial<StudyContext> | undefined,
        activeSeconds: Number(body.activeSeconds || 0),
        maxScrollPercent: Number(body.maxScrollPercent || 0),
        ended: Boolean(body.ended),
      });
      return NextResponse.json({ sessionId });
    }

    return badRequest("UNKNOWN_ACTION");
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return unauthorized();
    console.error("Progress action failed", error);
    return NextResponse.json({ error: "PROGRESS_SAVE_FAILED" }, { status: 500 });
  }
}
