import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { getSanityReadClient } from "@/lib/sanity/read-client";
import { getSanityWriteClient } from "@/lib/sanity/write-client";

// admin-sanity-resilience-v1
// admin-image-paste-v1
// admin-table-paste-v1

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
const SANITY_IMAGE_ASSET_PATTERN = /^image-[A-Za-z0-9]+-\d+x\d+-[A-Za-z0-9]+$/;
const MAX_TABLE_ROWS = 100;
const MAX_TABLE_CELLS_PER_ROW = 30;
const MAX_TABLE_CELL_TEXT = 6000;
const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function sanityStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const value = error as { statusCode?: unknown; response?: { statusCode?: unknown; status?: unknown } };
  const status = Number(value.statusCode ?? value.response?.statusCode ?? value.response?.status);
  return Number.isInteger(status) ? status : null;
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
    const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
    const directHost = request.headers.get("host")?.trim() || "";
    const allowedHosts = new Set([requestUrl.host, forwardedHost, directHost].filter(Boolean).map((host) => host.toLowerCase()));
    const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
    const allowedProtocols = new Set([requestUrl.protocol, forwardedProtocol ? `${forwardedProtocol.toLowerCase()}:` : ""].filter(Boolean));

    return allowedHosts.has(origin.host.toLowerCase()) && allowedProtocols.has(origin.protocol.toLowerCase());
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

function sanitizeNewImage(node: PortableNode): PortableNode {
  const key = safeText(node._key, 80);
  if (!isRecord(node.asset)) throw new Error("INVALID_IMAGE_ASSET");
  const assetId = safeText(node.asset._ref, 200);
  if (node.asset._type !== "reference" || !SANITY_IMAGE_ASSET_PATTERN.test(assetId)) {
    throw new Error("INVALID_IMAGE_ASSET");
  }

  const alt = typeof node.alt === "string" ? safeText(node.alt, 500).trim() : "";
  const caption = typeof node.caption === "string" ? safeText(node.caption, 1000).trim() : "";
  return {
    _key: key,
    _type: "image",
    asset: { _type: "reference", _ref: assetId },
    ...(alt ? { alt } : {}),
    ...(caption ? { caption } : {}),
  };
}

function sanitizeLessonTable(node: PortableNode): PortableNode {
  const key = safeText(node._key, 80);
  const caption = typeof node.caption === "string" ? safeText(node.caption, 1000).trim() : "";
  if (!Array.isArray(node.rows) || node.rows.length < 1 || node.rows.length > MAX_TABLE_ROWS) {
    throw new Error("INVALID_TABLE");
  }

  const usedRowKeys = new Set<string>();
  const rows = node.rows.map((rowValue, rowIndex) => {
    if (!isRecord(rowValue) || rowValue._type !== "lessonTableRow") throw new Error("INVALID_TABLE");
    const rowKey = typeof rowValue._key === "string" && rowValue._key.length <= 80
      ? rowValue._key
      : key + "-row-" + rowIndex;
    if (usedRowKeys.has(rowKey)) throw new Error("INVALID_TABLE");
    usedRowKeys.add(rowKey);

    if (!Array.isArray(rowValue.cells) || rowValue.cells.length < 1 || rowValue.cells.length > MAX_TABLE_CELLS_PER_ROW) {
      throw new Error("INVALID_TABLE");
    }
    const usedCellKeys = new Set<string>();
    const cells = rowValue.cells.map((cellValue, cellIndex) => {
      if (!isRecord(cellValue) || cellValue._type !== "lessonTableCell") throw new Error("INVALID_TABLE");
      const cellKey = typeof cellValue._key === "string" && cellValue._key.length <= 80
        ? cellValue._key
        : rowKey + "-cell-" + cellIndex;
      if (usedCellKeys.has(cellKey)) throw new Error("INVALID_TABLE");
      usedCellKeys.add(cellKey);

      const rowSpan = Math.min(30, Math.max(1, Number(cellValue.rowSpan) || 1));
      const colSpan = Math.min(30, Math.max(1, Number(cellValue.colSpan) || 1));
      return {
        _key: cellKey,
        _type: "lessonTableCell",
        text: safeText(cellValue.text ?? "", MAX_TABLE_CELL_TEXT),
        isHeader: cellValue.isHeader === true,
        rowSpan: Number.isInteger(rowSpan) ? rowSpan : 1,
        colSpan: Number.isInteger(colSpan) ? colSpan : 1,
      };
    });

    return { _key: rowKey, _type: "lessonTableRow", cells };
  });

  return {
    _key: key,
    _type: "lessonTable",
    ...(caption ? { caption } : {}),
    rows,
  };
}

function sanitizeBody(proposed: unknown, currentBody: PortableNode[]): PortableNode[] {
  if (!Array.isArray(proposed) || proposed.length > 800) throw new Error("INVALID_LESSON_BODY");
  if (JSON.stringify(proposed).length > 750_000) throw new Error("LESSON_BODY_TOO_LARGE");

  const currentByKey = new Map(currentBody
    .filter(isRecord)
    .map((node) => [typeof node._key === "string" ? node._key : "", node] as const)
    .filter(([key]) => Boolean(key)));
  const requiredImmutableKeys = currentBody
    .filter((node) => isRecord(node) && node._type !== "block" && node._type !== "lessonTable")
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

    if (value._type === "lessonTable") {
      if (current && current._type !== "lessonTable") throw new Error("INVALID_EMBEDDED_CONTENT");
      return sanitizeLessonTable(value);
    }

    if (value._type === "image" && !current) return sanitizeNewImage(value);

    // Existing images and future custom blocks remain immutable in the web editor.
    // Newly pasted images are accepted only as verified Sanity asset references.
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

async function verifyImageAssets(client: ReturnType<typeof getSanityWriteClient>, body: PortableNode[]) {
  const assetIds = [...new Set(body.flatMap((node) => {
    if (node._type !== "image" || !isRecord(node.asset) || typeof node.asset._ref !== "string") return [];
    return [node.asset._ref];
  }))];
  if (!assetIds.length) return;
  if (assetIds.length > 200) throw new Error("INVALID_IMAGE_ASSET");

  const assetCount = await client.fetch<number>(
    "count(*[_type == \"sanity.imageAsset\" && _id in $assetIds])",
    { assetIds },
  );
  if (assetCount !== assetIds.length) throw new Error("INVALID_IMAGE_ASSET");
}

async function readLesson(lessonId: string) {
  const client = getSanityReadClient();
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

    const status = sanityStatusCode(error);
    if (status === 401 || status === 403) return jsonError("LESSON_READ_FAILED", 503);
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
    await verifyImageAssets(client, body);
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
        "INVALID_IMAGE_ASSET",
        "INVALID_TABLE",
      ].includes(error.message)) {
        return jsonError(error.message, 400);
      }
    }

    const status = sanityStatusCode(error);
    if (status === 401 || status === 403) return jsonError("EDITOR_TOKEN_INVALID", 503);
    console.error("Admin lesson update failed", error);
    return jsonError("LESSON_UPDATE_FAILED", 500);
  }
}
