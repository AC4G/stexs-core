BEGIN;

SELECT plan(16);

SELECT has_table('oauth2_app_scopes', 'public.oauth2_app_scopes table exists');

SELECT has_column('oauth2_app_scopes', 'id', 'id is a column in public.oauth2_app_scopes');
SELECT has_column('oauth2_app_scopes', 'app_id', 'app_id is a column in public.oauth2_app_scopes');
SELECT has_column('oauth2_app_scopes', 'scope_id', 'scope_id is a column in public.oauth2_app_scopes');
SELECT has_column('oauth2_app_scopes', 'created_at', 'created_at is a column in public.oauth2_app_scopes');

SELECT column_privs_are('oauth2_app_scopes', 'app_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated has SELECT and INSERT privileges on app_id');
SELECT column_privs_are('oauth2_app_scopes', 'scope_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated has SELECT and INSERT privileges on scope_id');

SELECT table_privs_are('oauth2_app_scopes', 'anon', ARRAY['SELECT'], 'anon role has SELECT privilege on public.oauth2_app_scopes');
SELECT table_privs_are('oauth2_app_scopes', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT and DELETE privileges on public.oauth2_app_scopes');

SELECT col_is_pk('oauth2_app_scopes', 'id', 'id is a primary key');

SELECT col_is_unique('oauth2_app_scopes', ARRAY['app_id', 'scope_id'], 'app_id and scope_id have a unique constraint');

SELECT col_type_is('oauth2_app_scopes', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('oauth2_app_scopes', 'app_id', 'integer', 'app_id is of type integer');
SELECT col_type_is('oauth2_app_scopes', 'scope_id', 'integer', 'scope_id is of type integer');
SELECT col_type_is('oauth2_app_scopes', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');

SELECT col_default_is('oauth2_app_scopes', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

ROLLBACK;
