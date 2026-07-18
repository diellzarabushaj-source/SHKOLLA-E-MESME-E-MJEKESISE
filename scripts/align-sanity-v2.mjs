import { readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/SchoolLearningPortal.tsx";
let source = readFileSync(portalPath, "utf8");

function replaceExact(label, search, replacement, expectedCount = 1) {
  const count = source.split(search).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} match(es), found ${count}`);
  }
  source = source.split(search).join(replacement);
}

function replaceRegex(label, pattern, replacement, expectedCount) {
  const matches = source.match(pattern) || [];
  if (matches.length !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} match(es), found ${matches.length}`);
  }
  source = source.replace(pattern, replacement);
}

replaceExact(
  "Sanity project fallback",
  'projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l"',
  'projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "u5d5zn7n"',
);

replaceExact(
  "Grade number compatibility",
  "    gradeNumber,",
  '    "gradeNumber": coalesce(gradeNumber, order),',
);

replaceRegex(
  "Description compatibility",
  /^(\s*)shortDescription,$/gm,
  '$1"shortDescription": coalesce(shortDescription, description),',
  2,
);

replaceRegex(
  "Summary compatibility",
  /^(\s*)summary,$/gm,
  '$1"summary": coalesce(summary, description),',
  2,
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

replaceExact(
  "Audio and recording compatibility",
  legacyRecordingProjection,
  compatibleRecordingProjection,
  1,
);

replaceExact(
  "Fresh lesson content",
  "      const details = await client.fetch<Lesson | null>(",
  "      const details = await freshClient.fetch<Lesson | null>(",
);

source = source.replace(
  '"use client";',
  '"use client";\n\n// sanity-v2-contract-v2: generated portal aligned with u5d5zn7n/schoolv2.',
);

writeFileSync(portalPath, source);
console.log("Aligned generated portal with the live Sanity V2 contract and fresh lesson reads.");
