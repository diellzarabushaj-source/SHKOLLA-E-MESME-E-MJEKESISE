import { existsSync, readFileSync, statSync } from "node:fs";

const failures = [];
const assetPath = "public/assets/anatomy-heart.webp";
const portalPath = "app/ClassicLearningPortal.tsx";
const stylesPath = "app/globals.css";

if (!existsSync(assetPath)) {
  failures.push("Mungon public/assets/anatomy-heart.webp.");
} else {
  const asset = readFileSync(assetPath);
  if (asset.subarray(0, 4).toString("ascii") !== "RIFF" || asset.subarray(8, 12).toString("ascii") !== "WEBP") {
    failures.push("Asseti i zemrës nuk është WebP valid.");
  }
  if (statSync(assetPath).size > 100_000) {
    failures.push("Asseti i zemrës është më i madh se 100 KB.");
  }
}

for (const [path, required] of [
  [portalPath, ["/assets/anatomy-heart.webp", "subject-icon-anatomy", "anatomi|fiziolog"]],
  [stylesPath, ["/* anatomy-heart-card */", ".subject-top i.subject-icon-anatomy img", "object-fit: contain"]],
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
  console.error("\nAnatomy heart audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Anatomy heart audit passed: transparent static WebP, anatomy-only replacement and unchanged card structure.");
