"use client";

import type {ReactNode} from "react";
import LessonLearningExperience from "../LessonLearningExperience";

export default function AuditLearningExperience({children}: {children: ReactNode}) {
  return (
    <LessonLearningExperience
      lessonId="learning-experience-audit-lesson"
      lessonTitle="1.1. Hierarkia automatike e mësimit"
      lessonSummary="Një faqe prove për hierarkinë, navigimin dhe progresin e mësimit."
      gradeTitle="Klasa 10"
      subjectTitle="Anatomi"
      chapterTitle="Kapitulli i auditimit"
      flashcardCount={6}
      coverImage={<div data-audit-cover aria-label="Kopertina e auditimit" style={{minHeight: 132}} />}
      onStartFlashcards={() => undefined}
    >
      {children}
    </LessonLearningExperience>
  );
}
