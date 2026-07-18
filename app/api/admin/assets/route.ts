≠rá^—f•ñÿ¶{~¨y 'v√Æ∂õ≠import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { getSanityWriteClient } from "@/lib/sanity/write-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + 256 * 1024;
const MAX_IMAGE_EDGE = 10_000;
const MAX_IMAGE_PIXELS = 50_000_000;
const UPLOAD_WINDOW_MS = 10 * 60_000;
const MAX_UPLOADS_PER_WINDOW = 60;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const uploadAttempts = new Map<string, number[]>();

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function safeFilename(filename: string): string {
  const cleaned = filename
    .normalize("NFKC")
    .replaceAll(/[^A-Za-z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 120);
  return cleaned || "lesson-image";
}

function consumeUploadAllowance(userId: string): boolean {
  const now = Date.now();
  const recent = (uploadAttempts.get(userId) || []).filter((timestamp) => now - timestamp < UPLOAD_WINDOW_MS);
  if (recent.length >= MAX_UPLOADS_PER_WINDOW) {
    uploadAttempts.set(userId, recent);
    return false;
  }
  recent.push(now);
  uploadAttempts.set(userId, recent);
  return true;
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) return jsonError("INVALID_ORIGIN", 403);
    const admin = await requireAdminUser();
    if (!admin.id || !consumeUploadAllowance(admin.id)) return jsonError("UPLOAD_RATE_LIMIT", 429);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) return jsonError("IMAGE_TOO_LARGE", 413);
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) return jsonError("IMAGE_REQUIRED", 400);
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) return jsonError("INVALID_IMAGE_TYPE", 415);
    if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) return jsonError("IMAGE_TOO_LARGE", 413);

    const client = getSanityWriteClient();
    const asset = await client.assets.upload("image", Buffer.from(await image.arrayBuffer()), {
      filename: safeFilename(image.name),
      contentType: image.type,
      extract: ["blurhash", "palette"],
    });

    if (asset._type !== "sanity.imageAsset" || !asset._id || !asset.url) {
      return jsonError("INVALID_IMAGE_TYPE", 415);
    }
    const width = asset.metadata?.dimensions?.width;
    const height = asset.metadata?.dimensions?.height;
    if (
      typeof width !== "number"
      || typeof height !== "number"
      || width <= 0
      || height <= 0
      || width > MAX_IMAGE_EDGE
      || height > MAX_IMAGE_EDGE
      || width * height > MAX_IMAGE_PIXELS
    ) {
      await client.delete(asset._id).catch((deleteError) => console.error("Rejected image cleanup failed", deleteError));
      return jsonError("IMAGE_DIMENSIONS_TOO_LARGE", 422);
    }

    return NextResponse.json({
      asset: { _type: "reference", _ref: asset._id },
      url: asset.url,
      originalFilename: asset.originalFilename || image.name,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "AUTH_REQUIRED") return jsonError("AUTH_REQUIRED", 401);
      if (error.message === "ADMIN_REQUIRED") return jsonError("ADMIN_REQUIRED", 403);
      if (error.message === "SANITY_WRITE_TOKEN_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
      if (error.message === "SANITY_WRITE_TARGET_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
    }
    console.error("Admin image upload failed", error);
    return jsonError("IMAGE_UPLOAD_FAILED", 500);
  }
}
