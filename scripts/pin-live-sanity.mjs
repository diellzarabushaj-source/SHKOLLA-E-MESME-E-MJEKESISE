import { readFileSync, writeFileSync } from "node:fs";

const path = "app/SchoolLearningPortal.tsx";
let source = readFileSync(path, "utf8");

function replaceOnce(label, search, replacement) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(search, replacement);
}

replaceOnce("Canonical Sanity project", 'projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "u5d5zn7n"', 'projectId: "u5d5zn7n"');
replaceOnce("Canonical Sanity dataset", 'dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_V2 || "schoolv2"', 'dataset: "schoolv2"');
replaceOnce("Canonical Sanity API version", 'apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-17"', 'apiVersion: "2026-07-17"');
replaceOnce("Fresh portal reads", "  useCdn: true,", "  useCdn: false,");

const fetchLine = '      const result = await source.fetch<Grade[]>(portalQuery, {}, { perspective: "published" });';
const validatedFetch = `${fetchLine}
      const subjectCount = result.reduce((sum, grade) => sum + (grade.subjects?.length || 0), 0);
      const lessonCount = result.reduce(
        (sum, grade) => sum + (grade.subjects || []).reduce(
          (subjectSum, subject) => subjectSum + (subject.chapters || []).reduce(
            (chapterSum, chapter) => chapterSum + (chapter.lessons?.length || 0),
            0,
          ),
          0,
        ),
        0,
      );
      if (!Array.isArray(result) || result.length === 0 || subjectCount === 0 || lessonCount === 0) {
        throw new Error("SANITY_PORTAL_DATA_INCOMPLETE");
      }`;
replaceOnce("Portal data contract", fetchLine, validatedFetch);

if (!source.includes("canonical-sanity-schoolv2")) {
  source = source.replace('"use client";', '"use client";\n\n// canonical-sanity-schoolv2');
}

writeFileSync(path, source);
console.log("Pinned generated portal to canonical School V2 Sanity data.");
