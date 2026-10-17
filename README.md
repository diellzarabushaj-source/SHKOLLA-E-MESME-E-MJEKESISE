# Flashcards Mjekësi Pejë

Platformë e klasës për mësim me flashcards, e organizuar në:

- Lëndë
- Kapituj
- Flashcards

## Teknologjitë

- Next.js
- Sanity Content Lake
- Neon/Postgres
- Vercel
- Metabase për analytics të progresit

## Sanity Studio

https://www.sanity.io/@oZ3HX2fYf/studio/xwvsfazcnhh889nw18ldkuvk/default/

## PDF / Harta mendore

Çdo kapitull ka seksion të veçantë për PDF me hapje në skedë të re dhe shkarkim.
Të gjitha PDF-të ruhen si file assets në Sanity (`u5d5zn7n/schoolv2`) dhe lidhen
me fushën `pdfResources` të kapitullit përkatës. Tri PDF-të burimore (Osteologjia,
Muskujt / Miologjia, Nyjet) i përkasin Klasës 10 → Anatomia dhe Fiziologjia e
njeriut → 2. SISTEMI LOKOMOTOR.

Për materiale të tjera: në Sanity Studio hap **Kapitujt → kapitulli përkatës →
PDF / Harta mendore**, shto titullin, skedarin PDF dhe sipas dëshirës përshkrimin
e numrin e faqeve, pastaj publiko kapitullin. Renditja e listës ruhet në portal.
Fusha e re e administrimit bëhet e disponueshme pasi të publikohet versioni i
Studio-s nga dosja `studio/`. Materialet dhe renditja e tyre menaxhohen tërësisht
në Sanity; skedarët PDF nuk ruhen në repository.

PDF-të ngarkohen vetëm kur vizitori zgjedh t'i hapë ose shkarkojë.
Kontrolli i këtij seksioni: `node --experimental-strip-types scripts/test-chapter-pdfs.mjs`.

## Zhvillimi lokal

```bash
npm install
npm run dev
```

Sanity projekti School V2 përdoret si parazgjedhje:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=u5d5zn7n
NEXT_PUBLIC_SANITY_DATASET_V2=schoolv2
```

## Editimi i mësimeve nga administratori

Administratori i autorizuar mund ta ndryshojë tekstin e mësimit direkt në portal. Kontrolli bëhet përsëri në server para çdo shkrimi në Sanity; token-i nuk dërgohet kurrë në browser.

Në Vercel duhet të konfigurohet kjo environment variable vetëm në server:

```env
SANITY_API_WRITE_TOKEN=token-me-te-drejte-editor-ne-schoolv2
```

Dataset-i i editorit merret nga `NEXT_PUBLIC_SANITY_DATASET_V2` dhe, kur mungon, përdoret `schoolv2`.

## Production dhe Sanity CORS

Portali live lexon përmbajtjen e publikuar nga projekti `u5d5zn7n`, dataset-i `schoolv2`. Këto vlera janë të fiksuara edhe në `next.config.mjs`, që një environment variable e vjetër në Vercel të mos e drejtojë portalin te projekti ose dataset-i i gabuar.

Domain-i production dhe origjinat `https://*.vercel.app` duhet të jenë të lejuara në Sanity CORS pa kredenciale, në mënyrë që klasat, lëndët, kapitujt dhe mësimet të ngarkohen nga browser-i.

Domain-i aktual production:

```text
https://shkolla-e-mesme-e-mjekesise-ct9t.vercel.app
```

## Dashboard-i i progresit + Metabase

Faqja `/progress` përdor të dhënat reale që ruhen në Neon për:

- kohën aktive;
- mësimet e hapura/përfunduara;
- study sessions;
- review events;
- spaced-repetition status;
- saktësinë, mastery, streak dhe kartelat për përsëritje.

Dashboard-i native funksionon edhe pa Metabase. Për analytics të avancuar, Metabase integrohet si **Guest embed** me JWT të nënshkruar në server dhe parameter të kyçur `user_id`.

Konfigurimi i plotë, SQL views, Docker stack dhe checklist-a e sigurisë:

`docs/METABASE_PROGRESS_DASHBOARD.md`

Environment variables të Next.js:

```env
METABASE_SITE_URL=https://analytics.example.com
METABASE_PROGRESS_DASHBOARD_ID=123
METABASE_EMBED_SECRET=server-only-secret
```

Mos e ekspozo `METABASE_EMBED_SECRET` me prefiks `NEXT_PUBLIC_`.
