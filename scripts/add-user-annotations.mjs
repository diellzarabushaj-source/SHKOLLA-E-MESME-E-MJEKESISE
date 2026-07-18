import { readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/SchoolLearningPortal.tsx";
let source = readFileSync(portalPath, "utf8");

if (source.includes("data-lesson-annotations")) {
  process.stdout.write("Private lesson annotations are already installed.\n");
  process.exit(0);
}

function replaceRequired(label, pattern, replacement) {
  if (!source.includes(pattern)) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(pattern, replacement);
}

replaceRequired(
  "annotation component import",
  'import LessonAdminEditor, { type AdminEditableLesson } from "./LessonAdminEditor";',
  'import LessonAdminEditor, { type AdminEditableLesson } from "./LessonAdminEditor";\nimport LessonAnnotations from "./LessonAnnotations";',
);

replaceRequired(
  "authenticated portal property",
  'export default function ClassicLearningPortal({ isAdmin = false }: { isAdmin?: boolean }) {',
  'export default function ClassicLearningPortal({ isAdmin = false, isAuthenticated = false }: { isAdmin?: boolean; isAuthenticated?: boolean }) {',
);

replaceRequired(
  "lesson article annotation wrapper",
  `        <article className={styles.lessonBody}>
          {selectedLesson.body?.length ? (
            <PortableText value={selectedLesson.body as never} components={portableTextComponents} />
          ) : (
            <div className={styles.lessonEmpty}>Teksti i plotë i këtij mësimi ende nuk është publikuar.</div>
          )}
        </article>`,
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
);

writeFileSync(portalPath, source);
process.stdout.write("Installed private highlights and sticky notes in the generated lesson view.\n");
