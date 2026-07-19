import {type ReactNode} from "react";
import {PortableText, type PortableTextComponents} from "next-sanity";
import MarkdownLessonBlock from "./MarkdownLessonContent";
import learningStyles from "./MarkdownLessonContent.module.css";

type PortableSpan = {
  text?: string;
};

type PortableNode = {
  _key?: string;
  _type: string;
  style?: string;
  children?: PortableSpan[];
  [key: string]: unknown;
};

type HeadingLevel = 2 | 3 | 4;
type HeadingReason =
  | "sanity"
  | "markdown"
  | "numbered"
  | "section"
  | "uppercase"
  | "letter"
  | "parenthesized"
  | "label"
  | "colon"
  | "phrase";
type CalloutKind = "remember" | "warning" | "logic" | "definition" | "example" | "comparison";

type PlannedHeading = {
  id: string;
  level: HeadingLevel;
  reason: HeadingReason;
};

type PlannedNode = PortableNode & {
  _learningHeading?: PlannedHeading;
};

type RenderableBlock = {
  _key?: string;
  _type?: string;
  style?: string;
  children?: PortableSpan[];
  _learningHeading?: PlannedHeading;
};

type Props = {
  body?: PortableNode[];
  components: PortableTextComponents;
};

type BlockRendererProps = {
  children?: ReactNode;
  value: RenderableBlock;
};

const NUMBERED_HEADING = /^(\d+(?:\s*\.\s*\d+){0,5})\s*[.)]?\s+(.+?)\s*$/;
const MARKDOWN_HEADING = /^(#{1,6})\s+(.+)$/;
const LETTER_HEADING = /^([A-ZÇË]|[IVXLCDM]{1,7})[.)]\s+(.+)$/;
const PARENTHESIZED_HEADING = /^\(([A-ZÇËa-zçë]|[IVXLCDMivxlcdm]{1,7}|\d+)\)\s+(.+)$/;
const SECTION_HEADING = /^(KAPITULLI|PJESA|NJËSIA|TEMA|SEKSIONI|SISTEMI|MODULI)\b/i;
const CALLOUT_PREFIX = /^(Mbaje mend|Kujdes|Vërejtje|Rregull(?:i)?|Mnemonikë|Logjika(?: kryesore)?|Përkufizim(?:i)?|Shembull|Dallimi|Krahasimi|Rëndësi(?:a)?|Pika kryesore|Për provim|Këshillë|Shënim)\s*:?\s*[–—-]?\s*/i;
const LEARNING_LABEL = /^(Rruga|Skema|Rregull|Mnemonikë|Dallimi|Krahasimi|Përkufizimi|Koncepti|Anatomia|Fiziologjia|Struktura|Organizimi|Baza|Maja|Faqet|Hemi|Globina|Serumi|Vaksinat|Muri|Valvulat|Trungu|Arteria|Arteriet|Vena|Venat|Kapilarët|Sinusi|Muskujt|Fijet|Hemostaza|Koagulimi|Fibrinoliza|Funksioni|Funksionet|Ndërtimi|Përbërja|Ndarja|Klasifikimi|Roli|Rëndësia|Karakteristikat|Veçoritë|Tiparet|Mekanizmi|Procesi|Llojet|Pjesët|Pozita|Forma|Madhësia|Qarkullimi|Furnizimi|Inervimi|Veprimi|Fazat|Shkaqet|Pasojat|Simptomat|Shenjat|Diagnoza|Trajtimi|Parandalimi|Komplikimet|Etiologjia|Patogjeneza|Patofiziologjia|Epidemiologjia|Indikacionet|Kundërindikacionet|Metoda|Metodat|Lidhja|Marrëdhënia|Përmbledhja|Shtresat|Qeliza|Indet|Organet|Homeostaza|Reaksioni|Rregullimi)\b/i;
const SENTENCE_VERB = /\b(është|janë|ishte|ishin|ka|kanë|duhet|mund|përfaqëson|përfaqësojnë|përbëhet|përbëhen|ndërtohet|ndërtohen|shërben|shërbejnë|ndodhet|ndodhen|quhet|quhen|kalon|kalojnë|lidh|lidhen|studion|studiojnë|kryen|kryejnë|siguron|sigurojnë|formon|formojnë|përçon|përçojnë|transporton|transportojnë|qarkullon|qarkullojnë|fillon|fillojnë|mbaron|mbarojnë|hyn|hyjnë|del|dalin|ndahet|ndahen|vazhdon|vazhdojnë|përmban|përmbajnë|kontrollon|kontrollojnë|rregullon|rregullojnë|jep|japin|mban|mbajnë)\b/i;
const LOWERCASE_TITLE_WORDS = new Set([
  "i",
  "e",
  "të",
  "së",
  "në",
  "me",
  "nga",
  "për",
  "dhe",
  "ose",
  "tek",
  "kah",
  "mbi",
  "nën",
  "pa",
  "si",
]);

