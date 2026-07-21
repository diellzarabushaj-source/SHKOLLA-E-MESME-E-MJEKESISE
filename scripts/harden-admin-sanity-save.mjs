import { readFileSync, writeFileSync } from "node:fs";

const editorFile = "app/LessonAdminEditor.tsx";
const routeFile = "app/api/admin/lessons/[lessonId]/route.ts";
let editor = readFileSync(editorFile, "utf8").replace(/\r\n?/g, "\n");
let route = readFileSync(routeFile, "utf8").replace(/\r\n?/g, "\n");

if (editor.includes("admin-sanity-resilience-v1") && route.includes("admin-sanity-resilience-v1")) {
  console.log("Administrator Sanity save resilience already installed.");
  process.exit(0);
}

if (!editor.includes("admin-editor-safety-v1")) {
  throw new Error("Admin save resilience must run after the base admin editor hardener.");
}

function swap(target, label, find, replacement) {
  if (!target.includes(find)) throw new Error(`${label}: pattern missing`);
  return target.replace(find, replacement);
}

editor = swap(
  editor,
  "editor resilience stylesheet",
  `// admin-editor-safety-v1`,
  `import "./admin-editor-resilience.css";\n\n// admin-editor-safety-v1\n// admin-sanity-resilience-v1`,
);

editor = swap(
  editor,
  "editor request helpers",
  `function messageFor(error: string): string {`,
  `const SANITY_STUDIO_URL = "https://www.sanity.io/@oZ3HX2fYf/studio/xwvsfazcnhh889nw18ldkuvk/default";\n\nfunction sanityStudioEditUrl(lessonId: string): string {\n  const params = new URLSearchParams({ id: lessonId, type: "lesson", path: "body" });\n  return \`${"${SANITY_STUDIO_URL}"}/intent/edit?\${params.toString()}\`;\n}\n\nasync function responseJson<T>(response: Response): Promise<T> {\n  return response.json().catch(() => ({} as T));\n}\n\nasync function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = window.setTimeout(() => controller.abort(), 20_000);\n  try {\n    return await fetch(input, {\n      ...init,\n      cache: "no-store",\n      credentials: "same-origin",\n      signal: controller.signal,\n    });\n  } catch (error) {\n    if (error instanceof DOMException && error.name === "AbortError") throw new Error("EDITOR_TIMEOUT");\n    throw error;\n  } finally {\n    window.clearTimeout(timeout);\n  }\n}\n\nfunction messageFor(error: string): string {`,
);

editor = swap(
  editor,
  "specific editor errors",
  `  if (error === "INVALID_EMBEDDED_CONTENT") return "Një fotografi ose element i mbrojtur është hequr nga editori. Rifreskoje nga Sanity dhe provo përsëri.";\n  return "Ndryshimet nuk u ruajtën. Provo përsëri.";`,
  `  if (error === "INVALID_EMBEDDED_CONTENT") return "Një fotografi ose element i mbrojtur është hequr nga editori. Rifreskoje nga Sanity dhe provo përsëri.";\n  if (error === "EDITOR_TOKEN_INVALID") return "Lidhja e editorit me Sanity nuk ka leje shkrimi. Hape dokumentin në Sanity Studio ose përditëso token-in e Vercel-it.";\n  if (error === "INVALID_ORIGIN") return "Kërkesa e ruajtjes u bllokua për siguri. Rifresko faqen dhe provo përsëri.";\n  if (error === "LESSON_READ_FAILED") return "Mësimi nuk u lexua nga Sanity. Kontrollo lidhjen dhe provo përsëri.";\n  if (error === "LESSON_UPDATE_FAILED") return "Sanity nuk e pranoi ruajtjen. Ndryshimet e tua janë ende në editor.";\n  if (error === "EDITOR_TIMEOUT") return "Sanity nuk u përgjigj me kohë. Ndryshimet e tua janë ende në editor; provo përsëri.";\n  return "Ndryshimet nuk u ruajtën. Provo përsëri ose hape mësimin në Sanity Studio.";`,
);

editor = swap(
  editor,
  "fresh read request",
  `    const response = await fetch(\`/api/admin/lessons/\${encodeURIComponent(lesson._id)}\`, {\n      method: "GET",\n      headers: { Accept: "application/json" },\n      cache: "no-store",\n    });\n    const result = await response.json() as { lesson?: AdminEditableLesson; error?: string };`,
  `    const response = await adminFetch(\`/api/admin/lessons/\${encodeURIComponent(lesson._id)}\`, {\n      method: "GET",\n      headers: { Accept: "application/json" },\n    });\n    const result = await responseJson<{ lesson?: AdminEditableLesson; error?: string }>(response);`,
);

editor = swap(
  editor,
  "save request",
  `      const response = await fetch(\`/api/admin/lessons/\${encodeURIComponent(currentLesson._id)}\`, {\n        method: "PATCH",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ revision: currentLesson._rev, body }),\n      });\n      const result = await response.json() as { lesson?: AdminEditableLesson; error?: string };`,
  `      const response = await adminFetch(\`/api/admin/lessons/\${encodeURIComponent(currentLesson._id)}\`, {\n        method: "PATCH",\n        headers: { "Content-Type": "application/json", Accept: "application/json" },\n        body: JSON.stringify({ revision: currentLesson._rev, body }),\n      });\n      const result = await responseJson<{ lesson?: AdminEditableLesson; error?: string }>(response);`,
);

