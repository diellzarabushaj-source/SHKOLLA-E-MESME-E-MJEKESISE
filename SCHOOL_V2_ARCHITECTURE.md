# School v2 content architecture

The visual interface remains in `app/ClassicLearningPortal.tsx`.

Before development, typechecking, or building, `scripts/build-schoolv2-portal.mjs` creates `app/SchoolLearningPortal.tsx` with the optimized data layer:

- Sanity dataset: `schoolv2`
- hierarchy: Grade → Subject → Chapter → Lesson
- flashcards: embedded objects inside `lesson.flashcards[]`
- lesson text/audio: fetched only when a lesson is opened
- flashcards: fetched only when a test starts
- public runtime requests use Sanity CDN
- flashcard progress IDs use `lessonId.arrayItemKey` for stability

The old `production` dataset remains untouched as a backup.
