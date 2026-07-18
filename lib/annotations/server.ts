import "server-only";

import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/server";

export type AnnotationKind = "highlight" | "note";
export type AnnotationColor = "yellow" | "green" | "blue" | "pink";

export type LessonAnnotation = {
  id: string;
  lessonId: string;
  contentRevision: string | null;
  kind: AnnotationKind;
  blockKey: string;
  startOffset: number;
  endOffset: number;
  quote: string;
  prefix: string;
  suffix: string;
  color: AnnotationColor;
  noteText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLessonAnnotation = Omit<LessonAnnotation, "id" | "createdAt" | "updatedAt">;
export type UpdateLessonAnnotation = {
  id: string;
  color?: AnnotationColor;
  noteText?: string | null;
};

let sqlClient: ReturnType<typeof neon> | null = null;

function database() {
  if (sqlClient) return sqlClient;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  sqlClient = neon(url);
  return sqlClient;
}

function firstRow(result: unknown): Record<string, unknown> | undefined {
  if (!Array.isArray(result)) return undefined;
  const row = result[0];
  return row && typeof row === "object" && !Array.isArray(row)
    ? row as Record<string, unknown>
    : undefined;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function annotationFromRow(row: Record<string, unknown>): LessonAnnotation {
  return {
    id: String(row.id),
    lessonId: String(row.lesson_id),
    contentRevision: typeof row.content_revision === "string" ? row.content_revision : null,
    kind: row.annotation_type === "note" ? "note" : "highlight",
    blockKey: String(row.block_key),
    startOffset: Number(row.start_offset),
    endOffset: Number(row.end_offset),
    quote: String(row.quote),
    prefix: String(row.prefix || ""),
    suffix: String(row.suffix || ""),
    color: (["yellow", "green", "blue", "pink"] as const).includes(row.color as AnnotationColor)
      ? row.color as AnnotationColor
      : "yellow",
    noteText: typeof row.note_text === "string" ? row.note_text : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function requireAnnotationUserId(): Promise<string> {
  const { data } = await auth.getSession();
  const value = data as unknown as { user?: { id?: string }; session?: { user?: { id?: string } } } | null;
  const id = value?.user?.id || value?.session?.user?.id;
  if (!id) throw new Error("AUTH_REQUIRED");
  return id;
}

export async function listLessonAnnotations(userId: string, lessonId: string): Promise<LessonAnnotation[]> {
  const sql = database();
  const rows = await sql`
    SELECT id, lesson_id, content_revision, annotation_type, block_key,
      start_offset, end_offset, quote, prefix, suffix, color, note_text,
      created_at, updated_at
    FROM public.lesson_annotations
    WHERE user_id=${userId} AND lesson_id=${lessonId}
    ORDER BY created_at ASC, id ASC
    LIMIT 500
  `;
  return Array.isArray(rows)
    ? rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row)).map(annotationFromRow)
    : [];
}

export async function createLessonAnnotation(
  userId: string,
  input: CreateLessonAnnotation,
): Promise<LessonAnnotation> {
  const sql = database();
  const countRows = await sql`
    SELECT count(*)::int AS count
    FROM public.lesson_annotations
    WHERE user_id=${userId} AND lesson_id=${input.lessonId}
  `;
  const count = Number(firstRow(countRows)?.count || 0);
  if (count >= 500) throw new Error("ANNOTATION_LIMIT_REACHED");

  const rows = await sql`
    INSERT INTO public.lesson_annotations (
      user_id, lesson_id, content_revision, annotation_type, block_key,
      start_offset, end_offset, quote, prefix, suffix, color, note_text
    ) VALUES (
      ${userId}, ${input.lessonId}, ${input.contentRevision}, ${input.kind}, ${input.blockKey},
      ${input.startOffset}, ${input.endOffset}, ${input.quote}, ${input.prefix}, ${input.suffix},
      ${input.color}, ${input.kind === "note" ? input.noteText : null}
    )
    ON CONFLICT (user_id, lesson_id, annotation_type, block_key, start_offset, end_offset)
    DO UPDATE SET
      content_revision=EXCLUDED.content_revision,
      quote=EXCLUDED.quote,
      prefix=EXCLUDED.prefix,
      suffix=EXCLUDED.suffix,
      color=EXCLUDED.color,
      note_text=EXCLUDED.note_text,
      updated_at=now()
    RETURNING id, lesson_id, content_revision, annotation_type, block_key,
      start_offset, end_offset, quote, prefix, suffix, color, note_text,
      created_at, updated_at
  `;
  const row = firstRow(rows);
  if (!row) throw new Error("ANNOTATION_CREATE_FAILED");
  return annotationFromRow(row);
}

export async function updateLessonAnnotation(
  userId: string,
  input: UpdateLessonAnnotation,
): Promise<LessonAnnotation> {
  const sql = database();
  const rows = await sql`
    UPDATE public.lesson_annotations
    SET
      color=COALESCE(${input.color || null}, color),
      note_text=CASE
        WHEN annotation_type='note' AND ${input.noteText === undefined ? false : true}
          THEN ${input.noteText === undefined ? null : input.noteText}
        ELSE note_text
      END,
      updated_at=now()
    WHERE id=${input.id} AND user_id=${userId}
    RETURNING id, lesson_id, content_revision, annotation_type, block_key,
      start_offset, end_offset, quote, prefix, suffix, color, note_text,
      created_at, updated_at
  `;
  const row = firstRow(rows);
  if (!row) throw new Error("ANNOTATION_NOT_FOUND");
  return annotationFromRow(row);
}

export async function deleteLessonAnnotation(userId: string, annotationId: string): Promise<void> {
  const sql = database();
  const rows = await sql`
    DELETE FROM public.lesson_annotations
    WHERE id=${annotationId} AND user_id=${userId}
    RETURNING id
  `;
  if (!firstRow(rows)?.id) throw new Error("ANNOTATION_NOT_FOUND");
}