editor = swap(
  editor,
  "non-editing error fallback",
  `{error && <p className={styles.inlineError} role="alert">{error}</p>}`,
  `{error && <p className={styles.inlineError} role="alert">{error} <a data-admin-error-studio href={sanityStudioEditUrl(currentLesson._id)} target="_blank" rel="noopener noreferrer">Hape në Sanity Studio</a></p>}`,
);

editor = swap(
  editor,
  "non-editing action group",
  `        <button type="button" onClick={() => void startEditing()} disabled={loadingEditor}>\n          {loadingEditor ? "Duke hapur…" : "Edito mësimin"}\n        </button>`,
  `        <div data-admin-actions>\n          <button type="button" onClick={() => void startEditing()} disabled={loadingEditor}>\n            {loadingEditor ? "Duke hapur…" : "Edito mësimin"}\n          </button>\n          <a data-admin-studio-link href={sanityStudioEditUrl(currentLesson._id)} target="_blank" rel="noopener noreferrer">Hape në Sanity Studio</a>\n        </div>`,
);

editor = swap(
  editor,
  "editing Studio link",
  `        <div className={styles.headerActions}>\n          <button className={styles.refresh}`,
  `        <div className={styles.headerActions}>\n          <a data-admin-studio-link href={sanityStudioEditUrl(currentLesson._id)} target="_blank" rel="noopener noreferrer">Sanity Studio</a>\n          <button className={styles.refresh}`,
);

editor = swap(
  editor,
  "editing error fallback",
  `{error && <div className={styles.error} role="alert">{error}</div>}`,
  `{error && <div className={styles.error} role="alert"><span>{error}</span><a data-admin-error-studio href={sanityStudioEditUrl(currentLesson._id)} target="_blank" rel="noopener noreferrer">Hape dokumentin në Sanity Studio</a></div>}`,
);

route = swap(
  route,
  "public read client import",
  `import { getSanityWriteClient } from "@/lib/sanity/write-client";`,
  `import { getSanityReadClient } from "@/lib/sanity/read-client";\nimport { getSanityWriteClient } from "@/lib/sanity/write-client";\n\n// admin-sanity-resilience-v1`,
);

route = swap(
  route,
  "Sanity status helper",
  `function firstForwardedValue(value: string | null): string {`,
  `function sanityStatusCode(error: unknown): number | null {\n  if (!error || typeof error !== "object") return null;\n  const value = error as { statusCode?: unknown; response?: { statusCode?: unknown; status?: unknown } };\n  const status = Number(value.statusCode ?? value.response?.statusCode ?? value.response?.status);\n  return Number.isInteger(status) ? status : null;\n}\n\nfunction firstForwardedValue(value: string | null): string {`,
);

route = swap(
  route,
  "proxy-safe origin validation",
  `function isSameOriginRequest(request: Request): boolean {\n  const originHeader = request.headers.get("origin");\n  if (!originHeader) return false;\n\n  try {\n    const origin = new URL(originHeader);\n    const requestUrl = new URL(request.url);\n    const publicHost = firstForwardedValue(request.headers.get("x-forwarded-host"))\n      || request.headers.get("host")?.trim()\n      || requestUrl.host;\n    const publicProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"))\n      || requestUrl.protocol.replace(":", "");\n\n    return origin.host.toLowerCase() === publicHost.toLowerCase()\n      && origin.protocol.toLowerCase() === \`${"${publicProtocol.toLowerCase()}"}:\`;\n  } catch {\n    return false;\n  }\n}`,
  `function isSameOriginRequest(request: Request): boolean {\n  const originHeader = request.headers.get("origin");\n  if (!originHeader) return false;\n\n  try {\n    const origin = new URL(originHeader);\n    const requestUrl = new URL(request.url);\n    const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));\n    const directHost = request.headers.get("host")?.trim() || "";\n    const allowedHosts = new Set([requestUrl.host, forwardedHost, directHost].filter(Boolean).map((host) => host.toLowerCase()));\n    const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));\n    const allowedProtocols = new Set([requestUrl.protocol, forwardedProtocol ? \`${"${forwardedProtocol.toLowerCase()}"}:\` : ""].filter(Boolean));\n\n    return allowedHosts.has(origin.host.toLowerCase()) && allowedProtocols.has(origin.protocol.toLowerCase());\n  } catch {\n    return false;\n  }\n}`,
);

route = swap(
  route,
  "token-free lesson read",
  `async function readLesson(lessonId: string) {\n  const client = getSanityWriteClient();`,
  `async function readLesson(lessonId: string) {\n  const client = getSanityReadClient();`,
);

route = swap(
  route,
  "GET Sanity permission error",
  `    console.error("Admin lesson read failed", error);\n    return jsonError("LESSON_READ_FAILED", 500);`,
  `    const status = sanityStatusCode(error);\n    if (status === 401 || status === 403) return jsonError("LESSON_READ_FAILED", 503);\n    console.error("Admin lesson read failed", error);\n    return jsonError("LESSON_READ_FAILED", 500);`,
);

route = swap(
  route,
  "PATCH Sanity permission error",
  `    console.error("Admin lesson update failed", error);\n    return jsonError("LESSON_UPDATE_FAILED", 500);`,
  `    const status = sanityStatusCode(error);\n    if (status === 401 || status === 403) return jsonError("EDITOR_TOKEN_INVALID", 503);\n    console.error("Admin lesson update failed", error);\n    return jsonError("LESSON_UPDATE_FAILED", 500);`,
);

writeFileSync(editorFile, editor);
writeFileSync(routeFile, route);
console.log("Installed resilient administrator reads, writes, diagnostics and Sanity Studio fallback.");
