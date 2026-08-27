# Metabase Progress Dashboard

Ky integrim e mban faqen `/progress` të shpejtë me dashboard-in native të Next.js dhe shton Metabase si shtresë të avancuar analitike.

## Arkitektura

```text
Browser
  ├─ /progress
  │   ├─ /api/progress ───────────────> Neon/Postgres (të dhënat e user-it)
  │   └─ <metabase-dashboard>
  │        └─ POST /api/metabase-guest-token
  │             └─ signed JWT + locked user_id
  │
Metabase (service i ndarë)
  ├─ application DB (Postgres i vet)
  └─ read-only source ────────────────> Neon/Postgres / schema analytics
```

Parimi kryesor: **browser-i nuk vendos kurrë `user_id` që nënshkruhet**. Endpoint-i `/api/metabase-guest-token` e merr user-in nga sesioni i autentikuar dhe nënshkruan vetëm dashboard-in e konfiguruar.

## 1. Krijo analytics views në Neon

Ekzekuto:

```bash
psql "$DATABASE_URL" -f database/metabase-progress-analytics.sql
```

Krijohen vetëm views në schema `analytics`:

- `analytics.progress_overview`
- `analytics.progress_daily`
- `analytics.progress_subjects`
- `analytics.progress_lessons`
- `analytics.progress_cards`

Aplikacioni vazhdon të shkruajë vetëm në tabelat ekzistuese të progresit.

## 2. Krijo një database role vetëm për lexim

Përdor një password të fortë dhe mos e përdor user-in e aplikacionit.

```sql
CREATE ROLE metabase_analytics LOGIN PASSWORD 'REPLACE_ME';

GRANT CONNECT ON DATABASE neondb TO metabase_analytics;
GRANT USAGE ON SCHEMA analytics TO metabase_analytics;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO metabase_analytics;
```

Nëse database-i nuk quhet `neondb`, zëvendëso emrin.

Metabase data source duhet të ketë qasje te schema `analytics`, jo privilegje shkrimi në tabelat operative.

## 3. Nise Metabase

Kopjo variablat shembull në një file lokal që **nuk futet në git**:

```bash
cp .env.metabase.example .env.metabase
```

Pastaj:

```bash
docker compose --env-file .env.metabase -f docker-compose.metabase.yml up -d
```

Stack-u përdor një Postgres të veçantë për application database të Metabase. Mos përdor H2 për production.

> Default-i i këtij repo është `metabase/metabase:v0.63.15.x`. Kontrollo release-t e Metabase dhe përditëso `METABASE_IMAGE` kur del një point release më i ri i sigurisë.

## 4. Lidhe Metabase me Neon

Në Metabase:

1. **Admin → Databases → Add database → PostgreSQL**
2. Fut host/database/user/password të role-it `metabase_analytics`.
3. Kufizo schema-n te `analytics` nëse konfigurimi yt e lejon.
4. Bëj sync të schema-s.

## 5. Krijo dashboard-in “Progresi im”

Rekomandimi i kartave:

| Karta | Burimi | Vizualizimi |
|---|---|---|
| Saktësia | `progress_overview.accuracy_pct` | Number |
| Mastery | `progress_overview.mastery_pct` | Progress / Number |
| Për përsëritje | `progress_overview.due_cards` | Number |
| Koha aktive | `progress_overview.active_seconds` | Number |
| Aktiviteti ditor | `progress_daily` | Line/Bar |
| Saktësia ditore | `progress_daily.accuracy_pct` | Line |
| Performanca sipas lëndës | `progress_subjects` | Table/Bar |
| Mësimet | `progress_lessons` | Table |
| Statusi i kartelave | `progress_cards.status` | Donut/Bar |

### Filtri i detyrueshëm

Krijo një dashboard parameter me slug saktësisht:

```text
user_id
```

Lidhe këtë filter me fushën `user_id` në **çdo kartë** të dashboard-it.

Kur e publikon si Guest embed:

- vendose parameter-in `user_id` si **Locked**;
- mos e bëj Editable;
- mos publiko një variant të dytë pa këtë kufizim.

Endpoint-i i aplikacionit nënshkruan:

```json
{
  "resource": { "dashboard": 123 },
  "params": { "user_id": ["SIGNED_IN_USER_ID"] }
}
```

Kjo është barriera që kufizon çdo embed te user-i i sesionit aktual.

## 6. Aktivizo Guest embedding

Në Metabase OSS:

1. **Admin → Embedding**
2. Aktivizo **Guest embeds**
3. Hape dashboard-in → **Share → Embed → Guest**
4. Vendose `user_id` **Locked**
5. Publish
6. Kopjo ID-në numerike të dashboard-it
7. Kopjo embedding secret nga Admin → Embedding

Mos përdor Public embed për progres privat.

## 7. Vendos variablat në Vercel

Vendosi si server environment variables:

```env
METABASE_SITE_URL=https://analytics.example.com
METABASE_PROGRESS_DASHBOARD_ID=123
METABASE_EMBED_SECRET=your-guest-embedding-secret
```

`METABASE_EMBED_SECRET` nuk ka prefiks `NEXT_PUBLIC_` dhe nuk dërgohet në browser.

Pas ndryshimit të env vars, bëj redeploy të Next.js app-it.

## 8. Verifikimi para production

Kontrollo këto raste:

1. User pa login → `/progress` kërkon kyçje.
2. User i kyçur → dashboard-i native ngarkohet.
3. Metabase → shfaq vetëm rreshtat e atij user-i.
4. Ndrysho manualisht `entityId` në request → endpoint-i duhet të kthejë 403.
5. Hiq `METABASE_EMBED_SECRET` → dashboard-i native duhet të vazhdojë të punojë pa Metabase.
6. Kontrollo mobile 390px, tablet dhe desktop.
7. Kontrollo light/dark theme të portalit dhe theme-in e Guest embed.
8. Kontrollo që Metabase data-source role nuk ka INSERT/UPDATE/DELETE.

## File-t e integrimit

- `app/progress/ProgressDashboard.tsx` — dashboard native i ri.
- `app/progress/MetabaseProgressAnalytics.tsx` — Guest embed web component.
- `app/api/metabase-guest-token/route.ts` — JWT endpoint i serverit.
- `database/metabase-progress-analytics.sql` — views read-only.
- `docker-compose.metabase.yml` — stack lokal/self-hosted.
- `.env.metabase.example` — konfigurimi shembull.

## Shënim për deployment

Vercel hoston aplikacionin Next.js, por Metabase është service server-side me state dhe application database të vet. Prandaj Metabase duhet të hostohet veçmas (ose të përdoret Metabase Cloud), ndërsa `METABASE_SITE_URL` e lidh portalin me atë instance.


## Production contract

- `/progress` duhet të mbetet funksional edhe kur Metabase është offline ose i pakonfiguruar.
- Metabase përdoret vetëm si shtresë analitike; aplikacioni vazhdon të jetë burimi i vetëm i shkrimit të progresit.
- Çdo guest embed duhet të filtrohet me parameter-in e kyçur `user_id`, i nënshkruar nga sesioni i serverit.
- Production deploy duhet të konsiderohet i vlefshëm vetëm pasi Vercel build të jetë READY.
