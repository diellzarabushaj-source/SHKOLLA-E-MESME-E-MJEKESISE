import {readFileSync} from "node:fs";

const portalPaths = ["app/ClassicLearningPortal.tsx", "app/SchoolLearningPortal.tsx"];
const styles = readFileSync("app/globals.css", "utf8");
const schema = readFileSync("studio/schemaTypes/chapter.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function requireText(source, value, label) {
  if (!source.includes(value)) throw new Error(`Chapter theme image audit failed: ${label}`);
}

for (const path of portalPaths) {
  const portal = readFileSync(path, "utf8");
  requireText(portal, "cardIllustrationLight?: SanityImage", `${path} is missing the light image type`);
  requireText(portal, "cardIllustrationDark?: SanityImage", `${path} is missing the dark image type`);
  requireText(portal, "cardIllustrationLight {", `${path} does not query the light image`);
  requireText(portal, "cardIllustrationDark {", `${path} does not query the dark image`);
  requireText(portal, 'className="chapter-illustration"', `${path} does not render the chapter illustration`);
  requireText(portal, "chapter-illustration-light", `${path} does not expose the light image class`);
  requireText(portal, "chapter-illustration-dark", `${path} does not expose the dark image class`);
  requireText(portal, "chapter-illustration-placeholder", `${path} has no safe placeholder before images are uploaded`);
  requireText(portal, '"chapter-open-button"', `${path} does not expose the chapter action grid area`);
}

requireText(styles, "chapter-theme-illustrations-v1", "chapter illustration styles are missing");
requireText(styles, 'html[data-theme="light"] .chapter-illustration-light', "light mode does not select its image");
requireText(styles, 'html[data-theme="dark"] .chapter-illustration-dark', "dark mode does not select its image");
requireText(styles, "object-fit: contain", "transparent images are not preserved without cropping");
requireText(styles, "grid-template-areas", "chapter cards do not reserve a stable image area");

requireText(schema, "name: 'cardIllustrationLight'", "Sanity chapter schema is missing the light image field");
requireText(schema, "name: 'cardIllustrationDark'", "Sanity chapter schema is missing the dark image field");
requireText(schema, "sfond transparent", "Sanity does not tell editors to upload transparent images");
requireText(schema, "options: {hotspot: false}", "Sanity could crop the transparent chapter artwork");

const prepare = packageJson.scripts?.["prepare:portal"] || "";
if (!prepare.includes("add-chapter-theme-images.mjs")) {
  throw new Error("Chapter theme image audit failed: prepare:portal does not install chapter images");
}

console.log("Chapter cards use separate transparent Sanity images for light and dark mode with responsive fallback rendering.");
