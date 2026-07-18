import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { getSanityWriteClient } from "@/lib/sanity/write-client";

export const dynamic = "force-dynamic";

type PortableNode = Record<string, unknown>;
type LessonDocument = {
  _id: string;
  _rev: string;
  title?: string;
  body?: PortableNode[];
};

const LESSON_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const TEXT_STYLES = new Set(["normal", "h2", "h3", "h4", "blockquote"]);
const INLINE_MARKS = new Set(["strong", "em", "underline", "code", "highlight"]);
const noStoreHeaders = { "Cache-Control": "no-store" };

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

function isRecord(value: unknown): value is PortableNode {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || value.length > maxLength) throw new Error("INVALID_LESSON_BODY");
  return value;
}

function safeLink(value: unknown): string {
  const href = safeText(value, 2048).trim();
  if (!href || /[\u0000-\u001F\u007F]/.test(href)) throw new Error("INVALID_LESSON_BODY");
  if (href.startsWith("#")) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;

  try {
    const parsed = new URL(href);
    if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) throw new Error("INVALID_LESSON_BODY");
    return href;
  } catch {
    throw new Error("INVALID_LESSON_BODY");
  }
}

function sanitizeMarkDefs(proposed: unknown, current: unknown): PortableNode[] {
  const currentDefs = Array.isArray(current) ? current.filter(isRecord) : [];
  const currentByKey = new Map(
    currentDefs
      .map((definition) => [typeof definition._key === "string" ? definition._key : "", definition] as const)
      .filter(([key]) => Boolean(key)),
  );

  if (!Array.isArray(proposed)) return currentDefs;
  if (proposed.length > 100) throw new Error("INVALID_LESSON_BODY");

  const used = new Set<string>();
  return proposed.map((value) => {
    if (!isRecord(value)) throw new Error("INVALID_LESSON_BODY");
    const key = safeText(value._key, 80);
    if (used.has(key)) throw new Error("DUPLICATE_MARK_KEY");
    used.add(key);

    const trustedCurrent = currentByKey.get(key);
    if (trustedCurrent) return trustedCurrent;

    if (value._type === "link") {
      return {
        _key: key,
        _type: "link",
        href: safeLink(value.href),
      };
    }

    throw new Error("INVALID_LESSON_BODY");
  });
}

