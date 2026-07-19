import {notFound} from "next/navigation";
import {type PortableTextComponents} from "next-sanity";
import LessonContentRenderer from "../LessonContentRenderer";
import PerfectLessonLearningExperience from "../PerfectLessonLearningExperience";

export const dynamic = "force-dynamic";

const sourceBlocks = [
  ["audit-section", "normal", "SISTEMI I ENËVE"],
  ["audit-letter-heading", "normal", "A. Qarkullimi arterial"],
  ["audit-parenthesized-heading", "normal", "(a) Shtresa e Brendshme"],
  ["audit-subsection", "normal", "3.6. Arteriet"],
  ["audit-detail", "normal", "3.6.1. Ndërtimi i murit arterial"],
  ["audit-paragraph", "normal", "Arteriet përçojnë gjakun nga zemra kah periferia e trupit."],
  ["audit-false-heading", "normal", "Arteriet dhe venat lidhen përmes kapilarëve"],
  ["audit-numbered-sentence", "normal", "1. Arteriet përçojnë gjakun nga zemra kah periferia"],
  ["audit-callout", "normal", "Mbaje mend: Teksti i Sanity-t mbetet i pandryshuar."],
  ["audit-label-heading", "normal", "Metodat e studimit anatomik"],
  ["audit-sanity-heading", "h3", "Nëntitull i caktuar drejtpërdrejt në Sanity"],
] as const;

const body = sourceBlocks.map(([key, style, text]) => ({
  _key: key,
  _type: "block",
  style,
  markDefs: [],
  children: [{_key: `${key}-span`, _type: "span", marks: [], text}],
}));

const components: PortableTextComponents = {};

export default function LearningExperienceAuditPage() {
  if (process.env.E2E_LEARNING_EXPERIENCE_AUDIT !== "1") notFound();

  return (
    <main style={{maxWidth: 920, margin: "0 auto", padding: "96px 20px 220px"}}>
      <header>
        <span>Mësim testues</span>
        <h1 data-audit-lesson-title>1.1. Hierarkia automatike e mësimit</h1>
      </header>

      <PerfectLessonLearningExperience
        lessonId="learning-experience-audit-lesson"
        lessonTitle="1.1. Hierarkia automatike e mësimit"
        flashcardCount={6}
        contentRevision="audit-revision-current"
      >
        <article data-learning-audit-article style={{display: "grid", gap: 96}}>
          <LessonContentRenderer body={body} components={components} />
        </article>
      </PerfectLessonLearningExperience>
    </main>
  );
}
