import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const publicDir = path.join(root, "public");
const failures = [];
const warnings = [];

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

function hasSafeBlankRel(tag) {
  const rel = tag.match(/\brel\s*=\s*["'`]([^"'`]+)["'`]/i)?.[1]?.toLowerCase() || "";
  return rel.split(/\s+/).includes("noopener") && rel.split(/\s+/).includes("noreferrer");
}

function openingTags(input, tagName) {
  const tags = [];
  const needle = `<${tagName}`;
  let index = 0;

  while (index < input.length) {
    const start = input.indexOf(needle, index);
    if (start === -1) break;
    const boundary = input[start + needle.length];
    if (boundary && !/[\s/>]/.test(boundary)) {
      index = start + needle.length;
      continue;
    }

    let cursor = start + needle.length;
    let braceDepth = 0;
    let quote = null;
    let escaped = false;
    for (; cursor < input.length; cursor += 1) {
      const character = input[cursor];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
        continue;
      }
      if (character === "{") braceDepth += 1;
      else if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
      else if (character === ">" && braceDepth === 0) break;
    }
    if (cursor >= input.length) break;
    tags.push(input.slice(start, cursor + 1));
    index = cursor + 1;
  }

  return tags;
}

const appFiles = walk(appDir);
const sourceFiles = appFiles.filter((file) => /\.(?:ts|tsx|js|jsx|mjs)$/.test(file));
const pageFiles = appFiles.filter((file) => path.basename(file) === "page.tsx");
const routeFiles = appFiles.filter((file) => path.basename(file) === "route.ts");
const routeEntries = [
  ...pageFiles.map((file) => routeFromFile(file, "page")),
  ...routeFiles.map((file) => routeFromFile(file, "route")),
];
const routePatterns = routeEntries.map((entry) => ({ ...entry, pattern: routePattern(entry.route) }));
const publicAssets = new Set(walk(publicDir).map((file) => `/${path.relative(publicDir, file).split(path.sep).join("/")}`));

const anchors = new Set();
const internalTargets = [];
const redirectEdges = new Map();
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

  for (const href of content.matchAll(/\bhref\s*=\s*(?:\{\s*)?["'`]([^"'`]*)["'`]/g)) {
    const value = href[1].trim();
    if (!value || value === "#" || /^javascript:/i.test(value)) failures.push(`${relative}: href i pavlefshëm ose bllokues: ${JSON.stringify(value)}.`);
  }

  for (const tagMatch of content.matchAll(/<a\b[^>]*\btarget\s*=\s*["'`]?_blank["'`]?[^>]*>/gi)) {
    if (!hasSafeBlankRel(tagMatch[0])) failures.push(`${relative}: linku target=_blank duhet të ketë rel="noopener noreferrer".`);
  }

  for (const formMatch of content.matchAll(/<form\b[\s\S]*?<\/form>/gi)) {
    for (const buttonTag of openingTags(formMatch[0], "button")) {
      if (!/\btype\s*=/.test(buttonTag)) failures.push(`${relative}: një button brenda formës nuk ka type të përcaktuar dhe mund të shkaktojë submit/navigim të paqëllimshëm.`);
    }
  }

  if (/\b(?:router\.back|window\.history\.back)\s*\(/.test(content)) {
    const hasFallback = /href\s*=\s*(?:\{\s*)?["'`]\/["'`]/.test(content)
      || /router\.(?:push|replace)\(\s*["'`]\//.test(content)
      || /window\.location\.(?:assign|replace)\(\s*["'`]\//.test(content);
    if (!hasFallback) failures.push(`${relative}: përdor Back pa fallback të dukshëm për Ballinën.`);
  }

  for (const pattern of literalPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const target = normalizeInternalTarget(match[1]);
      if (target) internalTargets.push({ ...target, raw: match[1], file: relative });
    }
  }

  const pageEntry = pageFiles.includes(file) ? routeFromFile(file, "page") : null;
  if (pageEntry) {
    const redirects = [...content.matchAll(/\b(?:redirect|permanentRedirect)\(\s*["'`]([^"'`]+)["'`]/g)]
      .map((match) => normalizeInternalTarget(match[1]))
      .filter(Boolean)
      .map((target) => target.pathname);
    if (redirects.length) redirectEdges.set(pageEntry.route, redirects);
  }
}

for (const target of internalTargets) {
  const isRoute = routePatterns.some((entry) => entry.pattern.test(target.pathname));
  const isAsset = publicAssets.has(target.pathname);
  if (!isRoute && !isAsset) failures.push(`${target.file}: destinacioni ${target.raw} nuk përputhet me asnjë faqe, API route ose public asset.`);
  if (target.hash && !anchors.has(target.hash)) failures.push(`${target.file}: anchor-i #${target.hash} nuk ekziston në aplikacion.`);
}

for (const [from, targets] of redirectEdges) {
  for (const to of targets) if (from === to) failures.push(`${from}: redirecton te vetja dhe krijon loop.`);
}
for (const start of redirectEdges.keys()) {
  const seen = new Set([start]);
  let frontier = [...(redirectEdges.get(start) || [])];
  while (frontier.length) {
    const current = frontier.shift();
    if (seen.has(current)) {
      failures.push(`U zbulua redirect loop duke filluar nga ${start}.`);
      break;
    }
    seen.add(current);
    frontier.push(...(redirectEdges.get(current) || []));
  }
}

const layout = readFileSync(path.join(appDir, "layout.tsx"), "utf8");
const mobileNavigation = readFileSync(path.join(appDir, "MobileNavigation.tsx"), "utf8");
const navigationSafety = readFileSync(path.join(appDir, "NavigationSafety.tsx"), "utf8");
const generatedPortalPath = path.join(appDir, "SchoolLearningPortal.tsx");
const generatedPortal = existsSync(generatedPortalPath) ? readFileSync(generatedPortalPath, "utf8") : "";

if (!layout.includes('href="/"')) failures.push("Root layout nuk ka lidhje të dukshme për kthim në Ballinë.");
if (!layout.includes("<NavigationSafety />")) failures.push("NavigationSafety nuk është montuar në root layout.");
for (const requiredHref of ['href: "/"', 'href: "/#klasat"', 'href: "/progress"']) {
  if (!mobileNavigation.includes(requiredHref)) failures.push(`Mobile navigation mungon: ${requiredHref}`);
}
for (const requiredEvent of ["medical-portal:home", "medical-portal:classes"]) {
  if (!navigationSafety.includes(requiredEvent) || !generatedPortal.includes(requiredEvent)) failures.push(`Sinkronizimi i navigimit mungon për eventin ${requiredEvent}.`);
}
for (const requiredHistoryFeature of ["pushState", "replaceState", "popstate", "restorePortalHistory", "portalHistoryStateFromUrl", "lessonDetailsQuery"]) {
  if (!generatedPortal.includes(requiredHistoryFeature)) failures.push(`Browser history/deep-link restoration mungon ose është hequr: ${requiredHistoryFeature}.`);
}
if (!generatedPortal.includes('window.location.hash === "#klasat"')) failures.push("Navigimi direkt te /#klasat nuk e anashkalon klasën e ruajtur.");
if (!navigationSafety.includes("window.localStorage.removeItem(SELECTED_GRADE_KEY)")) failures.push("Ballina/Klasat nuk pastrojnë klasën e ruajtur në navigimin global.");
if (openingTags(generatedPortal, "button").some((tag) => !/\btype\s*=/.test(tag))) failures.push("Portali i gjeneruar ka button pa type=button.");

for (const boundary of appFiles.filter((file) => ["global-error.tsx", "not-found.tsx"].includes(path.basename(file)))) {
  const content = readFileSync(boundary, "utf8");
  if (!/href\s*=\s*(?:\{\s*)?["'`]\//.test(content) && !/window\.location\.(?:assign|replace)\(\s*["'`]\//.test(content)) {
    failures.push(`${path.relative(root, boundary)}: faqja e gabimit nuk ka rrugë daljeje drejt aplikacionit/Ballinës.`);
  }
}

const duplicateRoutes = routeEntries.map((entry) => entry.route).filter((route, index, all) => all.indexOf(route) !== index);
for (const route of new Set(duplicateRoutes)) warnings.push(`Route i dyfishtë në inventar: ${route}`);

const uniqueTargets = [...new Set(internalTargets.map((target) => target.raw))].sort();
console.log("Deep navigation audit");
console.log(`- ${routeEntries.filter((entry) => entry.kind === "page").length} pages`);
console.log(`- ${routeEntries.filter((entry) => entry.kind === "route").length} API routes`);
console.log(`- ${uniqueTargets.length} internal destinations checked`);
console.log(`- ${anchors.size} anchors checked`);
console.log(`- routes: ${routeEntries.map((entry) => `${entry.kind}:${entry.route}`).sort().join(", ")}`);
if (warnings.length) for (const warning of warnings) console.warn(`- warning: ${warning}`);

if (failures.length) {
  console.error("\nDeep navigation audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Deep navigation audit passed.");
