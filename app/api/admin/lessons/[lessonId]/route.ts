≠rá^—f•ñÿ¶{~ly 'v√Æ∂õ≠import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { getSanityWriteClient } from "@/lib/sanity/write-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PortableNode = Record<string, unknown>;
type LessonDocument = {
  _id: string;
  _rev: string;
  title: string;
  body?: PortableNode[];
  flashcards?: PortableNode[];
};

const LESSON_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const ARRAY_KEY_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const IMAGE_ASSET_PATTERN = /^image-[A-Za-z0-9_]+-\d+x\d+-[A-Za-z0-9]+$/;
const TEXT_STYLES = new Set(["normal", "h2", "h3", "h4", "blockquote"]);
const INLINE_MARKS = new Set(["strong", "em", "underline", "code"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const IMAGE_SIDES = new Set(["front", "back", "both"]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is PortableNode {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, maxLength: number, allowEmpty = true): string {
  if (typeof value !== "string" || value.length > maxLength || (!allowEmpty && !value.trim())) {
    throw new Error("INVALID_LESSON_BODY");
  }
  return value;
}

function safeKey(value: unknown): string {
  const key = safeText(value, 80, false);
  if (!ARRAY_KEY_PATTERN.test(key)) throw new Error("INVALID_LESSON_BODY");
  return key;
}

function sanitizeHref(value: unknown): string {
  const href = safeText(value, 2_000, false).trim();
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const parsed = new URL(href);
    if (["https:", "http:", "mailto:"].includes(parsed.protocol)) return href;
  } catch {
    // The uniform error below avoids exposing parser details.
  }
  throw new Error("INVALID_LESSON_BODY");
}

function sanitizeMarkDefs(proposed: unknown, current: unknown): PortableNode[] {
  const currentDefs = Array.isArray(current) ? current.filter(isRecord) : [];
  const currentByKey = new Map(currentDefs
    .map((definition) => [typeof definition._key === "string" ? definition._key : "", definition] as const)
    .filter(([key]) => Boolean(key)));
  const definitions = Array.isArray(proposed) ? proposed : [];
  if (definitions.length > 50) throw new Error("INVALID_LESSON_BODY");
  const usedKeys = new Set<string>();

  return definitions.map((definition) => {
    if (!isRecord(definition)) throw new Error("INVALID_LESSON_BODY");
    const key = safeKey(definition._key);
    if (usedKeys.has(key)) throw new Error("INVALID_LESSON_BODY");
    usedKeys.add(key);
    if (definition._type === "link") {
      const trusted = currentByKey.get(key);
      const clean: PortableNode = {
        ...(trusted?._type === "link" ? trusted : {}),
        _key: key,
        _type: "link",
        href: sanitizeHref(definition.href),
        ...(typeof definition.title === "string" && definition.title.length <= 300 && definition.title.trim()
          ? { title: definition.title.trim() }
          : {}),
      };
      if (!(typeof definition.title === "string" && definition.title.trim())) delete clean.title;
      return clean;
    }

    const trusted = currentByKey.get(key);
    if (!trusted || trusted._type !== definition._type) throw new Error("INVALID_LESSON_BODY");
    return trusted;
  });
}

function sanitizeBlock(node: PortableNode, current?: PortableNode): PortableNode {
  const key = safeKey(node._key);
  const style = typeof node.style === "string" && TEXT_STYLES.has(node.style) ? node.style : "normal";
  const markDefs = sanitizeMarkDefs(node.markDefs, current?.markDefs);
  const markKeys = new Set(markDefs.map((mark) => typeof mark._key === "string" ? mark._key : "").filter(Boolean));
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length > 200) throw new Error("INVALID_LESSON_BODY");
  const currentChildren = Array.isArray(current?.children) ? current.children.filter(isRecord) : [];
  const currentChildrenByKey = new Map(currentChildren
    .map((child) => [typeof child._key === "string" ? child._key : "", child] as const)
    .filter(([childKey]) => Boolean(childKey)));
  const usedChildKeys = new Set<string>();

  const cleanChildren = children.map((child, index) => {
    if (!isRecord(child) || child._type !== "span") throw new Error("INVALID_LESSON_BODY");
    const childKey = typeof child._key === "string" && ARRAY_KEY_PATTERN.test(child._key)
      ? child._key
      : `${key.slice(0, 60)}-${index}`;
    if (usedChildKeys.has(childKey)) throw new Error("INVALID_LESSON_BODY");
    usedChildKeys.add(childKey);
    const trusted = currentChildrenByKey.get(childKey);
    const marks = Array.isArray(child.marks)
      ? child.marks
        .filter((mark): mark is string => typeof mark === "string" && (INLINE_MARKS.has(mark) || markKeys.has(mark)))
        .slice(0, 20)
      : [];
    return {
      ...(trusted?._type === "span" ? trusted : {}),
      _key: childKey,
      _type: "span",
      text: safeText(child.text ?? "", 20_000),
      marks,
    };
  });

  const clean: PortableNode = {
    ...(current?._type === "block" ? current : {}),
    _key: key,
    _type: "block",
    style,
    markDefs,
    children: cleanChildren,
  };
  if (node.listItem === "bullet" || node.listItem === "number") {
    clean.listItem = node.listItem;
    clean.level = Math.min(4, Math.max(1, Number(node.level) || 1));
  } else {
    delete clean.listItem;
    delete clean.level;
  }
  return clean;
}

function imageAssetRef(value: unknown): string {
  if (!isRecord(value) || value._type !== "reference" || typeof value._ref !== "string" || !IMAGE_ASSET_PATTERN.test(value._ref)) {
    throw new Error("INVALID_IMAGE_ASSET");
  }
  return value._ref;
}

function assertEditorCompatibleBody(value: unknown): asserts value is PortableNode[] {
  if (!Array.isArray(value)) throw new Error("UNSUPPORTED_LESSON_CONTENT");

  for (const node of value) {
    if (!isRecord(node) || typeof node._key !== "string" || !ARRAY_KEY_PATTERN.test(node._key)) {
      throw new Error("UNSUPPORTED_LESSON_CONTENT");
    }

    if (node._type === "image") {
      try {
        imageAssetRef(node.asset);
      } catch {
        throw new Error("UNSUPPORTED_LESSON_CONTENT");
      }
      continue;
    }

    if (node._type !== "block") throw new Error("UNSUPPORTED_LESSON_CONTENT");
    if (typeof node.style === "string" && !TEXT_STYLES.has(node.style)) {
      throw new Error("UNSUPPORTED_LESSON_CONTENT");
    }
    if (node.listItem !== undefined && node.listItem !== "bullet" && node.listItem !== "number") {
      throw new Error("UNSUPPORTED_LESSON_CONTENT");
    }

    const markDefs = Array.isArray(node.markDefs) ? node.markDefs : [];
    const markKeys = new Set<string>();
    for (const definition of markDefs) {
      if (!isRecord(definition) || definition._type !== "link" || typeof definition._key !== "string" || !ARRAY_KEY_PATTERN.test(definition._key)) {
        throw new Error("UNSUPPORTED_LESSON_CONTENT");
      }
      if (markKeys.has(definition._key)) throw new Error("UNSUPPORTED_LESSON_CONTENT");
      markKeys.add(definition._key);
    }

    if (!Array.isArray(node.children)) throw new Error("UNSUPPORTED_LESSON_CONTENT");
    const childKeys = new Set<string>();
    for (const child of node.children) {
      if (
        !isRecord(child)
        || child._type !== "span"
        || typeof child.text !== "string"
        || typeof child._key !== "string"
        || !ARRAY_KEY_PATTERN.test(child._key)
        || childKeys.has(child._key)
      ) {
        throw new Error("UNSUPPORTED_LESSON_CONTENT");
      }
      childKeys.add(child._key);
      if (Array.isArray(child.marks) && child.marks.some((mark) => typeof mark !== "string" || (!INLINE_MARKS.has(mark) && !markKeys.has(mark)))) {
        throw new Error("UNSUPPORTED_LESSON_CONTENT");
      }
    }
  }
}

function sanitizeImage(node: PortableNode, current?: PortableNode): PortableNode {
  const key = safeKey(node._key);
  const assetRef = imageAssetRef(node.asset);
  const clean: PortableNode = {
    ...(current?._type === "image" ? current : {}),
    _key: key,
    _type: "image",
    asset: { _type: "reference", _ref: assetRef },
    ...(typeof node.alt === "string" && node.alt.trim() ? { alt: safeText(node.alt, 300).trim() } : {}),
    ...(typeof node.caption === "string" && node.caption.trim() ? { caption: safeText(node.caption, 500).trim() } : {}),
  };
  delete clean.assetUrl;
  if (!(typeof node.alt === "string" && node.alt.trim())) delete clean.alt;
  if (!(typeof node.caption === "string" && node.caption.trim())) delete clean.caption;
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
    const key = safeKey(value._key);
    if (usedKeys.has(key)) throw new Error("DUPLICATE_BLOCK_KEY");
    usedKeys.add(key);

    const current = currentByKey.get(key);
    if (value._type === "block") return sanitizeBlock(value, current);
    if (value._type === "image") return sanitizeImage(value, current);

    throw new Error("INVALID_EMBEDDED_CONTENT");
  });
}

