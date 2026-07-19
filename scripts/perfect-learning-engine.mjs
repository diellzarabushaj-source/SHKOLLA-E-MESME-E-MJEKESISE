import {readFileSync, writeFileSync} from "node:fs";

const portalPath = "app/SchoolLearningPortal.tsx";
const marker = "perfect-learning-engine-v2";
let source = readFileSync(portalPath, "utf8");

if (source.includes(marker)) {
  process.stdout.write("Perfect learning engine is already installed.\n");
  process.exit(0);
}

function replaceRequired(label, before, after) {
  if (!source.includes(before)) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(before, after);
}

if (!source.includes("lesson-learning-experience-v1")) {
  throw new Error("Perfect learning engine must run after the base learning experience installer.");
}

replaceRequired(
  "perfect learning imports",
  'import LessonLearningExperience from "./LessonLearningExperience";',
  `import LessonLearningExperience from "./PerfectLessonLearningExperience";
import LessonContentRenderer from "./LessonContentRenderer";

// ${marker}`,
);

replaceRequired(
  "revision-aware learning wrapper",
  `          flashcardCount={selectedLesson.flashcardCount}
        >`,
  `          flashcardCount={selectedLesson.flashcardCount}
          contentRevision={selectedLesson._rev}
        >`,
);

const portableTextCall = '<PortableText value={selectedLesson.body as never} components={portableTextComponents} />';
if (!source.includes(portableTextCall)) {
  throw new Error("Perfect learning renderer: lesson PortableText call was not found");
}
source = source.replaceAll(
  portableTextCall,
  '<LessonContentRenderer body={selectedLesson.body as never} components={portableTextComponents} />',
);

writeFileSync(portalPath, source);
process.stdout.write("Installed deterministic whole-lesson hierarchy, revision-aware progress and exact-text rendering.\n");
