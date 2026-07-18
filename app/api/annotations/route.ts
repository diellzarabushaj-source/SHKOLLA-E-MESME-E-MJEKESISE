import { NextResponse } from "next/server";
import {
  createLessonAnnotation,
  deleteLessonAnnotation,
  listLessonAnnotations,
  requireAnnotationUserId,
  updateLessonAnnotation,
  type AnnotationColor,
  type AnnotationKind,
} from "@/lib/annotations/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const LESSON_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/;
const BLOCK_KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,160}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLORS = new Set<AnnotationColor>(["yellow", "green", "blue", "pink"]);
const KINDS = new Set<AnnotationKind>(["highlight", "note"]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function firstForwardedValue(value: string | null): string {
  return value?.split(",")[0]?.trim() || "";
}

function isSameOriginRequest(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return false;

  try {
    const origin = new URL(originHeader);
    const requestUrl = new URL(request.url);
    const publicHost = firstForwardedValue(request.headers.get("x-forwarded-host"))
      || request.headers.get("host")?.trim()
      || requestUrl.host;
    const publicProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"))
      || requestUrl.protocol.replace(":", "");

    return origin.host.toLowerCase() === publicHost.toLowerCase()
      && origin.protocol.toLowerCase() === `${publicProtocol.toLowerCase()}:`;
  } catch {
    return false;
  }
}

function cleanText(value: unknown, maximum: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n/g, "\n");
  if (text.length > maximum || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) return null;
  if (!allowEmpty && !text.trim()) return null;
  return text;
}

function parseInteger(value: unknown, minimum: number, maximum: number): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) return null;
  return parsed;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "ANNOTATION_FAILED";
  if (message === "AUTH_REQUIRED") return jsonError(message, 401);
  if (message === "ANNOTATION_NOT_FOUND") return jsonError(message, 404);
  if (message === "ANNOTATION_LIMIT_REACHED") return jsonError(message, 409);
  console.error("Lesson annotation request failed", error);
  return jsonError("ANNOTATION_FAILED", 500);
}

export async function GET(request: Request) {
  try {
    const userId = await requireAnnotationUserId();
    const lessonId = new URL(request.url).searchParams.get("lessonId") || "";
    if (!LESSON_ID_PATTERN.test(lessonId)) return jsonError("INVALID_LESSON_ID", 400);
    const annotations = await listLessonAnnotations(userId, lessonId);
    return NextResponse.json({ annotations }, { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("INVALID_ORIGIN", 403);

  try {
    const userId = await requireAnnotationUserId();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || Array.isArray(body)) return jsonError("INVALID_JSON", 400);

    const lessonId = cleanText(body.lessonId, 200);
    const contentRevision = body.contentRevision === null || body.contentRevision === undefined
      ? null
      : cleanText(body.contentRevision, 200);
    const kind = body.kind as AnnotationKind;
    const color = body.color as AnnotationColor;
    const blockKey = cleanText(body.blockKey, 160);
    const startOffset = parseInteger(body.startOffset, 0, 1_000_000);
    const endOffset = parseInteger(body.endOffset, 1, 1_000_000);
    const quote = cleanText(body.quote, 1_000);
    const prefix = cleanText(body.prefix ?? "", 160, true);
    const suffix = cleanText(body.suffix ?? "", 160, true);
    const noteText = kind === "note" ? cleanText(body.noteText, 4_000) : null;

    if (!lessonId || !LESSON_ID_PATTERN.test(lessonId)) return jsonError("INVALID_LESSON_ID", 400);
    if (contentRevision === null && body.contentRevision !== null && body.contentRevision !== undefined) return jsonError("INVALID_CONTENT_REVISION", 400);
    if (!KINDS.has(kind)) return jsonError("INVALID_ANNOTATION_KIND", 400);
    if (!COLORS.has(color)) return jsonError("INVALID_ANNOTATION_COLOR", 400);
    if (!blockKey || !BLOCK_KEY_PATTERN.test(blockKey)) return jsonError("INVALID_BLOCK_KEY", 400);
    if (startOffset === null || endOffset === null || endOffset <= startOffset) return jsonError("INVALID_ANNOTATION_RANGE", 400);
    if (!quote || prefix === null || suffix === null) return jsonError("INVALID_ANNOTATION_TEXT", 400);
    if (kind === "note" && !noteText) return jsonError("INVALID_NOTE_TEXT", 400);

    const annotation = await createLessonAnnotation(userId, {
      lessonId,
      contentRevision,
      kind,
      blockKey,
      startOffset,
      endOffset,
      quote,
      prefix,
      suffix,
      color,
      noteText,
    });
    return NextResponse.json({ annotation }, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("INVALID_ORIGIN", 403);

  try {
    const userId = await requireAnnotationUserId();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || Array.isArray(body)) return jsonError("INVALID_JSON", 400);

    const id = cleanText(body.id, 80);
    const color = body.color === undefined ? undefined : body.color as AnnotationColor;
    const noteText = body.noteText === undefined ? undefined : cleanText(body.noteText, 4_000);

    if (!id || !UUID_PATTERN.test(id)) return jsonError("INVALID_ANNOTATION_ID", 400);
    if (color !== undefined && !COLORS.has(color)) return jsonError("INVALID_ANNOTATION_COLOR", 400);
    if (body.noteText !== undefined && noteText === null) return jsonError("INVALID_NOTE_TEXT", 400);
    if (color === undefined && noteText === undefined) return jsonError("EMPTY_ANNOTATION_UPDATE", 400);

    const annotation = await updateLessonAnnotation(userId, { id, color, noteText });
    return NextResponse.json({ annotation }, { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("INVALID_ORIGIN", 403);

  try {
    const userId = await requireAnnotationUserId();
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!UUID_PATTERN.test(id)) return jsonError("INVALID_ANNOTATION_ID", 400);
    await deleteLessonAnnotation(userId, id);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
