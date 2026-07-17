import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "app/ClassicLearningPortal.tsx";
const outputPath = "app/SchoolLearningPortal.tsx";
let source = readFileSync(sourcePath, "utf8");

function replacePattern(label, pattern, replacement) {
  const matches = source.match(pattern);
  if (!matches) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(pattern, replacement);
}

replacePattern(
  "flashcard data types",
  /type Flashcard = \{[\s\S]*?\n\};\n\ntype Lesson =/,
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
};

type Lesson =`,
);

replacePattern(
  "Sanity client",
  /const client = createClient\(\{[\s\S]*?\n\}\);/,
  `const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_V2 || "schoolv2",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-17",
  useCdn: true,
});`,
);

const optimizedDataLayer = `const portalQuery = \`
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

const lessonCardsQuery = \`
  *[_type == "lesson" && _id == $lessonId && status != "hidden"] {
    _id,
    title,
    "cards": flashcards[status != "hidden"] | order(order asc) {
      _key,
      title,
      front,
      back,
      explanation,
      difficulty,
      tags,
      imageSide,
      image { alt, caption, "asset": asset->{url} }
    }
  }
\`;

const chapterCardsQuery = \`
  *[_type == "lesson" && chapter._ref == $chapterId && status != "hidden"]
  | order(order asc, title asc) {
    _id,
    title,
    "cards": flashcards[status != "hidden"] | order(order asc) {
      _key,
      title,
      front,
      back,
      explanation,
      difficulty,
      tags,
      imageSide,
      image { alt, caption, "asset": asset->{url} }
    }
  }
\`;

function normalizeCards(decks: LessonDeck[]): Flashcard[] {
  return decks.flatMap((lesson) =>
    (lesson.cards || []).map((card) => ({
      _id: lesson._id + "." + card._key,
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
}`;

replacePattern(
  "Sanity data layer",
  /const portalQuery = `[\s\S]*?const portableTextComponents: PortableTextComponents =/,
  optimizedDataLayer + "\n\nconst portableTextComponents: PortableTextComponents =",
);

replacePattern(
  "lazy lesson loading",
  /  function chooseLesson\(lesson: Lesson\) \{[\s\S]*?\n  \}\n\n  async function startTest/,
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
  }

  async function startTest`,
);

replacePattern(
  "embedded deck loading",
  /      const result = await client\.fetch<Flashcard\[\]>\(query, params, \{ perspective: "published" \}\);\n      setCards\(result\);/,
  `      const result = await client.fetch<LessonDeck[]>(query, params, { perspective: "published" });
      setCards(normalizeCards(result));`,
);

source = source.replace(
  `"use client";`,
  `"use client";\n\n// Generated from ClassicLearningPortal.tsx. Keep all UI changes in the template file.`,
);

writeFileSync(outputPath, source);
console.log(`Generated ${outputPath} with the optimized School v2 data layer.`);
