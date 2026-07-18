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
    <html lang="sq">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#07111f",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <section
            role="alert"
            aria-live="assertive"
            style={{
              width: "min(100%, 620px)",
              padding: 28,
              border: "1px solid rgba(148, 163, 184, 0.28)",
              borderRadius: 22,
              background: "rgba(15, 23, 42, 0.96)",
              boxShadow: "0 24px 70px rgba(0, 0, 0, 0.32)",
            }}
          >
            <p style={{ margin: "0 0 8px", color: "#93c5fd", fontWeight: 700 }}>
              Gabim i aplikacionit
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}>
              Portali nuk mundi ta hapte këtë faqe
            </h1>
            <p style={{ margin: "0 0 24px", color: "#cbd5e1", lineHeight: 1.65 }}>
              Provo përsëri. Nëse problemi vazhdon, kthehu në ballinë; kjo rrugë funksionon edhe kur pjesa tjetër e aplikacionit ka dështuar.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  minHeight: 46,
                  padding: "0 18px",
                  border: 0,
                  borderRadius: 12,
                  background: "#2563eb",
                  color: "white",
                  font: "inherit",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Provo përsëri
              </button>
              <a
                href="/"
                style={{
                  minHeight: 46,
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0 18px",
                  border: "1px solid rgba(148, 163, 184, 0.45)",
                  borderRadius: 12,
                  color: "#f8fafc",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Kthehu në ballinë
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
