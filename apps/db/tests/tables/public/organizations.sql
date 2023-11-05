BEGIN;

SELECT plan(37);

SELECT has_table('organizations', 'public.organizations table exists');

SELECT has_column('organizations', 'id', 'id is a column in public.organizations');
SELECT has_column('organizations', 'name', 'name is a column in public.organizations');
SELECT has_column('organizations', 'display_name', 'display_name is a column in public.organizations');
SELECT has_column('organizations', 'description', 'description is a column in public.organizations');
SELECT has_column('organizations', 'readme', 'readme is a column in public.organizations');
SELECT has_column('organizations', 'email', 'email is a column in public.organizations');
SELECT has_column('organizations', 'url', 'url is a column in public.organizations');
SELECT has_column('organizations', 'created_at', 'created_at is a column in public.organizations');
SELECT has_column('organizations', 'updated_at', 'updated_at is a column in public.organizations');

SELECT column_privs_are('organizations', 'name', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on name');
SELECT column_privs_are('organizations', 'display_name', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on display_name');
SELECT column_privs_are('organizations', 'description', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on description');
SELECT column_privs_are('organizations', 'readme', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on readme');
SELECT column_privs_are('organizations', 'email', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on email');
SELECT column_privs_are('organizations', 'url', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on url');

SELECT table_privs_are('organizations', 'anon', ARRAY['SELECT'], 'anon role has SELECT privilege on public.organizations');
SELECT table_privs_are('organizations', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT and DELETE privileges on public.organizations');

SELECT col_is_pk('organizations', 'id', 'id is a primary key');

SELECT col_is_unique('organizations', 'name', 'name has a unique constraint');

SELECT col_type_is('organizations', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('organizations', 'name', 'citext', 'name is of type citext');
SELECT col_type_is('organizations', 'display_name', 'character varying(255)', 'display_name is of type varchar(255)');
SELECT col_type_is('organizations', 'description', 'text', 'description is of type text');
SELECT col_type_is('organizations', 'readme', 'text', 'readme is of type text');
SELECT col_type_is('organizations', 'email', 'character varying(255)', 'email is of type varchar(255)');
SELECT col_type_is('organizations', 'url', 'character varying(255)', 'url is of type varchar(255)');
SELECT col_type_is('organizations', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('organizations', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('organizations', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMP');

SELECT col_not_null('organizations', 'name', 'name has a NOT NULL constraint');

SELECT col_is_null('organizations', 'display_name', 'display_name has a NOT NULL constraint');
SELECT col_is_null('organizations', 'description', 'description has a NOT NULL constraint');
SELECT col_is_null('organizations', 'readme', 'readme has a NOT NULL constraint');
SELECT col_is_null('organizations', 'email', 'email has a NOT NULL constraint');
SELECT col_is_null('organizations', 'url', 'url has a NOT NULL constraint');
SELECT col_is_null('organizations', 'updated_at', 'updated_at has a NOT NULL constraint');

ROLLBACK;
