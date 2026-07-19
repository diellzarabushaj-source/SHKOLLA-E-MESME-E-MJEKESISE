import {notFound} from "next/navigation";
import LessonLearningExperience from "../LessonLearningExperience";
import MarkdownLessonBlock from "../MarkdownLessonContent";

export const dynamic = "force-dynamic";

const blocks = [
  {
    _key: "audit-section",
    style: "normal",
    text: "SISTEMI I ENËVE",
  },
  {
    _key: "audit-subsection",
    style: "normal",
    text: "3.6. Arteriet",
  },
  {
    _key: "audit-letter-heading",
    style: "normal",
    text: "A. Qarkullimi arterial",
  },
  {
    _key: "audit-parenthesized-heading",
    style: "normal",
    text: "(a) Shtresa e brendshme",
  },
  {
    _key: "audit-detail",
    style: "normal",
    text: "3.6.1. Ndërtimi i murit arterial",
  },
  {
    _key: "audit-paragraph",
    style: "normal",
    text: "Arteriet përçojnë gjakun nga zemra kah periferia e trupit.",
  },
  {
    _key: "audit-false-heading",
    style: "normal",
    text: "Arteriet dhe venat lidhen përmes kapilarëve",
  },
  {
    _key: "audit-numbered-sentence",
    style: "normal",
    text: "1. Arteriet përçojnë gjakun nga zemra kah periferia",
  },
  {
    _key: "audit-callout",
    style: "normal",
    text: "Mbaje mend: Teksti i Sanity-t mbetet i pandryshuar.",
  },
  {
    _key: "audit-label-heading",
    style: "normal",
    text: "Metodat e studimit anatomik",
  },
  {
    _key: "audit-sanity-heading",
    style: "h3",
    text: "Nëntitull i caktuar drejtpërdrejt në Sanity",
  },
] as const;

export default function LearningExperienceAuditPage() {
  if (process.env.E2E_LEARNING_EXPERIENCE_AUDIT !== "1") notFound();

  return (
    <main style={{maxWidth: 920, margin: "0 auto", padding: "96px 20px 220px"}}>
      <header>
        <span>Mësim testues</span>
        <h1 data-audit-lesson-title>1.1. Hierarkia automatike e mësimit</h1>
      </header>

      <LessonLearningExperience
        lessonId="learning-experience-audit-lesson"
        lessonTitle="1.1. Hierarkia automatike e mësimit"
        flashcardCount={6}
      >
        <article data-learning-audit-article>
          {blocks.map((block, index) => (
            <div key={block._key} data-audit-source-key={block._key} style={{minHeight: index < blocks.length - 1 ? 118 : undefined}}>
              <MarkdownLessonBlock
                value={{
                  _key: block._key,
                  style: block.style,
                  children: [{text: block.text}],
                }}
              >
                {block.text}
              </MarkdownLessonBlock>
            </div>
          ))}
        </article>
      </LessonLearningExperience>
    </main>
  );
}
