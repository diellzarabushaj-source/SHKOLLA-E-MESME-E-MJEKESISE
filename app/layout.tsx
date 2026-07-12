import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flashcards Mjekësi Pejë",
  description: "Platforma e klasës për mësim me flashcards, e organizuar sipas lëndëve dhe kapitujve.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sq">
      <body>
        <header className="site-header">
          <a className="brand" href="/"><span className="brand-mark">M+</span><span><b>Flashcards</b><small>Mjekësi Pejë</small></span></a>
          <nav><a href="#lendet">Lëndët</a><a href="https://flashcards-mjekesi-peje.sanity.studio/" target="_blank" rel="noreferrer">Studio</a></nav>
        </header>
        {children}
        <footer><span>Ndërtuar për klasën tonë • Shkolla e Mesme e Mjekësisë, Pejë</span><span>Powered by Sanity + Vercel</span></footer>
      </body>
    </html>
  );
}
