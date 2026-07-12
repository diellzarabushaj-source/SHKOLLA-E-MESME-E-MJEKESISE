import type { Metadata } from "next";
import ThemeToggle from "./ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flashcards Mjekësi Pejë",
  description: "Platforma e klasës për mësim me flashcards, e organizuar sipas lëndëve dhe kapitujve.",
};

const themeScript = `
  try {
    const saved = localStorage.getItem("flashcards-theme");
    const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
  }
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <header className="site-header">
          <a className="brand" href="/" aria-label="Flashcards Mjekësi Pejë - Ballina">
            <span className="brand-mark">M+</span>
            <span><b>Flashcards</b><small>Mjekësi Pejë</small></span>
          </a>
          <div className="header-actions">
            <nav>
              <a href="/#lendet">Lëndët</a>
              <a href="https://flashcards-mjekesi-peje.sanity.studio/" target="_blank" rel="noreferrer">Studio</a>
            </nav>
            <ThemeToggle />
          </div>
        </header>
        {children}
        <footer><span>Ndërtuar për klasën tonë • Shkolla e Mesme e Mjekësisë, Pejë</span><span>Sanity + Vercel</span></footer>
      </body>
    </html>
  );
}
