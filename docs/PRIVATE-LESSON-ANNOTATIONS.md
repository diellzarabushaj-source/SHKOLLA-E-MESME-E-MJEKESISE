# Private highlights and sticky notes

## Goal

Authenticated students can select text inside a lesson, save a private highlight, or attach a private sticky note. Guests cannot create, read, update, or delete annotations. Sanity lesson content remains public and unchanged; personal annotations live only in Neon and are scoped to the signed-in user.

## User flow

1. Open a lesson while signed in.
2. Select text inside one paragraph, heading, list item, or quotation.
3. Choose one of four highlight colors or create a sticky note.
4. The highlight appears over the original lesson without changing the Sanity document.
5. Open **Shënimet e mia** to review, recolor, edit, delete, or jump back to the selected text.
6. The same annotations load again on another device after signing in with the same account.

## Data ownership and privacy

- The API derives the user ID only from the server session.
- Client-supplied user IDs are never accepted.
- Every query and mutation includes the authenticated user ID.
- The database table has enabled and forced row-level security.
- Select, insert, update, and delete policies allow access only when `auth.uid()` matches the row owner.
- Annotation API responses use `Cache-Control: no-store`.
- Service worker rules already keep every `/api/` request network-only.

## Anchoring strategy

Each annotation stores:

- Sanity lesson ID and revision at creation time;
- Portable Text block key;
- character start/end offsets;
- selected quotation;
- short text before and after the selection.

The client first restores by block key and offsets. If an administrator edits the lesson, it falls back to quotation plus surrounding context and can still display the annotation when the text remains present. Selection is intentionally limited to one block to keep anchors deterministic and prevent broken cross-paragraph ranges.

## Rendering strategy

The lesson DOM is not rewritten. Highlights are painted as an absolute overlay from browser `Range.getClientRects()`. This avoids React hydration conflicts, preserves links and rich text, supports overlapping highlights, and keeps Sanity output untouched. Sticky-note pins are placed beside the final highlighted line.

## API

- `GET /api/annotations?lessonId=...` — private annotations for one lesson.
- `POST /api/annotations` — create or safely upsert a highlight/sticky note.
- `PATCH /api/annotations` — edit note text or color.
- `DELETE /api/annotations?id=...` — delete one annotation.

All write methods require a same-origin request and an authenticated session.

## Limits

- 500 annotations per user per lesson.
- 1,000 characters per selected quotation.
- 4,000 characters per sticky note.
- Four controlled colors.
- Duplicate anchors are upserted instead of producing duplicate rows.

## Rollout

1. Apply and verify the database migration on a temporary Neon branch.
2. Run database policy and constraint tests there.
3. Run TypeScript, production build, static security audit, navigation audit, and Chromium desktop/mobile checks.
4. Apply the verified database migration to production only after explicit approval.
5. Merge the application pull request into `main` after the production schema is ready.
