import { readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/SchoolLearningPortal.tsx";
let source = readFileSync(portalPath, "utf8");

function replaceText(label, search, replacement) {
  if (!source.includes(search) && !source.includes(replacement)) {
    throw new Error(`${label}: source pattern was not found`);
  }
  source = source.split(search).join(replacement);
}

function replacePattern(label, pattern, replacement, resultingMarker) {
  const matched = pattern.test(source);
  pattern.lastIndex = 0;
  if (!matched && !source.includes(resultingMarker)) {
    throw new Error(`${label}: source pattern was not found`);
  }
  source = source.replace(pattern, replacement);
}

replaceText(
  "Sanity project fallback",
  'projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l"',
  'projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "u5d5zn7n"',
);

replaceText(
  "Grade number compatibility",
  "    gradeNumber,",
  '    "gradeNumber": coalesce(gradeNumber, order),',
);

replacePattern(
  "Description compatibility",
  /^(\s*)shortDescription,$/gm,
  '$1"shortDescription": coalesce(shortDescription, description),',
  '"shortDescription": coalesce(shortDescription, description)',
);

replacePattern(
  "Summary compatibility",
  /^(\s*)summary,$/gm,
  '$1"summary": coalesce(summary, description),',
  '"summary": coalesce(summary, description)',
);

const legacyRecordingProjection = `    recording {
      title,
      "url": asset->url,
      "originalFilename": asset->originalFilename
    },`;

const compatibleRecordingProjection = `    "recording": select(
      defined(recording.asset) => recording {
        title,
        "url": asset->url,
        "originalFilename": asset->originalFilename
      },
      defined(audio.asset) => audio {
        title,
        "url": asset->url,
        "originalFilename": asset->originalFilename
      },
      null
    ),`;

replaceText(
  "Audio and recording compatibility",
  legacyRecordingProjection,
  compatibleRecordingProjection,
);

replaceText(
  "Fresh lesson content",
  "      const details = await client.fetch<Lesson | null>(",
  "      const details = await freshClient.fetch<Lesson | null>(",
);

if (!source.includes("sanity-v2-contract-v2")) {
  replaceText(
    "Sanity V2 marker",
    '"use client";',
    '"use client";\n\n// sanity-v2-contract-v2: generated portal aligned with u5d5zn7n/schoolv2.',
  );
}

for (const required of [
  'projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "u5d5zn7n"',
  '"gradeNumber": coalesce(gradeNumber, order)',
  '"shortDescription": coalesce(shortDescription, description)',
  '"summary": coalesce(summary, description)',
  "defined(audio.asset)",
  "freshClient.fetch<Lesson | null>",
  "sanity-v2-contract-v2",
]) {
  if (!source.includes(required)) throw new Error(`Sanity V2 result is missing ${required}`);
}

writeFileSync(portalPath, source);
console.log("Aligned generated portal with the live Sanity V2 contract and fresh lesson reads.");
