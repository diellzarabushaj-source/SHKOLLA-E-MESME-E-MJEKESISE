# Auditimi QA — përvoja e mësimit

Ky raport mbulon problemet e verifikueshme në kod për layout-in e mësimit, hierarkinë semantike, progresin, navigimin, responsive states, accessibility dhe ruajtjen e përmbajtjes së Sanity-t.

> Kufizim i vetëm i mbetur: repo-ja dhe kërkesa nuk përmbajnë një screenshot/skedar të identifikuar si “referenca e aprovuar”. Prandaj një përqindje pixel-to-pixel kundrejt referencës nuk mund të matet pa shpikur rezultat. Implementimi është testuar në browser dhe në build real.

| Severity | Zona | Dallimi konkret | Ndryshimi CSS/React i bërë |
|---|---|---|---|
| High | Heading hierarchy | Sidebar-i renderonte `h2` para `h1` të mësimit në rendin e DOM-it. | Titulli i lëndës në sidebar u kthye në tekst kontekstual `strong`; workspace lidhet me H1 përmes `aria-labelledby`. |
| High | Progress bar | Vizita e të gjitha heading-ve mund ta ngrinte progresin në 100% pa përfunduar mësimin. | Progresi automatik kufizohet në 99%; 100% lejohet vetëm pas veprimit “Shëno si të përfunduar”. |
| High | Desktop navigation | Desktop navigation nuk kishte gjendje aktive dhe nuk ekspozonte `aria-current`. | Gjendja sinkronizohet me mobile navigation; linku aktiv merr `is-active` dhe `aria-current="page"`. |
| High | Hero layout | Copy, media dhe CTA mbështeteshin te CSS grid auto-placement; media mund t’i zhvendoste CTA-të në rresht të gabuar. | U vendosën grid rows/columns eksplicite; në mobile rendi është copy → CTA → media. |
| High | Build/QA pipeline | Workflow-i përdorte `npm`, ndërsa `prebuild` thërriste `pnpm`; build-i dështonte me `pnpm: not found`. | Skriptet e brendshme tani përdorin `npm run`, prandaj funksionojnë në runner-in aktual dhe mbeten të përdorshme edhe në projekt me `packageManager: pnpm`. |
| Medium | Lesson outline | Kur kishte dy ose më shumë H2, H3/H4 fshiheshin nga outline. | Outline tani përfshin H2, H3 dhe H4, me indentim dhe peshë të dallueshme për çdo nivel. |
| Medium | Resume action | “Vazhdo leximin” kthehej te heading-u aktiv, jo te seksioni i parë i palexuar. | CTA gjen `firstUnread` dhe vazhdon nga seksioni i parë i papërfunduar. |
| Medium | Keyboard focus | Rregulli i outline-it vendoste `outline: none` edhe në `:focus-visible`. | U shtua focus ring i dukshëm për outline, CTA, completion dhe summary të mobile TOC. |
| Medium | Reduced motion | Navigimi i seksioneve përdorte gjithmonë smooth scroll. | `prefers-reduced-motion: reduce` përdor scroll `auto` dhe heq tranzicionet relevante. |
| Medium | Mobile TOC | `<details>` mbetej i hapur pas zgjedhjes dhe mund të ndryshonte pozicionin e target-it. | Mobile TOC mbyllet para scroll-it te heading-u i zgjedhur dhe heading-u merr fokus. |
| Medium | Screen reader status | `aria-live` përditësohej vazhdimisht gjatë scroll-it me çdo ndryshim përqindjeje. | Live region njofton vetëm përfundimin eksplicit të mësimit. |
| Medium | Long headings | Titujt e gjatë mund të dilnin jashtë hero/outline. | U shtua `overflow-wrap: anywhere` dhe `min-width: 0` në zonat përkatëse. |
| Medium | Test contracts | E2E kërkonte etiketa të vjetra dhe fixture-i krijonte H1 të dyfishtë / callback Server→Client. | Fixture-i u nda në client wrapper; testet përdorin CTA-në reale dhe breakpoint-et reale. |
| Low | Theme toggle | `aria-label` ishte statik dhe nuk tregonte veprimin aktual. | Label-i tani është dinamik: aktivizo temën e ndritshme/errët; u shtua `aria-pressed`. |
| Low | Theme persistence | `localStorage.setItem` mund të hidhte exception dhe ta ndërpriste handler-in. | Ruajtja u mbështoll me `try/catch`; ndryshimi i temës vazhdon edhe pa storage. |
| Low | Progress semantics | Progressbar kishte vetëm vlerë numerike. | U shtua `aria-valuetext` me status të lexueshëm. |

## Verifikimi në browser dhe CI

- Desktop: **1280×900** dhe flow i navigimit **1440×1000**.
- Tablet: **820×1180**; sidebar-i desktop fshihet dhe outline kompakt shfaqet.
- Mobile: **390×844**; rendi copy → CTA → media dhe mobile TOC verifikohen.
- Dark/light mode: toggle, `data-theme` dhe persistence në `localStorage` verifikohen.
- Overflow: `scrollWidth <= clientWidth` verifikohet në desktop, tablet dhe mobile.
- Accessibility: H1 i vetëm, rend H1→H2/H3/H4, focus target, `aria-current`, progress semantics dhe reduced-motion.
- Navigim: Home, Klasat, Progresi, Back/Forward, study mode, 404 escape dhe CTA “Hap flashcards”.
- Sanity: teksti i fixture-it krahasohet karakter për karakter; markerët e source-preservation kontrollohen.
- Build check, data-layer, hierarchy browser audit, admin browser audit, annotations browser audit dhe deep navigation browser audit: **SUCCESS**.
- Vercel preview për commit-in final: **SUCCESS**.

## Sanity content contract

Ndryshimet e këtij branch-i nuk prekin GROQ query-t, dokumentet e Sanity-t, mutation routes ose body blocks. Renderer-i ekzistues vazhdon të përdorë Portable Text dhe mban markerët `data-source-preserved="true"`; rregullimet janë vetëm në chrome/UI, semantikë, progres, tema dhe navigim.

## Rezultati i auditimit

- Përputhja funksionale e assertions të automatizuara: **100% — të gjitha kontrollet kaluan**.
- Përputhja vizuale pixel-to-pixel me referencën: **N/A — pamja referencë nuk është dhënë/identifikuar**.
- Statusi i implementimit ndaj kritereve funksionale të kërkuara: **PASS**.
- Statusi strikt i kërkesës “krahaso majtas me djathtas”: **FAIL**, vetëm sepse mungon referenca e matshme; nuk ka problem Critical/High të njohur të pambyllur në branch.

## Pesë rregullimet me prioritetin më të lartë

1. H1/H2/H3/H4 dhe rendi semantik.
2. Progres 100% vetëm pas përfundimit real.
3. Layout determinist i sidebar/hero/CTA/media në desktop, tablet dhe mobile.
4. Gjendje aktive dhe `aria-current` në desktop/mobile navigation.
5. Keyboard focus, dark/light mode, reduced motion dhe mobile TOC.
