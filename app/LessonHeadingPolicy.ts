export type LessonHeadingLevel = 2 | 3 | 4;

const NUMBERED_HEADING = /^\d+(?:\.\d+){0,5}\.?\s+\S/;
const LETTER_HEADING = /^(?:[A-ZÇË]|[IVXLCDM]{1,7})[.)]\s+\S/i;
const SECTION_HEADING = /^(KAPITULLI|PJESA|NJËSIA|TEMA|SEKSIONI)\b/i;
const CONNECTIVE_OR_PROSE_LABEL = /^(?:pra|kështu|prandaj|andaj|domethënë|me fjalë të tjera|kjo do të thotë|sipas librit|sipas tekstit|siç shihet|si rezultat|në këtë mënyrë|funksioni i (?:tyre|saj|tij)|funksionet e (?:tyre|saj|tij)|përfundimisht)\b/i;
const UNSAFE_INFERRED_SOURCES = new Set(["label", "colon", "phrase"]);

export function normalizeLessonHeadingText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isUppercaseSection(value: string): boolean {
  const letters = value.replace(/[^A-Za-zÇËçëÀ-ž]/g, "");
  return letters.length >= 4 && value === value.toLocaleUpperCase("sq-AL");
}

export function isLikelyLessonHeadingText(value: string): boolean {
  const text = normalizeLessonHeadingText(value);
  if (text.length < 3 || text.length > 120) return false;
  if (/https?:|www\.|@/.test(text)) return false;
  if (/^\([^)]*\)$/.test(text)) return false;
  if (CONNECTIVE_OR_PROSE_LABEL.test(text)) return false;

  // Numbered, lettered and explicit section titles remain valid even when phrased as questions.
  if (NUMBERED_HEADING.test(text) || LETTER_HEADING.test(text) || SECTION_HEADING.test(text) || isUppercaseSection(text)) {
    return true;
  }

  // A colon/comma/semicolon/full stop at the end identifies a lead-in or prose sentence, not an outline title.
  if (/[:,;.]$/.test(text)) return false;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 14) return false;
  if (!/^[A-ZÇËÀ-Ž0-9]/.test(text)) return false;
  return /[A-Za-zÇËçëÀ-ž]/.test(text);
}

export function isLessonOutlineHeading(value: string, source?: string): boolean {
  if (source && UNSAFE_INFERRED_SOURCES.has(source)) return false;
  return isLikelyLessonHeadingText(value);
}

export function sanitizedPortableHeadingLevel(style: string | undefined, value: string): LessonHeadingLevel | null {
  if (!style || !/^h[1-6]$/.test(style)) return null;
  if (!isLikelyLessonHeadingText(value)) return null;
  if (style === "h1" || style === "h2") return 2;
  if (style === "h3") return 3;
  return 4;
}