function sourceText(value: {children?: PortableSpan[]}): string {
  return (value.children || []).map((child) => typeof child.text === "string" ? child.text : "").join("").replace(/\r\n?/g, "\n");
}

function normalized(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  return normalized(value)
    .toLocaleLowerCase("sq-AL")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9çë]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 66);
}

function stableHeadingId(text: string, key: string, index: number): string {
  const keyTail = key.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || String(index + 1);
  return `seksioni-${slug(text) || "pa-titull"}-${keyTail}`;
}

function explicitLevel(style?: string): HeadingLevel | null {
  if (style === "h1" || style === "h2") return 2;
  if (style === "h3") return 3;
  if (style === "h4" || style === "h5" || style === "h6") return 4;
  return null;
}

function calloutKind(value: string): CalloutKind | null {
  const label = normalized(value).match(CALLOUT_PREFIX)?.[1]?.toLocaleLowerCase("sq-AL") || "";
  if (!label) return null;
  if (label.startsWith("kujdes") || label.startsWith("vërejtje")) return "warning";
  if (label.startsWith("logjika") || label.startsWith("rregull") || label.startsWith("mnemonik")) return "logic";
  if (label.startsWith("përkufiz")) return "definition";
  if (label.startsWith("shembull")) return "example";
  if (label.startsWith("dallim") || label.startsWith("krahasim")) return "comparison";
  return "remember";
}

function isDefinition(value: string): boolean {
  const match = normalized(value).match(/^([^:]{2,55}):\s+(.{10,})$/);
  if (!match) return false;
  const term = match[1].trim();
  return !/https?|www\.|@/.test(term) && term.split(/\s+/).length <= 8 && !/^\d+$/.test(term) && !CALLOUT_PREFIX.test(term);
}

function wordCount(value: string): number {
  return normalized(value).split(/\s+/).filter(Boolean).length;
}

function isUpperHeading(value: string): boolean {
  const text = normalized(value);
  if (text.length < 4 || text.length > 140 || /[.!?;]$/.test(text)) return false;
  const letters = text.replace(/[^A-Za-zÇËçëÀ-ž]/g, "");
  return letters.length >= 4 && text === text.toLocaleUpperCase("sq-AL") && wordCount(text) <= 16;
}

function hasStrongTitleCase(value: string): boolean {
  const meaningful = normalized(value)
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-zÇËçëÀ-ž]+|[^A-Za-zÇËçëÀ-ž-]+$/g, ""))
    .filter(Boolean)
    .filter((word) => !LOWERCASE_TITLE_WORDS.has(word.toLocaleLowerCase("sq-AL")));
  if (!meaningful.length) return false;
  const titleWords = meaningful.filter((word) => /^[A-ZÇËÀ-Ž]/.test(word)).length;
  return titleWords === meaningful.length || (meaningful.length >= 3 && titleWords / meaningful.length >= 0.75);
}

function looksLikeSentence(value: string): boolean {
  const text = normalized(value);
  const words = text.split(/\s+/).filter(Boolean);
  if (!text) return false;
  if (/^[a-zçë]/.test(text) || /[.!?;]$/.test(text)) return true;
  if ((text.match(/,/g) || []).length >= 2) return true;
  if (words.length > 16) return true;
  return words.length >= 3 && SENTENCE_VERB.test(text);
}

function looksLikeTitle(value: string): boolean {
  const text = normalized(value);
  const words = text.split(/\s+/).filter(Boolean);
  if (text.length < 3 || text.length > 110) return false;
  if (words.length < 1 || words.length > 14) return false;
  if (/https?:|www\.|@/.test(text) || /^\([^)]{2,90}\)$/.test(text)) return false;
  if (CALLOUT_PREFIX.test(text) || isDefinition(text) || looksLikeSentence(text)) return false;
  return isUpperHeading(text) || LEARNING_LABEL.test(text) || hasStrongTitleCase(text);
}

function numberedParts(value: string): {depth: number; label: string; ordinal: number} | null {
  const match = normalized(value).match(NUMBERED_HEADING);
  if (!match) return null;
  const number = match[1].replace(/\s+/g, "");
  const ordinal = Number.parseInt(number.split(".").at(-1) || "0", 10);
  return {depth: number.split(".").length, label: match[2].trim(), ordinal};
}

function isNumberedListCluster(body: PortableNode[], index: number, current: {depth: number; label: string; ordinal: number}): boolean {
  if (current.depth !== 1) return false;
  const neighbor = (offset: -1 | 1) => {
    const node = body[index + offset];
    if (!node || node._type !== "block" || sourceText(node).includes("\n")) return null;
    return numberedParts(sourceText(node));
  };
  const previous = neighbor(-1);
  const next = neighbor(1);
  const consecutive = (previous?.depth === 1 && previous.ordinal + 1 === current.ordinal)
    || (next?.depth === 1 && current.ordinal + 1 === next.ordinal);
  if (!consecutive) return false;
  return looksLikeSentence(current.label)
    || (previous ? looksLikeSentence(previous.label) : false)
    || (next ? looksLikeSentence(next.label) : false);
}

