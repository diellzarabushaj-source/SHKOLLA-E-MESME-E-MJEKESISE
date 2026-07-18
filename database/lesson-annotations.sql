CREATE TABLE IF NOT EXISTS public.lesson_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  lesson_id text NOT NULL,
  content_revision text,
  annotation_type text NOT NULL,
  block_key text NOT NULL,
  start_offset integer NOT NULL,
  end_offset integer NOT NULL,
  quote text NOT NULL,
  prefix text NOT NULL DEFAULT '',
  suffix text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'yellow',
  note_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lesson_annotations_kind_check CHECK (annotation_type IN ('highlight', 'note')),
  CONSTRAINT lesson_annotations_color_check CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
  CONSTRAINT lesson_annotations_offsets_check CHECK (start_offset >= 0 AND end_offset > start_offset),
  CONSTRAINT lesson_annotations_quote_check CHECK (char_length(quote) BETWEEN 1 AND 1000),
  CONSTRAINT lesson_annotations_note_check CHECK (
    (annotation_type = 'highlight' AND note_text IS NULL)
    OR
    (annotation_type = 'note' AND note_text IS NOT NULL AND char_length(btrim(note_text)) BETWEEN 1 AND 4000)
  ),
  CONSTRAINT lesson_annotations_unique_anchor UNIQUE (
    user_id,
    lesson_id,
    annotation_type,
    block_key,
    start_offset,
    end_offset
  )
);

CREATE INDEX IF NOT EXISTS lesson_annotations_user_lesson_created_idx
  ON public.lesson_annotations (user_id, lesson_id, created_at, id);

ALTER TABLE public.lesson_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_annotations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lesson_annotations_select_own ON public.lesson_annotations;
CREATE POLICY lesson_annotations_select_own
  ON public.lesson_annotations
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS lesson_annotations_insert_own ON public.lesson_annotations;
CREATE POLICY lesson_annotations_insert_own
  ON public.lesson_annotations
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS lesson_annotations_update_own ON public.lesson_annotations;
CREATE POLICY lesson_annotations_update_own
  ON public.lesson_annotations
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS lesson_annotations_delete_own ON public.lesson_annotations;
CREATE POLICY lesson_annotations_delete_own
  ON public.lesson_annotations
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_annotations TO authenticated;
