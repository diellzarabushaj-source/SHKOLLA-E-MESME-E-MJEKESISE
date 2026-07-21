import {notFound} from "next/navigation";
import MarkdownLessonBlock from "../MarkdownLessonContent";
import AuditLearningExperience from "./AuditLearningExperience";

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
    _key: "audit-callout",
    style: "normal",
    text: "Mbaje mend: Teksti i Sanity-t mbetet i pandryshuar.",
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
    <main style={{maxWidth: 920, margin: "0 auto", padding: "96px 20px 180px"}}>
      <AuditLearningExperience>
        <article data-learning-audit-article>
          {blocks.map((block) => (
            <MarkdownLessonBlock
              key={block._key}
              value={{
                _key: block._key,
                style: block.style,
                children: [{text: block.text}],
              }}
            >
              {block.text}
            </MarkdownLessonBlock>
          ))}
        </article>
      </AuditLearningExperience>
    </main>
  );
}