function nestedLevel(currentLevel: HeadingLevel | null): HeadingLevel {
  if (currentLevel === null) return 2;
  return currentLevel === 2 ? 3 : 4;
}

function markerDecision(text: string, currentLevel: HeadingLevel | null): {level: HeadingLevel; reason: HeadingReason} | null {
  const letter = text.match(LETTER_HEADING);
  const parenthesized = text.match(PARENTHESIZED_HEADING);
  const label = letter?.[2] || parenthesized?.[2] || "";
  if (!label || !looksLikeTitle(label)) return null;
  return {
    level: nestedLevel(currentLevel),
    reason: letter ? "letter" : "parenthesized",
  };
}

function plannedDecision(body: PortableNode[], index: number, currentLevel: HeadingLevel | null): {level: HeadingLevel; reason: HeadingReason} | null {
  const node = body[index];
  if (!node || node._type !== "block") return null;
  const raw = sourceText(node);
  const text = normalized(raw);
  if (!text || raw.includes("\n") || calloutKind(text) || isDefinition(text)) return null;

  const explicit = explicitLevel(node.style);
  if (explicit) return {level: explicit, reason: "sanity"};

  const markdown = text.match(MARKDOWN_HEADING);
  if (markdown) {
    const depth = markdown[1].length;
    return {level: depth === 1 ? 2 : depth === 2 ? 3 : 4, reason: "markdown"};
  }

  const numbered = numberedParts(text);
  if (numbered && !isNumberedListCluster(body, index, numbered) && looksLikeTitle(numbered.label)) {
    return {level: numbered.depth === 1 ? 2 : numbered.depth === 2 ? 3 : 4, reason: "numbered"};
  }

  if (SECTION_HEADING.test(text)) return {level: 2, reason: "section"};
  if (isUpperHeading(text)) return {level: 2, reason: "uppercase"};

  const marker = markerDecision(text, currentLevel);
  if (marker) return marker;

  if (LEARNING_LABEL.test(text) && looksLikeTitle(text)) {
    return {level: currentLevel && currentLevel >= 3 ? 4 : 3, reason: "label"};
  }

  const next = body[index + 1];
  if (/^[^:]{3,85}:$/.test(text) && next?._type === "block" && normalized(sourceText(next))) {
    return {level: currentLevel && currentLevel >= 3 ? 4 : 3, reason: "colon"};
  }

  if (looksLikeTitle(text)) {
    return {level: nestedLevel(currentLevel), reason: "phrase"};
  }

  return null;
}

function planBody(body: PortableNode[]): PlannedNode[] {
  let currentLevel: HeadingLevel | null = null;
  return body.map((node, index) => {
    const decision = plannedDecision(body, index, currentLevel);
    if (!decision) return node;
    currentLevel = decision.level;
    const text = sourceText(node).replace(/^#{1,6}\s+/, "");
    return {
      ...node,
      _learningHeading: {
        id: stableHeadingId(text, node._key || "block", index),
        level: decision.level,
        reason: decision.reason,
      },
    };
  });
}

function LearningBlock({children, value}: BlockRendererProps) {
  const planned = value._learningHeading;
  if (planned) {
    const Tag = planned.level === 2 ? "h2" : planned.level === 3 ? "h3" : "h4";
    return (
      <Tag
        id={planned.id}
        data-learning-heading="true"
        data-learning-level={planned.level}
        data-heading-source={planned.reason}
        data-source-preserved="true"
      >
        {children}
      </Tag>
    );
  }

  const raw = sourceText(value);
  if (!raw.includes("\n") && (value.style === undefined || value.style === "normal")) {
    const kind = calloutKind(raw);
    if (kind) {
      return <blockquote className={learningStyles.callout} data-learning-callout={kind} data-source-preserved="true">{children}</blockquote>;
    }
    if (isDefinition(raw)) {
      return <p className={learningStyles.definition} data-learning-definition="true" data-source-preserved="true">{children}</p>;
    }
    return <p data-learning-paragraph="true" data-source-preserved="true">{children}</p>;
  }

  if (value.style === "blockquote") {
    return <blockquote data-source-preserved="true">{children}</blockquote>;
  }

  return <MarkdownLessonBlock value={value}>{children}</MarkdownLessonBlock>;
}

export default function LessonContentRenderer({body = [], components}: Props) {
  const plannedBody = planBody(body);
  const existingBlocks = typeof components.block === "object" && components.block !== null ? components.block : {};
  const block = {
    ...existingBlocks,
    normal: LearningBlock,
    h1: LearningBlock,
    h2: LearningBlock,
    h3: LearningBlock,
    h4: LearningBlock,
    h5: LearningBlock,
    h6: LearningBlock,
    blockquote: LearningBlock,
  };

  return <PortableText value={plannedBody as never} components={{...components, block}} />;
}
