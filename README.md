# Flashcards Mjekësi Pejë

Platformë e klasës për mësim me flashcards, e organizuar në:

- Lëndë
- Kapituj
- Flashcards

## Teknologjitë

- Next.js
- Sanity Content Lake
- Vercel

## Sanity Studio

https://www.sanity.io/@oZ3HX2fYf/studio/xwvsfazcnhh889nw18ldkuvk/default/

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

Portali live lexon përmbajtjen e publikuar nga projekti `u5d5zn7n`, dataset-i `schoolv2`. Domain-i production dhe origjinat `https://*.vercel.app` duhet të jenë të lejuara në Sanity CORS pa kredenciale, në mënyrë që klasat, lëndët, kapitujt dhe mësimet të ngarkohen nga browser-i.

Domain-i aktual production:

```text
https://shkolla-e-mesme-e-mjekesise-ct9t.vercel.app
```
