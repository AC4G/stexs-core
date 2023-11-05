BEGIN;

SELECT plan(38);

SELECT has_table('projects', 'public.projects table exists');

SELECT has_column('projects', 'id', 'id is a column in public.projects');
SELECT has_column('projects', 'name', 'name is a column in public.projects');
SELECT has_column('projects', 'organization_id', 'organization_id is a column in public.projects');
SELECT has_column('projects', 'description', 'description is a column in public.projects');
SELECT has_column('projects', 'readme', 'readme is a column in public.projects');
SELECT has_column('projects', 'email', 'email is a column in public.projects');
SELECT has_column('projects', 'url', 'url is a column in public.projects');
SELECT has_column('projects', 'created_at', 'created_at is a column in public.projects');
SELECT has_column('projects', 'updated_at', 'updated_at is a column in public.projects');

SELECT column_privs_are('projects', 'name', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on name');
SELECT column_privs_are('projects', 'organization_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on organization_id');
SELECT column_privs_are('projects', 'description', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on description');
SELECT column_privs_are('projects', 'readme', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on readme');
SELECT column_privs_are('projects', 'email', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on email');
SELECT column_privs_are('projects', 'url', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on url');

SELECT table_privs_are('projects', 'anon', ARRAY['SELECT'], 'anon role has SELECT privilege on public.projects');
SELECT table_privs_are('projects', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT privilege on public.projects');

SELECT col_is_pk('projects', 'id', 'id is a primary key');

SELECT fk_ok('projects', 'organization_id', 'organizations', 'id', 'organization_id references to public.organizations(id)');

SELECT col_is_unique('projects', ARRAY['name', 'organization_id'], 'name and organization_id have a unique constraint');

SELECT col_type_is('projects', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('projects', 'name', 'citext', 'name is of type citext');
SELECT col_type_is('projects', 'organization_id', 'integer', 'organization_id is of type integer');
SELECT col_type_is('projects', 'description', 'text', 'description is of type text');
SELECT col_type_is('projects', 'readme', 'text', 'id is of type integer');
SELECT col_type_is('projects', 'email', 'character varying(255)', 'email is of type varchar(255)');
SELECT col_type_is('projects', 'url', 'character varying(255)', 'url is of type varchar(255)');
SELECT col_type_is('projects', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('projects', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('projects', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

SELECT col_not_null('projects', 'name', 'name has a NOT NULL constraint');
SELECT col_not_null('projects', 'organization_id', 'organization_id has a NOT NULL constraint');

SELECT col_is_null('projects', 'description', 'description has a NOT NULL constraint');
SELECT col_is_null('projects', 'readme', 'readme has a NOT NULL constraint');
SELECT col_is_null('projects', 'email', 'email has a NOT NULL constraint');
SELECT col_is_null('projects', 'url', 'url has a NOT NULL constraint');
SELECT col_is_null('projects', 'updated_at', 'updated_at has a NOT NULL constraint');

ROLLBACK;
