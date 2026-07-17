import { readFileSync, writeFileSync } from "node:fs";

const filePath = "app/ClassicLearningPortal.tsx";
let source = readFileSync(filePath, "utf8");

function replaceExact(label, before, after) {
  const matches = source.split(before).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${matches}`);
  }
  source = source.replace(before, after);
}

replaceExact(
  "embedded flashcard types",
  `type Flashcard = {
  _id: string;
  title?: string;
  front: string;
  back: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  image?: SanityImage;
  imageSide?: "front" | "back" | "both";
  lessonId: string;
  lessonTitle: string;
};`,
  `type Flashcard = {
  _id: string;
  title?: string;
  front: string;
  back: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  image?: SanityImage;
  imageSide?: "front" | "back" | "both";
  lessonId: string;
  lessonTitle: string;
};

type EmbeddedFlashcard = {
  _key: string;
  legacyId?: string;
  title?: string;
  front: string;
  back: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  image?: SanityImage;
  imageSide?: "front" | "back" | "both";
};

type LessonDeck = {
  _id: string;
  title: string;
  cards?: EmbeddedFlashcard[];
};`,
);

replaceExact(
  "portal flashcard count",
  `                "flashcardCount": count(*[
                  _type == "flashcard" &&
                  lesson._ref == ^._id &&
                  isActive != false
                ])`,
  `                "flashcardCount": count(flashcards[isActive != false])`,
);

replaceExact(
  "standalone flashcard queries",
  `const cardFields = \`
  _id,
  title,
  front,
  back,
  explanation,
  difficulty,
  tags,
  imageSide,
  image { alt, caption, "asset": asset->{url} },
  "lessonId": lesson._ref,
  "lessonTitle": lesson->title
\`;

const lessonCardsQuery = \`
  *[_type == "flashcard" && lesson._ref == $lessonId && isActive != false]
  | order(order asc, _createdAt asc) {
    \${cardFields}
  }
\`;

const chapterCardsQuery = \`
  *[
    _type == "flashcard" &&
    isActive != false &&
    lesson._ref in *[_type == "lesson" && chapter._ref == $chapterId && isActive != false]._id
  ]
  | order(lesson->order asc, order asc, _createdAt asc) {
    \${cardFields}
  }
\`;`,
  `const embeddedCardFields = \`
  _key,
  legacyId,
  title,
  front,
  back,
  explanation,
  difficulty,
  tags,
  imageSide,
  image { alt, caption, "asset": asset->{url} }
\`;

const lessonCardsQuery = \`
  *[_type == "lesson" && _id == $lessonId && isActive != false] {
    _id,
    title,
    "cards": flashcards[isActive != false] | order(order asc) {
      \${embeddedCardFields}
    }
  }
\`;

const chapterCardsQuery = \`
  *[_type == "lesson" && chapter._ref == $chapterId && isActive != false]
  | order(order asc, title asc) {
    _id,
    title,
    "cards": flashcards[isActive != false] | order(order asc) {
      \${embeddedCardFields}
    }
  }
\`;

function normalizeCards(decks: LessonDeck[]): Flashcard[] {
  return decks.flatMap((lesson) =>
    (lesson.cards || []).map((card) => ({
      _id: card.legacyId || \`\${lesson._id}.\${card._key}\`,
      title: card.title,
      front: card.front,
      back: card.back,
      explanation: card.explanation,
      difficulty: card.difficulty,
      tags: card.tags,
      image: card.image,
      imageSide: card.imageSide,
      lessonId: lesson._id,
      lessonTitle: lesson.title,
    })),
  );
}`,
);

replaceExact(
  "study deck fetch",
  `    try {
      const query = scope.kind === "lesson" ? lessonCardsQuery : chapterCardsQuery;
      const params = scope.kind === "lesson" ? { lessonId: scope.lesson?._id } : { chapterId: scope.chapter._id };
      const result = await client.fetch<Flashcard[]>(query, params, { perspective: "published" });
      setCards(result);`,
  `    try {
      const query = scope.kind === "lesson" ? lessonCardsQuery : chapterCardsQuery;
      const params = scope.kind === "lesson" ? { lessonId: scope.lesson?._id } : { chapterId: scope.chapter._id };
      const result = await client.fetch<LessonDeck[]>(query, params, { perspective: "published" });
      setCards(normalizeCards(result));`,
);

writeFileSync(filePath, source);
console.log("Embedded flashcard migration applied successfully.");
