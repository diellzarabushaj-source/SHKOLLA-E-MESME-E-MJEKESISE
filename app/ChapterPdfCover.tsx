"use client";

import { useState } from "react";

export default function ChapterPdfCover({ src }: { src?: string }) {
  const [failedSource, setFailedSource] = useState<string>();

  return (
    <>
      <svg viewBox="0 0 48 56" fill="none"><path d="M9 2h21l13 13v37a2 2 0 0 1-2 2H9a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="2"/><path d="M29 2v14h14M15 29h18M15 36h18M15 43h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      {src && failedSource !== src && <img src={src} alt="" width={260} height={360} loading="lazy" decoding="async" onError={() => setFailedSource(src)} />}
    </>
  );
}
