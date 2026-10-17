export type ChapterPdf = {
  _key: string;
  title: string;
  description?: string;
  pageCount?: number;
  url?: string;
  originalFilename?: string;
  size?: number;
  coverUrl?: string;
};

export function isPdfUrl(value: string | undefined): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cdn.sanity.io"
      && url.pathname.startsWith("/files/") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function chapterPdfs(resources?: readonly (ChapterPdf | null | undefined)[] | null): ChapterPdf[] {
  const seen = new Set<string>();
  return (Array.isArray(resources) ? resources : []).filter((pdf): pdf is ChapterPdf => {
    if (!pdf || typeof pdf !== "object" || !isPdfUrl(pdf.url) || seen.has(pdf.url)) return false;
    seen.add(pdf.url);
    return true;
  });
}

export function pdfDownloadUrl(pdf: ChapterPdf): string {
  if (!isPdfUrl(pdf.url)) return "";
  const url = new URL(pdf.url);
  url.searchParams.set("dl", pdf.originalFilename || "material.pdf");
  return url.toString();
}

export function pdfCoverUrl(value?: string): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "cdn.sanity.io" || !url.pathname.startsWith("/images/") || url.username || url.password) return undefined;
    url.searchParams.set("w", "360");
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    return url.toString();
  } catch { return undefined; }
}
