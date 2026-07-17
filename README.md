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

https://flashcards-mjekesi-peje.sanity.studio/

## Zhvillimi lokal

```bash
npm install
npm run dev
```

Sanity projekti publik përdoret si parazgjedhje:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=e1tm3f7l
NEXT_PUBLIC_SANITY_DATASET=production
```

## Editimi i mësimeve nga administratori

Administratori i autorizuar mund ta ndryshojë tekstin e mësimit direkt në portal. Kontrolli bëhet përsëri në server para çdo shkrimi në Sanity; token-i nuk dërgohet kurrë në browser.

Në Vercel duhet të konfigurohet kjo environment variable vetëm në server:

```env
SANITY_API_WRITE_TOKEN=token-me-te-drejte-editor-ne-schoolv2
```

Dataset-i i editorit merret nga `NEXT_PUBLIC_SANITY_DATASET_V2` dhe, kur mungon, përdoret `schoolv2`.
