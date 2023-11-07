BEGIN;

SELECT plan(6);

SELECT schemas_are(ARRAY['auth', 'public'], 'auth and public schemas exists');

SELECT schema_privs_are('public', 'anon', ARRAY['USAGE', 'CREATE'], 'anon role has USAGE and CREATE privilege on public schema');
SELECT schema_privs_are('public', 'authenticated', ARRAY['USAGE', 'CREATE'], 'authenticated role has USAGE and CREATE privilege on public schema');
SELECT schema_privs_are('auth', 'authenticated', ARRAY['USAGE'], 'authenticated role has USAGE privilege on auth schema');

SELECT schema_owner_is('public', 'postgres');
SELECT schema_owner_is('auth', 'postgres');

ROLLBACK;
