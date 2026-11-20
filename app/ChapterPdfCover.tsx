"use client";

import { useState } from "react";
import styles from "./chapter-pdfs.module.css";

/**
 * Always prefer Sanity's optimized cover image. If an older or newly uploaded
 * PDF has no cover yet, show its first page with the browser's native PDF viewer
 * until the image backfill has produced a permanent thumbnail.
 */
export default function ChapterPdfCover({
  src,
  pdfUrl,
  title,
}: {
  src?: string;
  pdfUrl?: string;
  title: string;
}) {
  const [failedSource, setFailedSource] = useState<string>();

  if (src && failedSource !== src) {
    return <img
      src={src}
      alt=""
      width={260}
      height={360}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSource(src)}
    />;
  }

  return (
    <>
      <div className={styles.pdfDocumentFallback}>
        <span>Material mësimor</span>
        <strong>{title}</strong>
        <small>PDF · Lexo online</small>
      </div>
      {pdfUrl?.startsWith("https://cdn.sanity.io/files/") && (
        <iframe
          className={styles.pdfNativePreview}
          title={`Pamje paraprake e PDF-së: ${title}`}
          src={`${pdfUrl}#page=1&view=Fit&toolbar=0&navpanes=0&scrollbar=0`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </>
  );
}
