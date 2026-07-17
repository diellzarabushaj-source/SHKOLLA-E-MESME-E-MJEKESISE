import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "app/ClassicLearningPortal.tsx";
const outputPath = "app/SchoolLearningPortal.tsx";
let source = readFileSync(sourcePath, "utf8");

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
  "Sanity client",
  `const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-13",
  useCdn: false,
});`,
  `const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_V2 || "schoolv2",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-17",
  useCdn: true,
});`,
);

replaceExact(
  "Sanity queries",
  `const portalQuery = \`
  *[_type == "grade" && isActive != false] | order(order asc, gradeNumber asc) {
    _id,
    title,
    gradeNumber,
    "slug": slug.current,
    shortDescription,
    icon,
    "subjects": *[_type == "subject" && grade._ref == ^._id && isActive != false]
      | order(order asc, title asc) {
        _id,
        title,
        "slug": slug.current,
        shortDescription,
        emoji,
        "chapters": *[_type == "chapter" && subject._ref == ^._id && isActive != false]
          | order(order asc, title asc) {
            _id,
            title,
            "slug": slug.current,
            summary,
            coverImage { alt, "asset": asset->{url} },
            "lessons": *[_type == "lesson" && chapter._ref == ^._id && isActive != false]
              | order(order asc, title asc) {
                _id,
                title,
                "slug": slug.current,
                summary,
                coverImage { alt, "asset": asset->{url} },
                recording {
                  title,
                  "url": asset->url,
                  "originalFilename": asset->originalFilename
                },
                body[] {
                  ...,
                  _type == "image" => {
                    alt,
                    caption,
                    "asset": asset->{url}
                  }
                },
                "flashcardCount": count(*[
                  _type == "flashcard" &&
                  lesson._ref == ^._id &&
                  isActive != false
                ])
              }
          }
      }
  }
\`;

const cardFields = \`
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
  `const portalQuery = \`
  *[_type == "grade" && status != "hidden"] | order(order asc, gradeNumber asc) {
    _id,
    title,
    gradeNumber,
    "slug": slug.current,
    shortDescription,
    icon,
    "subjects": *[_type == "subject" && grade._ref == ^._id && status != "hidden"]
      | order(order asc, title asc) {
        _id,
        title,
        "slug": slug.current,
        shortDescription,
        emoji,
        "chapters": *[_type == "chapter" && subject._ref == ^._id && status != "hidden"]
          | order(order asc, title asc) {
            _id,
            title,
            "slug": slug.current,
            summary,
            coverImage { alt, "asset": asset->{url} },
            "lessons": *[_type == "lesson" && chapter._ref == ^._id && status != "hidden"]
              | order(order asc, title asc) {
                _id,
                title,
                "slug": slug.current,
                summary,
                coverImage { alt, "asset": asset->{url} },
                "flashcardCount": count(flashcards[status != "hidden"])
              }
          }
      }
  }
\`;

const lessonDetailsQuery = \`
  *[_type == "lesson" && _id == $lessonId && status != "hidden"][0] {
    _id,
    title,
    "slug": slug.current,
    summary,
    coverImage { alt, "asset": asset->{url} },
    recording {
      title,
      "url": asset.asset->url,
      "originalFilename": asset.asset->originalFilename
    },
    body[] {
      ...,
      _type == "image" => {
        alt,
        caption,
        "asset": asset->{url}
      }
    },
    "flashcardCount": count(flashcards[status != "hidden"])
  }
\`;

const embeddedCardFields = \`
  _key,
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
  *[_type == "lesson" && _id == $lessonId && status != "hidden"] {
    _id,
    title,
    "cards": flashcards[status != "hidden"] | order(order asc) {
      \${embeddedCardFields}
    }
  }
\`;

const chapterCardsQuery = \`
  *[_type == "lesson" && chapter._ref == $chapterId && status != "hidden"]
  | order(order asc, title asc) {
    _id,
    title,
    "cards": flashcards[status != "hidden"] | order(order asc) {
      \${embeddedCardFields}
    }
  }
\`;

function normalizeCards(decks: LessonDeck[]): Flashcard[] {
  return decks.flatMap((lesson) =>
    (lesson.cards || []).map((card) => ({
      _id: \`${lesson._id}.\${card._key}\`,
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
  "lazy lesson loading",
  `  function chooseLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    resetStudy();
    scrollTop();
  }`,
  `  async function chooseLesson(lesson: Lesson) {
    setLoading(true);
    setError("");
    resetStudy();

    try {
      const details = await client.fetch<Lesson | null>(
        lessonDetailsQuery,
        { lessonId: lesson._id },
        { perspective: "published" },
      );
      setSelectedLesson(details || lesson);
    } catch (fetchError) {
      console.error(fetchError);
      setSelectedLesson(lesson);
      setError("Mësimi nuk mund të ngarkohej plotësisht. Provo përsëri.");
    } finally {
      setLoading(false);
    }

    scrollTop();
  }`,
);

replaceExact(
  "embedded deck loading",
  `      const result = await client.fetch<Flashcard[]>(query, params, { perspective: "published" });
      setCards(result);`,
  `      const result = await client.fetch<LessonDeck[]>(query, params, { perspective: "published" });
      setCards(normalizeCards(result));`,
);

source = source.replace(
  `"use client";`,
  `"use client";\n\n// Generated from ClassicLearningPortal.tsx. Keep UI edits in the template file.`,
);

writeFileSync(outputPath, source);
console.log(`Generated ${outputPath} with the School v2 Sanity data layer.`);
