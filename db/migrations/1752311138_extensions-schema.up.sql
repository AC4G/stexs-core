CREATE SCHEMA IF NOT EXISTS extensions;

SET search_path TO extensions, public;

ALTER DATABASE postgres SET search_path TO extensions, public; -- noqa: 

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;
