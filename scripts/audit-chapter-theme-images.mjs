import {readFileSync} from "node:fs";

const portalPaths = ["app/ClassicLearningPortal.tsx", "app/SchoolLearningPortal.tsx"];
const styles = readFileSync("app/globals.css", "utf8");
const schema = readFileSync("studio/schemaTypes/chapter.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function requireText(source, value, label) {
  if (!source.includes(value)) throw new Error(`Chapter image audit failed: ${label}`);
}

for (const path of portalPaths) {
  const portal = readFileSync(path, "utf8");
  requireText(portal, "chapterImage?: SanityImage", `${path} is missing the chapter image type`);
  requireText(portal, "chapterImage {", `${path} does not query chapterImage`);
  requireText(portal, "const chapterImageSource", `${path} does not prepare the chapter image URL`);
  requireText(portal, 'className="chapter-illustration"', `${path} does not render the chapter image container`);
  requireText(portal, "chapter-illustration-image", `${path} does not render the uploaded image`);
  requireText(portal, "chapter-illustration-placeholder", `${path} has no safe placeholder before an image is uploaded`);
  requireText(portal, '"chapter-open-button"', `${path} does not expose the chapter action grid area`);
}

requireText(styles, "chapter-sanity-image-v2", "chapter image styles are missing");
requireText(styles, ".chapter-illustration-image", "uploaded chapter images are not styled");
requireText(styles, "object-fit: contain", "chapter images are not preserved without cropping");
requireText(styles, "grid-template-areas", "chapter cards do not reserve a stable image area");

requireText(schema, "name: 'chapterImage'", "Sanity chapter schema is missing chapterImage");
requireText(schema, "options: {hotspot: true}", "Sanity chapter images do not support crop and focal-point control");
requireText(schema, "name: 'alt'", "Sanity chapter images are missing alternative text");

const prepare = packageJson.scripts?.["prepare:portal"] || "";
if (!prepare.includes("add-chapter-theme-images.mjs")) {
  throw new Error("Chapter image audit failed: prepare:portal does not install chapter images");
}

console.log("Chapter cards query and render the single Sanity chapterImage field with responsive fallback rendering.");
