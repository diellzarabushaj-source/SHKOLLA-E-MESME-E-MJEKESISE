-- Dedicated Metabase application database for production.
-- Execute with psql as neondb_owner. The \gexec line makes database creation idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'metabase_app_owner'
  ) THEN
    CREATE ROLE metabase_app_owner NOLOGIN;
  END IF;
END $$;

GRANT metabase_app_owner TO neondb_owner;

SELECT 'CREATE DATABASE metabase_app OWNER metabase_app_owner'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'metabase_app'
)
\gexec

ALTER DATABASE metabase_app OWNER TO metabase_app_owner;
REVOKE ALL ON DATABASE metabase_app FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE metabase_app TO metabase_app_owner;

-- The role deliberately stays NOLOGIN until a Metabase host exists.
-- At host provisioning time, generate the password in the host secret store:
--
-- ALTER ROLE metabase_app_owner LOGIN PASSWORD 'SET_FROM_SECRET_STORE';
--
-- Then set MB_DB_CONNECTION_URI on the Metabase host and never commit the password.
