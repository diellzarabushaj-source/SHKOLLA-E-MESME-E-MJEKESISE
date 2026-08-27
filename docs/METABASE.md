# Metabase dashboard integration

The student progress dashboard can optionally render an authenticated Metabase dashboard.

## Required Vercel environment variables

- `METABASE_INSTANCE_URL` — full Metabase URL, for example `https://analytics.example.com`
- `METABASE_DASHBOARD_ID` — numeric dashboard ID to embed
- `METABASE_JWT_SHARED_SECRET` — JWT signing key generated in Metabase

No Metabase secret is exposed to the browser. The browser calls `/api/sso/metabase`, which signs a short-lived JWT on the server for the currently authenticated user.

If the instance URL or dashboard ID is missing, the existing progress dashboard keeps working and the Metabase section is not rendered.

## Metabase-side setup

1. Enable Modular embedding SDK.
2. Enable JWT SSO.
3. Use this app's authenticated SSO endpoint as the JWT identity provider URI:
   `https://shkolla-e-mesme-e-mjekesise-ct9t.vercel.app/api/sso/metabase`
4. Add the Vercel application origin to Metabase Authorized Origins.
5. Create/configure the dashboard and permissions for the users who should see it.

The installed SDK package should match the Metabase server major version. The repository currently pins the package installed by the bootstrap workflow; update it if the Metabase server major differs.
