import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute)) {
    failures.push(`${relativePath} mungon.`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requireText(label, content, values) {
  for (const value of values) {
    if (!content.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
  }
  checks.push(label);
}

const packageJson = JSON.parse(read("package.json") || "{}");
const page = read("app/page.tsx");
const component = read("app/LessonAnnotations.tsx");
const componentCss = read("app/LessonAnnotations.module.css");
const api = read("app/api/annotations/route.ts");
const server = read("lib/annotations/server.ts");
const generator = read("scripts/add-user-annotations.mjs");
const migration = read("database/lesson-annotations.sql");
const serviceWorker = read("public/sw.js");

requireText("Authenticated rendering", page, [
  "currentSessionUser",
  "isAuthenticated={Boolean(user?.id)}",
]);

requireText("Generated lesson integration", generator, [
  'import LessonAnnotations from "./LessonAnnotations"',
  "isAuthenticated = false",
  "enabled={isAuthenticated}",
  "lessonId={selectedLesson._id}",
  "contentRevision={selectedLesson._rev}",
  "body={selectedLesson.body}",
]);

requireText("Private annotation UI", component, [
  "data-lesson-annotations",
  "Zgjidh tekst vetëm brenda një paragrafi ose titulli.",
  "Shënimet e mia",
  "+ Sticky note",
  'fetch("/api/annotations"',
  'method: "POST"',
  'method: "PATCH"',
  'method: "DELETE"',
  "resolveAnnotationRange",
  "quotePosition",
  "getClientRects",
]);
if (/localStorage|sessionStorage/.test(component)) {
  failures.push("Private annotation UI nuk duhet t'i ruajë shënimet në storage të përbashkët të browser-it.");
}
if (!componentCss.includes("pointer-events: none") || !componentCss.includes("@media (max-width: 700px)")) {
  failures.push("Annotation overlay ose responsive mobile styling mungon.");
}

requireText("Annotation API privacy", api, [
  "await requireAnnotationUserId()",
  "isSameOriginRequest(request)",
  'const noStoreHeaders = { "Cache-Control": "no-store" }',
  "INVALID_ORIGIN",
  "ANNOTATION_LIMIT_REACHED",
  "LESSON_ID_PATTERN",
  "UUID_PATTERN",
]);

requireText("Server-side ownership", server, [
  "WHERE user_id=${userId} AND lesson_id=${lessonId}",
  "WHERE id=${input.id} AND user_id=${userId}",
  "WHERE id=${annotationId} AND user_id=${userId}",
  "ON CONFLICT (user_id, lesson_id, annotation_type, block_key, start_offset, end_offset)",
  "LIMIT 500",
]);

requireText("Database isolation", migration, [
  "CREATE TABLE IF NOT EXISTS public.lesson_annotations",
  "ENABLE ROW LEVEL SECURITY",
  "FORCE ROW LEVEL SECURITY",
  "lesson_annotations_select_own",
  "lesson_annotations_insert_own",
  "lesson_annotations_update_own",
  "lesson_annotations_delete_own",
  "auth.uid()",
  "GRANT SELECT, INSERT, UPDATE, DELETE",
]);

requireText("PWA private API handling", serviceWorker, [
  'const PRIVATE_PATHS = ["/api/", "/auth/", "/progress"]',
]);

const scripts = packageJson.scripts || {};
if (!String(scripts["prepare:portal"] || "").includes("add-user-annotations.mjs")) {
  failures.push("prepare:portal nuk e instalon integrimin e annotations.");
}
if (!String(scripts["audit:app"] || "").includes("audit:annotations")) {
  failures.push("audit:app nuk e ekzekuton auditimin e annotations.");
}
checks.push("Package integration");

console.log("Private lesson annotations audit");
console.log(`- ${checks.length} audit groups checked`);

if (failures.length) {
  console.error("\nPrivate lesson annotations audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Private lesson annotations audit passed.");
