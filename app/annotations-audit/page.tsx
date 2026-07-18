import { notFound } from "next/navigation";
import LessonAnnotations from "../LessonAnnotations";

export const dynamic = "force-dynamic";

const body = [
  {
    _key: "audit-heading",
    _type: "block",
    children: [{ text: "Highlights dhe sticky notes" }],
  },
  {
    _key: "audit-paragraph",
    _type: "block",
    children: [{ text: "Qeliza është njësia themelore strukturore dhe funksionale e organizmit. Membrana kontrollon shkëmbimin e materieve." }],
  },
];

export default function AnnotationsAuditPage() {
  if (process.env.E2E_ANNOTATIONS_AUDIT !== "1") notFound();

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "96px 20px 180px" }}>
      <LessonAnnotations
        enabled
        lessonId="annotation-audit-lesson"
        contentRevision="audit-revision-1"
        body={body}
        articleClassName="annotation-audit-article"
      >
        <h2>Highlights dhe sticky notes</h2>
        <p data-audit-paragraph>
          Qeliza është njësia themelore strukturore dhe funksionale e organizmit. Membrana kontrollon shkëmbimin e materieve.
        </p>
      </LessonAnnotations>
    </main>
  );
}
