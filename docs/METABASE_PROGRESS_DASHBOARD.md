# Metabase Progress Dashboard

Ky është kontrakti i vetëm production për analitikën e progresit.

## Gjendja reale

- Next.js dashboard-i native lexon progresin direkt nga Neon dhe mbetet gjithmonë funksional.
- Schema `analytics` është krijuar në Neon dhe është source-of-truth për Metabase.
- Metabase përdor **Guest embedding** me JWT të nënshkruar server-side.
- Çdo embed filtrohet me `user_id` të kyçur; browser-i nuk vendos kurrë user-in që nënshkruhet.
- Një instance Metabase duhet të jetë hostuar veçmas ose në Metabase Cloud. Vercel hoston vetëm portalin Next.js.

## Arkitektura

```text
Browser
  └─ /progress
      ├─ /api/progress ─────────────────────> Neon / public progress tables
      └─ <metabase-dashboard>
           └─ POST /api/metabase-guest-token
                └─ JWT: dashboard + locked user_id

Metabase service
  ├─ application DB e Metabase
  └─ read-only data source ─────────────────> Neon / analytics schema
```

## Analytics layer në Neon

Source file: `database/metabase-progress-analytics.sql`

Views:

- `analytics.progress_overview`
- `analytics.progress_daily`
- `analytics.progress_weekly`
- `analytics.progress_ratings`
- `analytics.progress_subjects`
- `analytics.progress_lessons`
- `analytics.progress_cards`

Ato përfshijnë:

- accuracy dhe mastery
- current streak
- kartela due tani dhe brenda 24 orëve
- fragile cards
- active time / active days
- daily dhe weekly learning velocity
- Again / Hard / Good / Easy distribution
- performance sipas lëndës
- completion dhe engagement sipas mësimit
- response time

## Database user për Metabase

Metabase duhet të lidhet me Neon përmes një roli read-only, jo me user-in e aplikacionit.

Source file: `database/metabase-readonly-role.sql`.

Production database e ka tashmë rolin `metabase_analytics` me:
- `NOLOGIN` derisa të ekzistojë host-i Metabase;
- `USAGE` vetëm në schema `analytics`;
- `SELECT` në analytics views;
- pa `INSERT` / `UPDATE` / `DELETE`.

Kur host-i Metabase të jetë gati, krijo password-in në secret store të hostit dhe aktivizo login-in pa e futur secret-in në git:

```sql
ALTER ROLE metabase_analytics LOGIN PASSWORD 'SET_FROM_SECRET_STORE';
```

## Dashboard-i “Progresi im”

Përdor blueprint-in e saktë te:

`docs/METABASE_DASHBOARD_BLUEPRINT.md`

Çdo question/card duhet të ketë filterin `user_id`.

### Filteri i detyrueshëm

Dashboard parameter slug:

```text
user_id
```

Lidhe me `user_id` në **çdo** card/question dhe në Guest embed vendose **Locked**.

Endpoint-i i portalit nënshkruan vetëm dashboard-in e konfiguruar:

```json
{
  "resource": { "dashboard": 123 },
  "params": { "user_id": ["SIGNED_IN_USER_ID"] }
}
```

Request-i që provon një dashboard ID tjetër refuzohet me 403.

## Konfigurimi i Metabase

1. Nise/hostoje Metabase.
2. Admin → Databases → Add database → PostgreSQL.
3. Lidhe me Neon duke përdorur rolin read-only.
4. Lejo schema `analytics`.
5. Bëj schema sync.
6. Admin → Embedding → aktivizo modular/guest embedding.
7. Krijo dashboard-in “Progresi im” sipas blueprint-it.
8. Share → Embed → Guest.
9. Vendose `user_id` si **Locked**.
10. Publish dhe kopjo numeric dashboard ID + embedding secret.

Mos përdor Public embed për progres privat.

## Vercel environment variables

Canonical variables:

```env
METABASE_SITE_URL=https://analytics.example.com
METABASE_PROGRESS_DASHBOARD_ID=123
METABASE_EMBED_SECRET=your-guest-embedding-secret
```

Për backward compatibility, aplikacioni pranon edhe:

- `METABASE_INSTANCE_URL` si alias të URL-së
- `METABASE_DASHBOARD_ID` si alias të dashboard ID

`METABASE_EMBED_SECRET` është server-only dhe nuk duhet të ketë prefiks `NEXT_PUBLIC_`.

Pas ndryshimit të env vars duhet redeploy.

## Diagnostika

Për administratorin, `/progress` shfaq statusin e integrimit kur Metabase nuk është aktiv.

Endpoint:

`GET /api/admin/metabase-status`

Kontrollon pa ekspozuar secrets:

- analytics schema
- site URL
- dashboard ID
- embed secret
- reachability të `/api/health`

Kjo heq silent failure: admini sheh saktë çfarë mungon.

## Verifikimi production

1. User pa login → `/progress` kërkon kyçje.
2. User i kyçur → native dashboard ngarkohet me të dhënat e tij.
3. Metabase → vetëm rows me `user_id` e sesionit.
4. Ndrysho `entityId` në request → 403.
5. Hiq embed secret → native dashboard vazhdon normalisht; admini sheh “Setup required”.
6. Metabase offline → native dashboard vazhdon; embed shfaq error të kontrolluar.
7. Testo 390px, tablet, desktop.
8. Metabase DB user nuk ka INSERT / UPDATE / DELETE.
