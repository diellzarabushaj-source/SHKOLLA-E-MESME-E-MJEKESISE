import { readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/SchoolLearningPortal.tsx";
const marker = "lesson-learning-experience-v1";
let source = readFileSync(portalPath, "utf8");

if (source.includes(marker)) {
  process.stdout.write("Lesson learning experience is already installed.\n");
  process.exit(0);
}

function replaceRequired(label, before, after) {
  if (!source.includes(before)) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(before, after);
}

if (!source.includes("data-lesson-annotations")) {
  throw new Error("Learning experience must run after private lesson annotations are installed.");
}

replaceRequired(
  "learning experience import",
  'import LessonAnnotations from "./LessonAnnotations";',
  `import LessonAnnotations from "./LessonAnnotations";
import LessonLearningExperience from "./LessonLearningExperience";

// ${marker}`,
);

replaceRequired(
  "lesson learning wrapper",
  `        <LessonAnnotations
          enabled={isAuthenticated}
          lessonId={selectedLesson._id}
          contentRevision={selectedLesson._rev}
          body={selectedLesson.body}
          articleClassName={styles.lessonBody}
        >
          {selectedLesson.body?.length ? (
            <PortableText value={selectedLesson.body as never} components={portableTextComponents} />
          ) : (
            <div className={styles.lessonEmpty}>Teksti i plotë i këtij mësimi ende nuk është publikuar.</div>
          )}
        </LessonAnnotations>`,
  `        <LessonLearningExperience
          lessonId={selectedLesson._id}
          lessonTitle={selectedLesson.title}
          flashcardCount={selectedLesson.flashcardCount}
        >
          <LessonAnnotations
            enabled={isAuthenticated}
            lessonId={selectedLesson._id}
            contentRevision={selectedLesson._rev}
            body={selectedLesson.body}
            articleClassName={styles.lessonBody}
          >
            {selectedLesson.body?.length ? (
              <PortableText value={selectedLesson.body as never} components={portableTextComponents} />
            ) : (
              <div className={styles.lessonEmpty}>Teksti i plotë i këtij mësimi ende nuk është publikuar.</div>
            )}
          </LessonAnnotations>
        </LessonLearningExperience>`,
);

writeFileSync(portalPath, source);
process.stdout.write("Installed the non-destructive lesson learning experience.\n");
