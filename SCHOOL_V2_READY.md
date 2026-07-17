# School v2 production rollout

- UI remains based on the existing `ClassicLearningPortal` template.
- Sanity dataset: `schoolv2`.
- Flashcards are embedded in `lesson.flashcards[]`.
- Portal hierarchy loads first; lesson body/audio and flashcards load on demand.
- Sanity CDN is enabled for published runtime content.
- The production workflow runs TypeScript checks and a full Next.js build before merge.
