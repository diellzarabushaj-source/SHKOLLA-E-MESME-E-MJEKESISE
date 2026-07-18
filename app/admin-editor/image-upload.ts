�r�^�f��ئ{}�y�'vî���import type { UploadedAdminImage } from "./types";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateAdminImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Lejohen vetëm fotografi JPG, PNG, WebP ose GIF.";
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return "Fotografia duhet të jetë më e vogël se 4 MB.";
  }
  return null;
}

export async function uploadAdminImage(file: File): Promise<UploadedAdminImage> {
  const validationError = validateAdminImage(file);
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.set("image", file);

  const response = await fetch("/api/admin/assets", {
    method: "POST",
    body: formData,
  });
  const result = await response.json().catch(() => null) as (UploadedAdminImage & { error?: string }) | null;
  if (!response.ok || !result?.asset || !result.url) {
    if (result?.error === "IMAGE_TOO_LARGE") throw new Error("Fotografia duhet të jetë më e vogël se 4 MB.");
    if (result?.error === "IMAGE_DIMENSIONS_TOO_LARGE") throw new Error("Fotografia ka rezolucion tepër të madh. Zvogëloje nën 50 megapikselë dhe provo përsëri.");
    if (result?.error === "UPLOAD_RATE_LIMIT") throw new Error("Janë ngarkuar shumë fotografi përnjëherë. Prit pak minuta dhe provo përsëri.");
    if (result?.error === "INVALID_IMAGE_TYPE") throw new Error("Formati i fotografisë nuk lejohet.");
    if (result?.error === "ADMIN_REQUIRED" || result?.error === "AUTH_REQUIRED") {
      throw new Error("Sesioni i administratorit ka skaduar.");
    }
    throw new Error("Fotografia nuk u ngarkua. Provo përsëri.");
  }

  return result;
}