function sanitizeFlashcardImage(value: unknown, current: unknown): PortableNode | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new Error("INVALID_FLASHCARD");
  const assetRef = imageAssetRef(value.asset);
  const clean: PortableNode = {
    ...(isRecord(current) && current._type === "image" ? current : {}),
    _type: "image",
    asset: { _type: "reference", _ref: assetRef },
    ...(typeof value.alt === "string" && value.alt.trim() ? { alt: safeText(value.alt, 300).trim() } : {}),
    ...(typeof value.caption === "string" && value.caption.trim() ? { caption: safeText(value.caption, 500).trim() } : {}),
  };
  delete clean.assetUrl;
  if (!(typeof value.alt === "string" && value.alt.trim())) delete clean.alt;
  if (!(typeof value.caption === "string" && value.caption.trim())) delete clean.caption;
  return clean;
}

function sanitizeFlashcards(proposed: unknown, currentCards: PortableNode[]): PortableNode[] {
  if (!Array.isArray(proposed)) throw new Error("INVALID_FLASHCARD");
  if (proposed.length > 500) throw new Error("TOO_MANY_FLASHCARDS");
  if (JSON.stringify(proposed).length > 1_000_000) throw new Error("INVALID_FLASHCARD");

  const currentByKey = new Map(currentCards
    .filter(isRecord)
    .map((card) => [typeof card._key === "string" ? card._key : "", card] as const)
    .filter(([key]) => Boolean(key)));
  const defaultType = currentCards.find((card) => typeof card._type === "string")?._type as string | undefined || "flashcard";
  const usedKeys = new Set<string>();

  return proposed.map((value, index) => {
    if (!isRecord(value)) throw new Error("INVALID_FLASHCARD");
    const key = safeKey(value._key);
    if (usedKeys.has(key)) throw new Error("DUPLICATE_FLASHCARD_KEY");
    usedKeys.add(key);
    const current = currentByKey.get(key);
    const front = safeText(value.front ?? "", 10_000);
    const back = safeText(value.back ?? "", 20_000);
    const isActive = value.isActive !== false;
    if (isActive && (!front.trim() || !back.trim())) throw new Error("INVALID_FLASHCARD");

    const tags = Array.isArray(value.tags)
      ? [...new Set(value.tags.map((tag) => safeText(tag, 80).trim()).filter(Boolean))].slice(0, 20)
      : [];
    const clean: PortableNode = {
      ...(current || {}),
      _key: key,
      _type: typeof current?._type === "string" ? current._type : defaultType,
      title: typeof value.title === "string" ? safeText(value.title, 500) : "",
      front,
      back,
      explanation: typeof value.explanation === "string" ? safeText(value.explanation, 20_000) : "",
      difficulty: typeof value.difficulty === "string" && DIFFICULTIES.has(value.difficulty) ? value.difficulty : "medium",
      tags,
      imageSide: typeof value.imageSide === "string" && IMAGE_SIDES.has(value.imageSide) ? value.imageSide : "both",
      order: index + 1,
      isActive,
    };
    const image = sanitizeFlashcardImage(value.image, current?.image);
    if (image) clean.image = image;
    else delete clean.image;
    return clean;
  });
}

