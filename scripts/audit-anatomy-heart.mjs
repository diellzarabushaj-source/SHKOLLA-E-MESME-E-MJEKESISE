import { existsSync, readFileSync, statSync } from "node:fs";

const failures = [];
const fallbackAssetPath = "public/assets/anatomy-heart.webp";
const portalPath = "app/ClassicLearningPortal.tsx";
const stylesPath = "app/globals.css";

if (!existsSync(fallbackAssetPath)) {
  failures.push("Mungon public/assets/anatomy-heart.webp si fallback për Anatominë.");
} else {
  const asset = readFileSync(fallbackAssetPath);
  if (asset.subarray(0, 4).toString("ascii") !== "RIFF" || asset.subarray(8, 12).toString("ascii") !== "WEBP") {
    failures.push("Fallback-i i zemrës nuk është WebP valid.");
  }
  if (statSync(fallbackAssetPath).size > 100_000) {
    failures.push("Fallback-i i zemrës është më i madh se 100 KB.");
  }
}

for (const [path, required] of [
  [portalPath, [
    "cardIllustration?: SanityImage",
    '"shortDescription": coalesce(shortDescription, description)',
    "cardIllustration {",
    '"asset": asset->{url}',
    "subject.cardIllustration?.asset?.url",
    "subject-icon-illustration",
    "?w=240&fit=max&auto=format",
    "/assets/anatomy-heart.webp",
    "isAnatomySubject",
    'loading="lazy"',
  ]],
  [stylesPath, [
    "/* subject-card-illustrations */",
    ".subject-top i.subject-icon-illustration img",
    "object-fit: contain",
    "pointer-events: none",
  ]],
]) {
  if (!existsSync(path)) {
    failures.push(`Mungon ${path}.`);
    continue;
  }
  const source = readFileSync(path, "utf8");
  for (const token of required) {
    if (!source.includes(token)) failures.push(`${path}: mungon ${token}.`);
  }
}

if (failures.length) {
  console.error("\nSubject card illustration audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Subject card illustration audit passed: Sanity image first, optimized delivery, anatomy fallback and unchanged card behavior.");