function sanitizeBlock(node: PortableNode, current?: PortableNode): PortableNode {
  const key = safeText(node._key, 80);
  const style = typeof node.style === "string" && TEXT_STYLES.has(node.style) ? node.style : "normal";
  const markDefs = sanitizeMarkDefs(node.markDefs, current?.markDefs);
  const markKeys = new Set(markDefs
    .map((mark) => typeof mark._key === "string" ? mark._key : "")
    .filter(Boolean));
  const children = Array.isArray(node.children) ? node.children : [];

  if (children.length > 250) throw new Error("INVALID_LESSON_BODY");

  const cleanChildren = children.map((child, index) => {
    if (!isRecord(child) || child._type !== "span") throw new Error("INVALID_LESSON_BODY");
    const marks = Array.isArray(child.marks)
      ? child.marks
        .filter((mark): mark is string => typeof mark === "string" && (INLINE_MARKS.has(mark) || markKeys.has(mark)))
        .slice(0, 24)
      : [];

    return {
      _key: typeof child._key === "string" && child._key.length <= 80 ? child._key : `${key}-span-${index}`,
      _type: "span",
      text: safeText(child.text ?? "", 30_000),
      marks,
    };
  });

  const clean: PortableNode = {
    _key: key,
    _type: "block",
    style,
    markDefs,
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
  const requiredImmutableKeys = currentBody
    .filter((node) => isRecord(node) && node._type !== "block")
    .map((node) => typeof node._key === "string" ? node._key : "");

  if (requiredImmutableKeys.some((key) => !key)) throw new Error("INVALID_EMBEDDED_CONTENT");

  const usedKeys = new Set<string>();
  const preservedImmutableKeys = new Set<string>();

  const cleanBody = proposed.map((value) => {
    if (!isRecord(value)) throw new Error("INVALID_LESSON_BODY");
    const key = safeText(value._key, 80);
    if (usedKeys.has(key)) throw new Error("DUPLICATE_BLOCK_KEY");
    usedKeys.add(key);

    const current = currentByKey.get(key);
    if (value._type === "block") {
      if (current && current._type !== "block") throw new Error("INVALID_EMBEDDED_CONTENT");
      return sanitizeBlock(value, current);
    }

    // Images and future custom blocks are immutable in the web editor. The API
    // restores the trusted version already stored in Sanity and requires every
    // protected element to remain present exactly once.
    if (!current || current._type !== value._type || current._type === "block") {
      throw new Error("INVALID_EMBEDDED_CONTENT");
    }
    preservedImmutableKeys.add(key);
    return current;
  });

  if (requiredImmutableKeys.some((key) => !preservedImmutableKeys.has(key))) {
    throw new Error("INVALID_EMBEDDED_CONTENT");
  }

  return cleanBody;
}

async function readLesson(lessonId: string) {
  const client = getSanityWriteClient();
  return client.fetch<LessonDocument | null>(
    `*[_type == "lesson" && _id == $lessonId][0]{
      _id,
      _rev,
      title,
      body[]{
        ...,
        _type == "image" => {
          alt,
          caption,
          asset,
          "assetUrl": asset->url
        }
      }
    }`,
    { lessonId },
    { perspective: "published" },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  try {
    await requireAdminUser();
    const { lessonId } = await context.params;
    if (!LESSON_ID_PATTERN.test(lessonId)) return jsonError("INVALID_LESSON_ID", 400);

    const lesson = await readLesson(lessonId);
    if (!lesson) return jsonError("LESSON_NOT_FOUND", 404);

    return NextResponse.json({ lesson }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "AUTH_REQUIRED") return jsonError("AUTH_REQUIRED", 401);
      if (error.message === "ADMIN_REQUIRED") return jsonError("ADMIN_REQUIRED", 403);
      if (error.message === "SANITY_WRITE_TOKEN_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
    }

    console.error("Admin lesson read failed", error);
    return jsonError("LESSON_READ_FAILED", 500);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonError("INVALID_ORIGIN", 403);
    }

    await requireAdminUser();
    const { lessonId } = await context.params;
    if (!LESSON_ID_PATTERN.test(lessonId)) return jsonError("INVALID_LESSON_ID", 400);

    const payload = await request.json().catch(() => null) as { body?: unknown; revision?: unknown } | null;
    if (!payload) return jsonError("INVALID_JSON", 400);
    const revision = typeof payload.revision === "string" ? payload.revision : "";
    if (!revision || revision.length > 200) return jsonError("INVALID_REVISION", 400);

    const client = getSanityWriteClient();
    const current = await client.fetch<LessonDocument | null>(
      `*[_type == "lesson" && _id == $lessonId][0]{_id, _rev, title, body}`,
      { lessonId },
      { perspective: "published" },
    );

    if (!current) return jsonError("LESSON_NOT_FOUND", 404);
    if (current._rev !== revision) return jsonError("LESSON_CHANGED_RELOAD", 409);

    const body = sanitizeBody(payload.body, Array.isArray(current.body) ? current.body : []);
    await client.patch(lessonId).ifRevisionId(revision).set({ body }).commit({ autoGenerateArrayKeys: true });

    const lesson = await readLesson(lessonId);
    if (!lesson) return jsonError("LESSON_NOT_FOUND", 404);
    return NextResponse.json({ lesson }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "AUTH_REQUIRED") return jsonError("AUTH_REQUIRED", 401);
      if (error.message === "ADMIN_REQUIRED") return jsonError("ADMIN_REQUIRED", 403);
      if (error.message === "SANITY_WRITE_TOKEN_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
      if ([
        "INVALID_LESSON_BODY",
        "LESSON_BODY_TOO_LARGE",
        "DUPLICATE_BLOCK_KEY",
        "DUPLICATE_MARK_KEY",
        "INVALID_EMBEDDED_CONTENT",
      ].includes(error.message)) {
        return jsonError(error.message, 400);
      }
    }

    console.error("Admin lesson update failed", error);
    return jsonError("LESSON_UPDATE_FAILED", 500);
  }
}
