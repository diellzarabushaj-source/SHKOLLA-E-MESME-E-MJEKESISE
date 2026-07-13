export default function Loading() {
  return (
    <main className="system-page" aria-busy="true" aria-live="polite">
      <section className="system-card">
        <div className="system-loader" aria-hidden="true" />
        <h1>Duke ngarkuar portalin</h1>
        <p>Po përgatisim mësimet, flashcards dhe progresin tënd.</p>
      </section>
    </main>
  );
}
