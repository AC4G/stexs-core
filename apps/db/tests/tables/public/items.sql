BEGIN;

SELECT plan(37);

SELECT has_table('items', 'public.items table exists');

SELECT has_column('items', 'id', 'id is a column in public.items');
SELECT has_column('items', 'name', 'name is a column in public.items');
SELECT has_column('items', 'parameter', 'parameter is a column in public.items');
SELECT has_column('items', 'project_id', 'project_id is a column in public.items');
SELECT has_column('items', 'creator_id', 'creator_id is a column in public.items');
SELECT has_column('items', 'is_private', 'is_private is a column in public.items');
SELECT has_column('items', 'created_at', 'created_at is a column in public.items');
SELECT has_column('items', 'updated_at', 'updated_at is a column in public.items');

SELECT column_privs_are('items', 'name', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on name');
SELECT column_privs_are('items', 'parameter', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on parameter');
SELECT column_privs_are('items', 'project_id', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on project_id');
SELECT column_privs_are('items', 'creator_id', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on creator_id');
SELECT column_privs_are('items', 'is_private', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on is_private');

SELECT table_privs_are('items', 'anon', ARRAY['SELECT'], 'anon role has SELECT privilege on public.items');
SELECT table_privs_are('items', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT and DELETE privileges on public.items');

SELECT col_is_pk('items', 'id', 'id is a primary key');

SELECT fk_ok('items', 'project_id', 'projects', 'id', 'project_id references to public.projects(id)');
SELECT fk_ok('public', 'items', 'creator_id', 'auth', 'users', 'id', 'creator_id references to auth.users(id)');

SELECT col_is_unique('items', ARRAY['name', 'project_id'], 'name and project_id have a unique constraint');

SELECT col_type_is('items', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('items', 'name', 'character varying(255)', 'name is of type varchar(255)');
SELECT col_type_is('items', 'parameter', 'jsonb', 'parameter is of type jsonb');
SELECT col_type_is('items', 'project_id', 'integer', 'project_id is of type integer');
SELECT col_type_is('items', 'creator_id', 'uuid', 'creator_id is of type uuid');
SELECT col_type_is('items', 'is_private', 'boolean', 'is_private is of type boolean');
SELECT col_type_is('items', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('items', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('items', 'parameter', '{}', 'parameter has default {}');
SELECT col_default_is('items', 'is_private', FALSE, 'is_private has default FALSE');
SELECT col_default_is('items', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMP');

SELECT col_not_null('items', 'name', 'name has a NOT NULL constraint');
SELECT col_not_null('items', 'parameter', 'parameter has a NOT NULL constraint');
SELECT col_not_null('items', 'project_id', 'project_id has a NOT NULL constraint');
SELECT col_not_null('items', 'created_at', 'created_at has a NOT NULL constraint');

SELECT col_is_null('items', 'creator_id', 'creator_id has a NULL constraint');
SELECT col_is_null('items', 'updated_at', 'updated_at has a NULL constraint');

ROLLBACK;
