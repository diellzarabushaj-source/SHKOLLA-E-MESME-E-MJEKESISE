import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { getSanityWriteClient } from "@/lib/sanity/write-client";

export const dynamic = "force-dynamic";

type PortableNode = Record<string, unknown>;
type LessonDocument = {
  _id: string;
  _rev: string;
  body?: PortableNode[];
};

const LESSON_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const TEXT_STYLES = new Set(["normal", "h2", "h3", "h4", "blockquote"]);
const INLINE_MARKS = new Set(["strong", "em", "underline", "code"]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is PortableNode {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || value.length > maxLength) throw new Error("INVALID_LESSON_BODY");
  return value;
}

function sanitizeBlock(node: PortableNode, current?: PortableNode): PortableNode {
  const key = safeText(node._key, 80);
  const style = typeof node.style === "string" && TEXT_STYLES.has(node.style) ? node.style : "normal";
  const currentMarkDefs = Array.isArray(current?.markDefs) ? current.markDefs : [];
  const markKeys = new Set(currentMarkDefs
    .filter(isRecord)
    .map((mark) => typeof mark._key === "string" ? mark._key : "")
    .filter(Boolean));
  const children = Array.isArray(node.children) ? node.children : [];

  if (children.length > 100) throw new Error("INVALID_LESSON_BODY");

  const cleanChildren = children.map((child, index) => {
    if (!isRecord(child) || child._type !== "span") throw new Error("INVALID_LESSON_BODY");
    const marks = Array.isArray(child.marks)
      ? child.marks
        .filter((mark): mark is string => typeof mark === "string" && (INLINE_MARKS.has(mark) || markKeys.has(mark)))
        .slice(0, 20)
      : [];
    return {
      _key: typeof child._key === "string" && child._key.length <= 80 ? child._key : `${key}-span-${index}`,
      _type: "span",
      text: safeText(child.text ?? "", 20_000),
      marks,
    };
  });

  const clean: PortableNode = {
    _key: key,
    _type: "block",
    style,
    markDefs: currentMarkDefs,
    children: cleanChildren,
  };

  if (node.listItem === "bullet" || node.listItem === "number") {
    clean.listItem = node.listItem;
    clean.level = Math.min(4, Math.max(1, Number(node.level) || 1));
  }

  return clean;
}

function sanitizeBody(proposed: unknown, currentBody: PortableNode[]): PortableNode[] {
  if (!Array.isArray(proposed) || proposed.length > 800) throw new Error("INVALID_LESSON_BODY");
  if (JSON.stringify(proposed).length > 750_000) throw new Error("LESSON_BODY_TOO_LARGE");

  const currentByKey = new Map(currentBody
    .filter(isRecord)
    .map((node) => [typeof node._key === "string" ? node._key : "", node] as const)
    .filter(([key]) => Boolean(key)));
  const usedKeys = new Set<string>();

  return proposed.map((value) => {
    if (!isRecord(value)) throw new Error("INVALID_LESSON_BODY");
    const key = safeText(value._key, 80);
    if (usedKeys.has(key)) throw new Error("DUPLICATE_BLOCK_KEY");
    usedKeys.add(key);

    const current = currentByKey.get(key);
    if (value._type === "block") return sanitizeBlock(value, current);

    // Images and future custom blocks are immutable in this editor. The API
    // restores the trusted version already in Sanity instead of accepting an
    // asset reference or custom payload from the browser.
    if (!current || current._type !== value._type) throw new Error("INVALID_EMBEDDED_CONTENT");
    return current;
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  try {
    await requireAdminUser();
    const { lessonId } = await context.params;
    if (!LESSON_ID_PATTERN.test(lessonId)) return jsonError("INVALID_LESSON_ID", 400);

    const payload = await request.json() as { body?: unknown; revision?: unknown };
    const revision = typeof payload.revision === "string" ? payload.revision : "";
    if (!revision || revision.length > 200) return jsonError("INVALID_REVISION", 400);

    const client = getSanityWriteClient();
    const current = await client.fetch<LessonDocument | null>(
      `*[_type == "lesson" && _id == $lessonId][0]{_id, _rev, body}`,
      { lessonId },
      { perspective: "published" },
    );

    if (!current) return jsonError("LESSON_NOT_FOUND", 404);
    if (current._rev !== revision) return jsonError("LESSON_CHANGED_RELOAD", 409);

    const body = sanitizeBody(payload.body, Array.isArray(current.body) ? current.body : []);
    await client.patch(lessonId).ifRevisionId(revision).set({ body }).commit({ autoGenerateArrayKeys: true });

    const lesson = await client.fetch(
      `*[_type == "lesson" && _id == $lessonId][0]{
        _id,
        _rev,
        title,
        body[]{
          ...,
          _type == "image" => {asset, "assetUrl": asset->url}
        }
      }`,
      { lessonId },
      { perspective: "published" },
    );

    return NextResponse.json({ lesson }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "AUTH_REQUIRED") return jsonError("AUTH_REQUIRED", 401);
      if (error.message === "ADMIN_REQUIRED") return jsonError("ADMIN_REQUIRED", 403);
      if (error.message === "SANITY_WRITE_TOKEN_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
      if (["INVALID_LESSON_BODY", "LESSON_BODY_TOO_LARGE", "DUPLICATE_BLOCK_KEY", "INVALID_EMBEDDED_CONTENT"].includes(error.message)) {
        return jsonError(error.message, 400);
      }
    }

    console.error("Admin lesson update failed", error);
    return jsonError("LESSON_UPDATE_FAILED", 500);
  }
}
