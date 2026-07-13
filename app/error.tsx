"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="system-page">
      <section className="system-card" role="alert">
        <span className="eyebrow">Gabim i përkohshëm</span>
        <h1>Diçka nuk shkoi si duhet</h1>
        <p>Të dhënat e tua nuk janë fshirë. Provo përsëri ose kthehu në ballinë.</p>
        <div className="system-card-actions">
          <button className="primary-action" type="button" onClick={reset}>Provo përsëri</button>
          <a href="/">Kthehu në ballinë</a>
        </div>
      </section>
    </main>
  );
}
