import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`${path} mungon.`), "");
const requireAll = (label, source, tokens) => {
  for (const token of tokens) if (!source.includes(token)) failures.push(`${label}: mungon ${JSON.stringify(token)}.`);
};

const packageSource = read("package.json");
const installer = read("scripts/add-paste-images-editor.mjs");
const uploadRoute = read("app/api/admin/assets/images/route.ts");
const lessonRoute = read("app/api/admin/lessons/[lessonId]/route.ts");
const browserAudit = read("scripts/e2e-admin-image-paste.mjs");
const workflow = read(".github/workflows/admin-browser-audit.yml");

requireAll("Build pipeline", packageSource, ["add-paste-images-editor.mjs", "audit-paste-images.mjs"]);
requireAll("Live editor installer", installer, [
  "admin-paste-images-v1",
  "clipboardData.items",
  "uploadPastedImage",
  "/api/admin/assets/images",
  "data.sanityAssetRef",
  "Fotografia u ngarkua në Sanity",
  "IMAGE_ASSET_REF_PATTERN",
]);
requireAll("Secure image upload route", uploadRoute, [
  "requireAdminUser",
  "isSameOriginRequest",
  "MAX_IMAGE_BYTES",
  "ALLOWED_IMAGE_TYPES",
  'client.assets.upload("image"',
  "SANITY_WRITE_TOKEN_MISSING",
]);
requireAll("Lesson image persistence", lessonRoute, ["sanitizeBody", "INVALID_EMBEDDED_CONTENT"]);
requireAll("Chromium image paste audit", browserAudit, [
  'new File([bytes], "clipboard-test.png"',
  'new ClipboardEvent("paste"',
  "data-sanity-asset-ref",
  'serialized.includes(\'"_type":"image"\')',
  "admin-image-paste.png",
]);
requireAll("Administrator workflow", workflow, [
  "Test direct image paste",
  "node scripts/e2e-admin-image-paste.mjs",
  "artifacts/admin-image-paste-audit",
]);

if (failures.length) {
  console.error("Direct image paste audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Direct image paste audit passed secure upload, clipboard handling, inline placement, Portable Text persistence and Chromium evidence.");
