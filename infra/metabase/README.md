# Metabase production host

This directory contains the production container definition used by `render.yaml`.

## Why this is separate from Vercel

The school portal remains on Vercel. Metabase is a stateful JVM service and runs as a separate Docker web service. Its own application state is stored in the dedicated Neon database `metabase_app`.

## Render configuration

The Blueprint creates:

- one Docker web service in Frankfurt;
- 1 CPU / 2 GB RAM;
- health check at `/api/health`;
- `MB_SITE_URL` wired automatically to Render's external HTTPS URL;
- modular guest embedding enabled;
- public sharing disabled;
- a generated Metabase encryption key.

The Blueprint intentionally prompts for two secrets and never stores them in git:

1. `MB_DB_CONNECTION_URI`
2. `MB_EMBEDDING_SECRET_KEY`

### MB_DB_CONNECTION_URI

Use the dedicated `metabase_app` database and `metabase_app_owner` role.

The expected shape is:

```text
jdbc:postgresql://<NEON_HOST>:5432/metabase_app?sslmode=require
```

Set the database username/password separately in the JDBC URI only if the hosting secret store requires it, or use the equivalent Metabase DB user/password environment variables.

### MB_EMBEDDING_SECRET_KEY

Generate one strong random secret in the Render secret prompt.

The **same value** must be saved in the Vercel project as:

```text
METABASE_EMBED_SECRET
```

Do not commit this value anywhere.

## After the first healthy boot

1. Open the Render Metabase URL.
2. Complete the Metabase admin setup.
3. Connect the analytics data source to the main Neon database using `metabase_analytics`.
4. Restrict the data source to schema `analytics`.
5. Create the dashboard from `docs/METABASE_DASHBOARD_BLUEPRINT.md`.
6. Add a dashboard parameter named exactly `user_id`.
7. Bind `user_id` to every card and set it Locked in the Guest embed.
8. Save the dashboard numeric ID in Vercel as `METABASE_PROGRESS_DASHBOARD_ID`.
9. Save the Render URL in Vercel as `METABASE_SITE_URL`.

The Next.js portal will then enable the Metabase section automatically.