function collectAssetRefs(body: PortableNode[], flashcards: PortableNode[]): string[] {
  const refs = new Set<string>();
  for (const node of body) {
    if (node._type === "image" && isRecord(node.asset) && typeof node.asset._ref === "string") refs.add(node.asset._ref);
  }
  for (const card of flashcards) {
    if (isRecord(card.image) && isRecord(card.image.asset) && typeof card.image.asset._ref === "string") refs.add(card.image.asset._ref);
  }
  return [...refs];
}

async function assertImageAssets(assetIds: string[]) {
  if (!assetIds.length) return;
  const client = getSanityWriteClient();
  const validIds = await client.fetch<string[]>(
    `*[_type == "sanity.imageAsset" && _id in $assetIds]._id`,
    { assetIds },
    { perspective: "raw" },
  );
  if (new Set(validIds).size !== new Set(assetIds).size) throw new Error("INVALID_IMAGE_ASSET");
}

function sameOrigin(request: Request): boolean {
  const requestOrigin = request.headers.get("origin");
  return Boolean(requestOrigin && requestOrigin === new URL(request.url).origin);
}

async function loadLessonPair(lessonId: string) {
  const client = getSanityWriteClient();
  const draftId = `drafts.${lessonId}`;
  return client.fetch<{ published: LessonDocument | null; draft: { _id: string; _rev: string } | null }>(
    `{
      "published": *[_type == "lesson" && _id == $lessonId][0]{_id, _rev, title, body, flashcards},
      "draft": *[_type == "lesson" && _id == $draftId][0]{_id, _rev}
    }`,
    { lessonId, draftId },
    { perspective: "raw" },
  );
}

