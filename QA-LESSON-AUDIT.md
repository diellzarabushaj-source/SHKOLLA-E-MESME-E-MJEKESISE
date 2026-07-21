# Auditimi QA — përvoja e mësimit

Ky raport mbulon problemet e verifikueshme në kod për layout-in e mësimit, hierarkinë semantike, progresin, navigimin, responsive states, accessibility dhe ruajtjen e përmbajtjes së Sanity-t.

> Kufizim i verifikimit: repo-ja nuk përmban një screenshot të identifikuar si “referenca e aprovuar” dhe deployment-i production i dokumentuar nuk ishte i aksesueshëm nga integrimi i lidhur Vercel. Prandaj pixel-match dhe testimi live në browser nuk deklarohen si të përfunduara.

| Severity | Zona | Dallimi konkret | Ndryshimi i bërë |
|---|---|---|---|
| High | Heading hierarchy | Sidebar-i renderonte `h2` para `h1` të mësimit në rendin e DOM-it. | Titulli i lëndës në sidebar u kthye në tekst kontekstual `strong`; workspace lidhet me H1 përmes `aria-labelledby`. |
| High | Progress bar | Vizita e të gjitha heading-ve mund ta ngrinte progresin në 100% pa përfunduar mësimin. | Progresi automatik kufizohet në 99%; 100% lejohet vetëm pas veprimit “Shëno si të përfunduar”. |
| High | Desktop navigation | Desktop navigation nuk kishte gjendje aktive dhe nuk ekspozonte `aria-current`. | Gjendja sinkronizohet me mobile navigation; linku aktiv merr `is-active` dhe `aria-current="page"`. |
| High | Hero layout | Copy, media dhe CTA mbështeteshin te CSS grid auto-placement; media mund t’i zhvendoste CTA-të në rresht të gabuar. | U vendosën grid rows/columns eksplicite; në mobile rendi është copy → CTA → media. |
| Medium | Lesson outline | Kur kishte dy ose më shumë H2, H3/H4 fshiheshin nga outline. | Outline tani përfshin H2, H3 dhe H4, me indentim dhe peshë të dallueshme për çdo nivel. |
| Medium | Resume action | “Vazhdo leximin” kthehej te heading-u aktiv, jo te seksioni i parë i palexuar. | CTA gjen `firstUnread` dhe vazhdon nga seksioni i parë i papërfunduar. |
| Medium | Keyboard focus | Rregulli i outline-it vendoste `outline: none` edhe në `:focus-visible`. | U shtua focus ring i dukshëm për outline, CTA, completion dhe summary të mobile TOC. |
| Medium | Reduced motion | Navigimi i seksioneve përdorte gjithmonë smooth scroll. | `prefers-reduced-motion: reduce` përdor scroll `auto` dhe heq tranzicionet relevante. |
| Medium | Mobile TOC | `<details>` mbetej i hapur pas zgjedhjes dhe mund të ndryshonte pozicionin e target-it. | Mobile TOC mbyllet para scroll-it te heading-u i zgjedhur. |
| Medium | Screen reader status | `aria-live` përditësohej vazhdimisht gjatë scroll-it me çdo ndryshim përqindjeje. | Live region njofton vetëm përfundimin eksplicit të mësimit. |
| Medium | Long headings | Titujt e gjatë mund të dilnin jashtë hero/outline. | U shtua `overflow-wrap: anywhere` dhe `min-width: 0` në zonat përkatëse. |
| Low | Theme toggle | `aria-label` ishte statik dhe nuk tregonte veprimin aktual. | Label-i tani është dinamik: aktivizo temën e ndritshme/errët. |
| Low | Theme persistence | `localStorage.setItem` mund të hidhte exception dhe ta ndërpriste handler-in. | Ruajtja u mbështoll me `try/catch`; ndryshimi i temës vazhdon edhe pa storage. |
| Low | Progress semantics | Progressbar kishte vetëm vlerë numerike. | U shtua `aria-valuetext` me status të lexueshëm. |

## Sanity content contract

Ndryshimet e këtij branch-i nuk prekin GROQ query-t, dokumentet e Sanity-t, mutation routes ose body blocks. Renderer-i ekzistues vazhdon të përdorë Portable Text dhe mban markerët `data-source-preserved="true"`; rregullimet janë vetëm në chrome/UI, semantikë dhe navigim.

## Rezultati i auditimit

- Përputhja vizuale e certifikuar: **N/A — mungon pamja referencë e matshme**
- Statusi strikt: **FAIL** derisa të kryhet krahasimi side-by-side dhe testimi live i desktop/tablet/mobile në të dy temat.
- Statusi i problemeve të identifikuara në kod: **të rregulluara në këtë branch**

## Pesë prioritetet kryesore të realizuara

1. H1/H2/H3/H4 dhe rendi semantik.
2. Progres 100% vetëm pas përfundimit real.
3. Layout determinist i sidebar/hero/CTA/media.
4. Gjendje aktive dhe `aria-current` në desktop/mobile navigation.
5. Keyboard focus, reduced motion dhe mobile TOC.
