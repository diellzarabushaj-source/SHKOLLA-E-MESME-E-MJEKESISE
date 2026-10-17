export type ChapterPdf = {
  _key: string;
  title: string;
  description?: string;
  pageCount?: number;
  url?: string;
  originalFilename?: string;
  size?: number;
};

export function isPdfUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cdn.sanity.io"
      && url.pathname.startsWith("/files/") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function chapterPdfs(resources?: ChapterPdf[] | null): ChapterPdf[] {
  const seen = new Set<string>();
  return (resources || []).filter((pdf) => {
    if (!isPdfUrl(pdf.url) || seen.has(pdf.url)) return false;
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
