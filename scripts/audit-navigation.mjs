import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const publicDir = path.join(root, "public");
const failures = [];

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const absolute = path.join(directory, name);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}

function routeFromFile(file, kind) {
  const relative = path.relative(appDir, path.dirname(file));
  const segments = relative === "" ? [] : relative.split(path.sep);
  const visible = segments.filter((segment) => !segment.startsWith("(") && !segment.startsWith("@"));
  const route = `/${visible.join("/")}`.replace(/\/+/g, "/");
  return { route: route === "" ? "/" : route, kind, file: path.relative(root, file) };
}

function routePattern(route) {
  if (route === "/") return /^\/?$/;
  let source = "^";
  for (const segment of route.split("/").filter(Boolean)) {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) source += "(?:/.*)?";
    else if (/^\[\.\.\..+\]$/.test(segment)) source += "/.+";
    else if (/^\[.+\]$/.test(segment)) source += "/[^/]+";
    else source += `/${segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
  }
  return new RegExp(`${source}/?$`);
}

function normalizeInternalTarget(value) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("${")) return null;
  const url = new URL(value, "https://navigation-audit.local");
  return { pathname: url.pathname.replace(/\/$/, "") || "/", hash: url.hash.slice(1) };
}

const appFiles = walk(appDir);
const sourceFiles = appFiles.filter((file) => /\.(?:ts|tsx|js|jsx|mjs)$/.test(file));
const routeEntries = [
  ...appFiles.filter((file) => path.basename(file) === "page.tsx").map((file) => routeFromFile(file, "page")),
  ...appFiles.filter((file) => path.basename(file) === "route.ts").map((file) => routeFromFile(file, "route")),
];
const routePatterns = routeEntries.map((entry) => ({ ...entry, pattern: routePattern(entry.route) }));
const publicAssets = new Set(walk(publicDir).map((file) => `/${path.relative(publicDir, file).split(path.sep).join("/")}`));

const anchors = new Set();
const internalTargets = [];
const literalPatterns = [
  /\bhref\s*=\s*["'`]([^"'`]+)["'`]/g,
  /\bhref\s*=\s*\{\s*["'`]([^"'`]+)["'`]\s*\}/g,
  /\b(?:router\.(?:push|replace)|redirect|permanentRedirect)\(\s*["'`]([^"'`]+)["'`]/g,
  /\bwindow\.location\.(?:assign|replace)\(\s*["'`]([^"'`]+)["'`]/g,
];

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  const relative = path.relative(root, file);

  for (const match of content.matchAll(/\bid\s*=\s*(?:\{\s*)?["'`]([^"'`]+)["'`]/g)) anchors.add(match[1]);
  for (const pattern of literalPatterns) {
    for (const match of content.matchAll(pattern)) {
      const target = normalizeInternalTarget(match[1]);
      if (target) internalTargets.push({ ...target, raw: match[1], file: relative });
    }
  }
}

for (const target of internalTargets) {
  const isRoute = routePatterns.some((entry) => entry.pattern.test(target.pathname));
  const isAsset = publicAssets.has(target.pathname);
  if (!isRoute && !isAsset) failures.push(`${target.file}: destinacioni ${target.raw} nuk përputhet me asnjë faqe, API route ose public asset.`);
  if (target.hash && !anchors.has(target.hash)) failures.push(`${target.file}: anchor-i #${target.hash} nuk ekziston në aplikacion.`);
}

const layout = readFileSync(path.join(appDir, "layout.tsx"), "utf8");
const mobileNavigation = readFileSync(path.join(appDir, "MobileNavigation.tsx"), "utf8");
const navigationSafety = readFileSync(path.join(appDir, "NavigationSafety.tsx"), "utf8");
const portalGenerator = readFileSync(path.join(root, "scripts", "build-schoolv2-portal-v2.mjs"), "utf8");

if (!layout.includes('href="/"')) failures.push("Root layout nuk ka lidhje të dukshme për kthim në Ballinë.");
if (!layout.includes("<NavigationSafety />")) failures.push("NavigationSafety nuk është montuar në root layout.");
for (const requiredHref of ['href: "/"', 'href: "/#klasat"', 'href: "/progress"']) {
  if (!mobileNavigation.includes(requiredHref)) failures.push(`Mobile navigation mungon: ${requiredHref}`);
}
for (const requiredEvent of ["medical-portal:home", "medical-portal:classes"]) {
  if (!navigationSafety.includes(requiredEvent) || !portalGenerator.includes(requiredEvent)) failures.push(`Sinkronizimi i navigimit mungon për eventin ${requiredEvent}.`);
}
for (const requiredHistoryFeature of ["pushState", "replaceState", "popstate", "restorePortalHistory"]) {
  if (!portalGenerator.includes(requiredHistoryFeature)) failures.push(`Browser history mungon ose është hequr: ${requiredHistoryFeature}.`);
}

const duplicateTargets = [...new Set(internalTargets.map((target) => target.raw))].sort();
console.log("Navigation audit");
console.log(`- ${routeEntries.filter((entry) => entry.kind === "page").length} pages`);
console.log(`- ${routeEntries.filter((entry) => entry.kind === "route").length} API routes`);
console.log(`- ${duplicateTargets.length} internal destinations checked`);
console.log(`- routes: ${routeEntries.map((entry) => entry.route).sort().join(", ")}`);

if (failures.length) {
  console.error("\nNavigation audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Navigation audit passed.");
