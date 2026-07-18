≠rá^—f•ñÿ¶{~,y 'v√Æ∂õ≠export type SanityAssetReference = {
  _type: "reference";
  _ref: string;
};

export type AdminImage = {
  _type?: "image";
  _key?: string;
  asset?: SanityAssetReference | { _ref?: string; _type?: string; url?: string };
  assetUrl?: string;
  alt?: string;
  caption?: string;
};

export type PortableSpan = {
  _key?: string;
  _type?: "span";
  text?: string;
  marks?: string[];
};

export type PortableNode = {
  _key?: string;
  _type?: string;
  style?: string;
  listItem?: string;
  level?: number;
  markDefs?: Array<Record<string, unknown>>;
  children?: PortableSpan[];
  [key: string]: unknown;
};

export type AdminFlashcard = {
  _key: string;
  _type?: string;
  title?: string;
  front: string;
  back: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  image?: AdminImage;
  imageSide?: "front" | "back" | "both";
  order?: number;
  isActive?: boolean;
};

export type AdminEditableLesson = {
  _id: string;
  _rev?: string;
  title: string;
  body?: PortableNode[];
  flashcards?: AdminFlashcard[];
  flashcardCount?: number;
};

export type UploadedAdminImage = {
  asset: SanityAssetReference;
  url: string;
  originalFilename: string;
};

export function createAdminKey(prefix: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random.slice(0, 24)}`;
}
