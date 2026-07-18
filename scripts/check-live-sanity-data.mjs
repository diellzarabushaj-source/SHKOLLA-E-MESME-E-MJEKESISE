import { createClient } from "next-sanity";

const client = createClient({
  projectId: "u5d5zn7n",
  dataset: "schoolv2",
  apiVersion: "2026-07-17",
  useCdn: false,
});

const query = `
  *[_type == "grade" && isActive != false] | order(order asc) {
    _id,
    "subjects": *[_type == "subject" && grade._ref == ^._id && isActive != false] {
      _id,
      "chapters": *[_type == "chapter" && subject._ref == ^._id && isActive != false] {
        _id,
        "lessons": *[_type == "lesson" && chapter._ref == ^._id && isActive != false] {
          _id
        }
      }
    }
  }
`;

const grades = await client.fetch(query, {}, { perspective: "published" });
if (!Array.isArray(grades)) throw new Error("Live Sanity portal query did not return an array");

const counts = grades.reduce(
  (total, grade) => {
    const subjects = Array.isArray(grade.subjects) ? grade.subjects : [];
    total.subjects += subjects.length;
    for (const subject of subjects) {
      const chapters = Array.isArray(subject.chapters) ? subject.chapters : [];
      total.chapters += chapters.length;
      for (const chapter of chapters) {
        total.lessons += Array.isArray(chapter.lessons) ? chapter.lessons.length : 0;
      }
    }
    return total;
  },
  { grades: grades.length, subjects: 0, chapters: 0, lessons: 0 },
);

if (counts.grades < 3 || counts.subjects < 1 || counts.chapters < 1 || counts.lessons < 1) {
  throw new Error(`Live Sanity hierarchy is incomplete: ${JSON.stringify(counts)}`);
}

console.log(`Live Sanity hierarchy passed: ${counts.grades} classes, ${counts.subjects} subjects, ${counts.chapters} chapters, ${counts.lessons} lessons.`);
