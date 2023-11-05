BEGIN;

SELECT plan(40);

SELECT has_table('oauth2_apps', 'public.oauth2_apps table exists');

SELECT has_column('oauth2_apps', 'id', 'id is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'name', 'name is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'client_id', 'client_id is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'client_secret', 'client_secret is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'organization_id', 'organization_id is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'description', 'description is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'homepage_url', 'homepage_url is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'redirect_url', 'redirect_url is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'created_at', 'created_at is a column in public.oauth2_apps');
SELECT has_column('oauth2_apps', 'updated_at', 'updated_at is a column in public.oauth2_apps');

SELECT column_privs_are('oauth2_apps', 'name', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on name');
SELECT column_privs_are('oauth2_apps', 'organization_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on organization_id');
SELECT column_privs_are('oauth2_apps', 'description', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on description');
SELECT column_privs_are('oauth2_apps', 'homepage_url', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on homepage_url');
SELECT column_privs_are('oauth2_apps', 'redirect_url', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on redirect_url');

SELECT table_privs_are('oauth2_apps', 'anon', ARRAY['SELECT'], 'anon role has SELECT privilege on public.oauth2_apps');
SELECT table_privs_are('oauth2_apps', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT and DELETE privileges on public.oauth2_apps');

SELECT col_is_pk('oauth2_apps', 'id', 'id is a primary key');

SELECT fk_ok('oauth2_apps', 'organization_id', 'organizations', 'id', 'id references to public.organizations(id)');

SELECT col_is_unique('oauth2_apps', ARRAY['name', 'organization_id'], 'name and organization_id have a unique constraint');

SELECT col_type_is('oauth2_apps', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('oauth2_apps', 'name', 'character varying(255)', 'name is of type varchar(255)');
SELECT col_type_is('oauth2_apps', 'client_id', 'uuid', 'id is of type uuid');
SELECT col_type_is('oauth2_apps', 'client_secret', 'character varying(255)', 'id is of type varchar(255)');
SELECT col_type_is('oauth2_apps', 'organization_id', 'integer', 'organization_id is of type integer');
SELECT col_type_is('oauth2_apps', 'description', 'text', 'description is of type text');
SELECT col_type_is('oauth2_apps', 'homepage_url', 'character varying(255)', 'homepage_url is of type character varying(255)');
SELECT col_type_is('oauth2_apps', 'redirect_url', 'character varying(255)', 'redirect_url is of type varchar(255)');
SELECT col_type_is('oauth2_apps', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('oauth2_apps', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('oauth2_apps', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

SELECT col_not_null('oauth2_apps', 'name', 'name has a NOT NULL constraint');
SELECT col_not_null('oauth2_apps', 'client_id', 'client_id has a NOT NULL constraint');
SELECT col_not_null('oauth2_apps', 'client_secret', 'client_secret has a NOT NULL constraint');
SELECT col_not_null('oauth2_apps', 'organization_id', 'organization_id has a NOT NULL constraint');
SELECT col_not_null('oauth2_apps', 'redirect_url', 'redirect_url has a NOT NULL constraint');

SELECT col_is_null('oauth2_apps', 'description', 'description has a NULL constraint');
SELECT col_is_null('oauth2_apps', 'homepage_url', 'homepage_url has a NULL constraint');
SELECT col_is_null('oauth2_apps', 'updated_at', 'updated_at has a NULL constraint');

ROLLBACK;
