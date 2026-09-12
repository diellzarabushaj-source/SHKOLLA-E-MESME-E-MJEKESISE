import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
const component = read("app/LessonAnnotations.tsx");
const contextCss = read("app/annotation-context-polish.css");
const mobileCss = read("app/annotation-mobile-polish.css");
const api = read("app/api/annotations/route.ts");
const server = read("lib/annotations/server.ts");
const database = read("database/lesson-annotations.sql");
const workflow = read(".github/workflows/annotations.yml");
const packageJson = JSON.parse(read("package.json"));

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

check(component.includes("annotation-stability-v5"), "Generated LessonAnnotations is missing stability v5 hardening.");
check(component.includes('import { createPortal } from "react-dom";'), "Annotation toolbar is not portaled to document.body.");
check(component.includes('document.addEventListener("pointerup", releaseInteraction, true)'), "Global pointer-up release guard is missing.");
check(component.includes('document.addEventListener("pointercancel", releaseInteraction, true)'), "Global pointer-cancel release guard is missing.");
check(component.includes('window.addEventListener("blur", releaseInteraction)'), "Window blur interaction release guard is missing.");
check(!component.includes("setPointerCapture(event.pointerId)"), "Toolbar must not capture the pointer because capture can retarget button clicks away from controls.");
check(component.includes("pendingSelectionRecheckRef"), "Conditional blocked-selection recovery state is missing.");
check(component.includes("scheduleSelectionRecheck"), "Deferred selection recovery is missing.");
check(component.includes("TOOLBAR_POSITION_EPSILON"), "Micro-jitter suppression is missing.");
check(component.includes('data-placement={selection.placement}'), "Placement-aware toolbar state is missing.");
check(component.includes('aria-pressed={selectionHighlight?.color === color}'), "Active highlight accessibility state is missing.");
check((component.match(/loadRequestRef\.current \+= 1/g) || []).length >= 5, "Mutations do not invalidate stale in-flight annotation loads.");

check(contextCss.includes("min-width: 44px !important"), "Coarse-pointer controls are smaller than the 44px audit target.");
check(contextCss.includes("min-height: 44px !important"), "Coarse-pointer controls are shorter than the 44px audit target.");
check(contextCss.includes("[data-annotation-selection-toolbar] button:focus-visible"), "Portaled toolbar lacks an explicit focus-visible style.");
check(contextCss.includes("@media (prefers-reduced-motion: reduce)"), "Reduced-motion handling is missing.");
check(mobileCss.includes("env(safe-area-inset-bottom)"), "Mobile toolbar does not account for bottom safe area.");

const originChecks = (api.match(/if \(!isSameOriginRequest\(request\)\)/g) || []).length;
check(originChecks >= 3, "POST/PATCH/DELETE same-origin protection is incomplete.");
check(api.includes('export const dynamic = "force-dynamic"'), "Annotations API is not forced dynamic.");
check(api.includes('const noStoreHeaders = { "Cache-Control": "no-store" }'), "Annotations API no-store headers are missing.");
check(api.includes("UUID_PATTERN"), "Annotation mutation IDs are not UUID validated.");
check(api.includes("quote = cleanText(body.quote, 1_000)"), "Quote length validation is missing.");
check(api.includes("cleanText(body.noteText, 4_000)"), "Sticky-note length validation is missing.");

check(server.includes("WHERE user_id=${userId} AND lesson_id=${lessonId}"), "Server list query is not explicitly user scoped.");
check(server.includes("pg_advisory_xact_lock(hashtextextended"), "Per-lesson annotation limit is not serialized against concurrent creates.");
check(server.includes("count(*) < 500 AS has_capacity"), "Per-lesson 500-annotation capacity check is missing.");
check(server.includes("WHERE has_capacity OR anchor_exists"), "Existing anchors cannot safely update at the annotation limit.");
check(server.includes("WHERE id=${input.id} AND user_id=${userId}"), "Update query is not explicitly user scoped.");
check(server.includes("WHERE id=${annotationId} AND user_id=${userId}"), "Delete query is not explicitly user scoped.");

check(database.includes("ENABLE ROW LEVEL SECURITY"), "Annotation table RLS is not enabled.");
check(database.includes("FORCE ROW LEVEL SECURITY"), "Annotation table RLS is not forced.");
check(database.includes("lesson_annotations_unique_anchor UNIQUE"), "Unique annotation anchor constraint is missing.");
for (const operation of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
  check(database.includes(`FOR ${operation}`), `RLS policy for ${operation} is missing.`);
}

check(workflow.includes("e2e-annotation-deep-audit.mjs"), "Deep annotation browser audit is not wired into CI.");
check(workflow.includes("annotation-deep-e2e.log"), "Deep annotation diagnostics are not retained by CI.");
check(String(packageJson.scripts?.["audit:annotations"] || "").includes("audit-annotation-deep-static.mjs"), "Deep static audit is not part of audit:annotations.");

if (failures.length) {
  console.error("Deep annotation static audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Deep annotation static audit passed: click-safe interaction lifecycle, touch accessibility, mutation race protection, API isolation, concurrency-safe persistence limits, RLS and CI coverage are present.");
