import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { getSanityWriteClient } from "@/lib/sanity/write-client";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
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

function safeFilename(file: File): string {
  const fallbackExtension = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "image";
  const cleaned = file.name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return cleaned || `paste-${Date.now()}.${fallbackExtension}`;
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return jsonError("INVALID_ORIGIN", 403);
    await requireAdminUser();

    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) return jsonError("IMAGE_REQUIRED", 400);
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return jsonError("UNSUPPORTED_IMAGE_TYPE", 415);
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return jsonError("IMAGE_TOO_LARGE", 413);

    const bytes = Buffer.from(await file.arrayBuffer());
    const client = getSanityWriteClient();
    const asset = await client.assets.upload("image", bytes, {
      filename: safeFilename(file),
      contentType: file.type,
    });

    return NextResponse.json({
      assetRef: asset._id,
      url: asset.url,
      originalFilename: asset.originalFilename || file.name,
    }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "AUTH_REQUIRED") return jsonError("AUTH_REQUIRED", 401);
      if (error.message === "ADMIN_REQUIRED") return jsonError("ADMIN_REQUIRED", 403);
      if (error.message === "SANITY_WRITE_TOKEN_MISSING") return jsonError("EDITOR_NOT_CONFIGURED", 503);
    }

    console.error("Admin image upload failed", error);
    return jsonError("IMAGE_UPLOAD_FAILED", 500);
  }
}
