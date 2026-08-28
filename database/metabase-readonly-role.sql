-- Read-only role for the Metabase analytics data source.
-- Safe to apply before a Metabase host exists: the role starts as NOLOGIN.
-- When the Metabase service is provisioned, set a strong password in the
-- hosting secret store and enable LOGIN there; never commit the password.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'metabase_analytics'
  ) THEN
    CREATE ROLE metabase_analytics NOLOGIN;
  END IF;
END $$;

GRANT CONNECT ON DATABASE neondb TO metabase_analytics;
GRANT USAGE ON SCHEMA analytics TO metabase_analytics;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO metabase_analytics;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  GRANT SELECT ON TABLES TO metabase_analytics;

-- Host provisioning step, DO NOT commit a real password:
-- ALTER ROLE metabase_analytics LOGIN PASSWORD 'SET_FROM_SECRET_STORE';
