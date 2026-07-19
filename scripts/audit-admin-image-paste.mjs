import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (path) => existsSync(path)
  ? readFileSync(path, "utf8")
  : (failures.push(`${path} mungon.`), "");

function requireAll(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label}: mungon ${JSON.stringify(token)}.`);
  }
}

const packageSource = read("package.json");
const hardener = read("scripts/add-admin-image-paste.mjs");
const finalizer = read("scripts/finalize-admin-image-paste.mjs");
const helper = read("app/admin-image-paste.ts");
const uploadRoute = read("app/api/admin/assets/images/route.ts");
const lessonRoute = read("app/api/admin/lessons/[lessonId]/route.ts");
const editor = read("app/LessonAdminEditor.tsx");
const css = read("app/LessonAdminEditor.module.css");
const browserAudit = read("scripts/e2e-admin-editor.mjs");

requireAll("Build pipeline", packageSource, [
  "add-admin-image-paste.mjs",
  "finalize-admin-image-paste.mjs",
  "audit-admin-image-paste.mjs",
]);
const prepare = JSON.parse(packageSource || "{}").scripts?.["prepare:portal"] || "";
if (prepare.indexOf("add-admin-image-paste.mjs") <= prepare.indexOf("harden-admin-sanity-save.mjs")) {
  failures.push("Image paste duhet të aplikohet pas forcimit të ruajtjes admin/Sanity.");
}
if (prepare.indexOf("finalize-admin-image-paste.mjs") <= prepare.indexOf("add-admin-image-paste.mjs")) {
  failures.push("Finalizimi i image paste duhet të ekzekutohet pas instalimit të tij.");
}

requireAll("Clipboard image helper", helper, [
  "clipboardImageFiles",
  "insertImageUploadPlaceholders",
  "replaceImageUploadPlaceholder",
  "pastedImagePortableNode",
  "MAX_IMAGES_PER_PASTE = 5",
  "dataset.pastedSanityImage",
  "asset: { _type: \"reference\", _ref: assetId }",
]);

requireAll("Secure image upload endpoint", uploadRoute, [
  "await requireAdminUser()",
  "isSameOriginRequest(request)",
  "MAX_IMAGE_BYTES = 12 * 1024 * 1024",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "client.assets.upload(\"image\"",
  "IMAGE_TYPE_NOT_ALLOWED",
  "EDITOR_TOKEN_INVALID",
]);
if (uploadRoute.includes("image/svg+xml")) failures.push("SVG nuk duhet të pranohet nga paste upload për arsye sigurie.");

requireAll("Generated administrator editor", editor, [
  "admin-image-paste-v1",
  "clipboardImageFiles",
  "uploadPastedImage",
  'adminFetch("/api/admin/assets/images"',
  "insertImageUploadPlaceholders",
  "replaceImageUploadPlaceholder",
  "pastedImagePortableNode",
  "uploadingImages > 0",
  "Paste foto ose tabelë direkt",
  "data-remove-pasted-image",
  `closest('figure[data-pasted-sanity-image="true"]')`,
]);

requireAll("Lesson image validation", lessonRoute, [
  "admin-image-paste-v1",
  "sanitizeNewImage",
  "SANITY_IMAGE_ASSET_PATTERN",
  "verifyImageAssets",
  "sanity.imageAsset",
  "INVALID_IMAGE_ASSET",
  "await verifyImageAssets(client, body)",
]);

requireAll("Image paste styling", css, [
  "admin-image-paste-v1",
  ".imagePasteHint",
  ".imageUploading",
  ".pastedImage",
  ".imageSpinner",
  ".imageRemove",
  "prefers-reduced-motion",
]);

requireAll("Browser image paste test", browserAudit, [
  "/api/admin/assets/images",
  "paste-test.png",
  "data-pasted-sanity-image",
  'serialized.includes(\'"_type":"image"\')',
  'serialized.includes(\'"_ref":"image-auditasset-1x1-png"\')',
]);

requireAll("Persistent hardener", hardener, [
  "admin-image-paste-v1",
  "sanitizeNewImage",
  "verifyImageAssets",
  "uploadPastedImage",
  "imagePasteHint",
]);
requireAll("Generated selector finalizer", finalizer, [
  "brokenSelector",
  "safeSelector",
  "Direct image paste remove selector was not finalized",
]);

if (failures.length) {
  console.error("\nAdministrator direct image paste audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Administrator image paste audit passed clipboard insertion, secure Sanity upload, verified Portable Text serialization, mobile styling and browser regression coverage.");