async function fetchEditableLesson(lessonId: string) {
  return getSanityWriteClient().fetch(
    `*[_type == "lesson" && _id == $lessonId][0]{
      _id,
      _rev,
      title,
      body[]{
        ...,
        _type == "image" => {asset, alt, caption, "assetUrl": asset->url}
      },
      flashcards[]{
        ...,
        image {asset, alt, caption, "assetUrl": asset->url}
      },
      "flashcardCount": count(flashcards[isActive != false])
    }`,
    { lessonId },
    { perspective: "published" },
  );
}

export async function GET(_request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    await requireAdminUser();
    const { lessonId } = await context.params;
    if (!LESSON_ID_PATTERN.test(lessonId)) return jsonError("INVALID_LESSON_ID", 400);
    const pair = await loadLessonPair(lessonId);
    if (!pair.published) return jsonError("LESSON_NOT_FOUND", 404);
    if (pair.draft) return jsonError("SANITY_DRAFT_EXISTS", 409);
    assertEditorCompatibleBody(Array.isArray(pair.published.body) ? pair.published.body : []);
    const lesson = await fetchEditableLesson(lessonId);
    return NextResponse.json({ lesson }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "AUTH_REQUIRED") return jsonError("AUTH_REQUIRED", 401);
      if (error.message === "ADMIN_REQUIRED") return jsonError("ADMIN_REQUIRED", 403);
      if (error.message === "SANITY_WRITE_TOKEN_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
      if (error.message === "SANITY_WRITE_TARGET_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
      if (error.message === "UNSUPPORTED_LESSON_CONTENT") return jsonError("UNSUPPORTED_LESSON_CONTENT", 409);
    }
    console.error("Admin lesson load failed", error);
    return jsonError("LESSON_LOAD_FAILED", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    if (!sameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
    await requireAdminUser();
    const { lessonId } = await context.params;
    if (!LESSON_ID_PATTERN.test(lessonId)) return jsonError("INVALID_LESSON_ID", 400);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 2_000_000) return jsonError("LESSON_BODY_TOO_LARGE", 413);
    const payload = await request.json().catch(() => null) as { body?: unknown; flashcards?: unknown; revision?: unknown } | null;
    if (!payload) return jsonError("INVALID_JSON", 400);
    const revision = typeof payload.revision === "string" ? payload.revision : "";
    if (!revision || revision.length > 200) return jsonError("INVALID_REVISION", 400);

    const pair = await loadLessonPair(lessonId);
    if (!pair.published) return jsonError("LESSON_NOT_FOUND", 404);
    if (pair.draft) return jsonError("SANITY_DRAFT_EXISTS", 409);
    if (pair.published._rev !== revision) return jsonError("LESSON_CHANGED_RELOAD", 409);
    assertEditorCompatibleBody(Array.isArray(pair.published.body) ? pair.published.body : []);

    const body = sanitizeBody(payload.body, Array.isArray(pair.published.body) ? pair.published.body : []);
    const flashcards = sanitizeFlashcards(payload.flashcards, Array.isArray(pair.published.flashcards) ? pair.published.flashcards : []);
    await assertImageAssets(collectAssetRefs(body, flashcards));

    const client = getSanityWriteClient();
    await client
      .patch(lessonId)
      .ifRevisionId(revision)
      .set({ body, flashcards })
      .commit({ autoGenerateArrayKeys: false, visibility: "sync" });

    const lesson = await fetchEditableLesson(lessonId);
    return NextResponse.json({ lesson }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "AUTH_REQUIRED") return jsonError("AUTH_REQUIRED", 401);
      if (error.message === "ADMIN_REQUIRED") return jsonError("ADMIN_REQUIRED", 403);
      if (error.message === "SANITY_WRITE_TOKEN_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
      if (error.message === "SANITY_WRITE_TARGET_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
      if ([
        "INVALID_LESSON_BODY",
        "LESSON_BODY_TOO_LARGE",
        "DUPLICATE_BLOCK_KEY",
        "INVALID_EMBEDDED_CONTENT",
        "INVALID_FLASHCARD",
        "TOO_MANY_FLASHCARDS",
        "DUPLICATE_FLASHCARD_KEY",
        "INVALID_IMAGE_ASSET",
        "UNSUPPORTED_LESSON_CONTENT",
      ].includes(error.message)) return jsonError(error.message, 400);
      if ("statusCode" in error && (error as { statusCode?: number }).statusCode === 409) {
        return jsonError("LESSON_CHANGED_RELOAD", 409);
      }
    }
    console.error("Admin lesson update failed", error);
    return jsonError("LESSON_UPDATE_FAILED", 500);
  }
}
