import {notFound} from "next/navigation";
import {type PortableTextComponents} from "next-sanity";
import LessonContentRenderer from "../LessonContentRenderer";
import LessonLearningExperience from "../LessonLearningExperience";

export const dynamic = "force-dynamic";

const sourceBlocks = [
  ["audit-section", "normal", "SISTEMI I ENËVE"],
  ["audit-subsection", "normal", "3.6. Arteriet"],
  ["audit-letter-heading", "normal", "A. Qarkullimi arterial"],
  ["audit-parenthesized-heading", "normal", "(a) Shtresa e Brendshme"],
  ["audit-detail", "normal", "3.6.1. Ndërtimi i murit arterial"],
  ["audit-paragraph", "normal", "Arteriet përçojnë gjakun nga zemra kah periferia e trupit."],
  ["audit-false-heading", "normal", "Arteriet dhe venat lidhen përmes kapilarëve"],
  ["audit-numbered-sentence-one", "normal", "1. Arteriet përçojnë gjakun nga zemra kah periferia"],
  ["audit-numbered-sentence-two", "normal", "2. Venat e kthejnë gjakun drejt zemrës"],
  ["audit-callout", "normal", "Mbaje mend: Teksti i Sanity-t mbetet i pandryshuar."],
  ["audit-label-heading", "normal", "Metodat e studimit anatomik"],
  ["audit-sanity-heading", "h3", "Nëntitull i caktuar drejtpërdrejt në Sanity"],
  ["audit-sanity-h1", "h1", "Titull i trupit i vendosur si H1 në Sanity"],
  ["audit-top-letter", "normal", "C. SISTEMI VENOR"],
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
    <main style={{maxWidth: 920, margin: "0 auto", padding: "96px 20px 240px"}}>
      <header>
        <span>Mësim testues</span>
        <h1 data-audit-lesson-title>1.1. Hierarkia automatike e mësimit</h1>
      </header>

      <LessonLearningExperience
        lessonId="learning-experience-audit-lesson"
        lessonTitle="1.1. Hierarkia automatike e mësimit"
        flashcardCount={6}
      >
        <article data-learning-audit-article style={{display: "grid", gap: 88}}>
          <LessonContentRenderer body={body} components={components} />
        </article>
      </LessonLearningExperience>
    </main>
  );
}
