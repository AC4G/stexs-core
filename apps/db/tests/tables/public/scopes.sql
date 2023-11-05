BEGIN;

SELECT plan(23);

SELECT has_table('scopes', 'public.scopes table exists');

SELECT has_column('scopes', 'id', 'id is a column in public.scopes');
SELECT has_column('scopes', 'name', 'name is a column in public.scopes');
SELECT has_column('scopes', 'description', 'description is a column in public.scopes');
SELECT has_column('scopes', 'type', 'type is a column in public.scopes');
SELECT has_column('scopes', 'created_at', 'created_at is a column in public.scopes');
SELECT has_column('scopes', 'updated_at', 'updated_at is a column in public.scopes');

SELECT table_privs_are('scopes', 'anon', ARRAY['SELECT'], 'anon has SELECT privilege on public.scopes');
SELECT table_privs_are('scopes', 'authenticated', ARRAY['SELECT'], 'authenticated has SELECT privilege on public.scopes');

SELECT col_is_pk('scopes', 'id', 'id is a primary key');

SELECT col_is_unique('scopes', 'name', 'name has a unique constraint');

SELECT col_type_is('scopes', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('scopes', 'name', 'character varying(255)', 'name is of type varchar(255)');
SELECT col_type_is('scopes', 'description', 'text', 'description is of type text');
SELECT col_type_is('scopes', 'type', 'character varying(255)', 'id is of type varchar(255)');
SELECT col_type_is('scopes', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('scopes', 'updated_at', 'timestamp with time zone', 'id is of type timestampz');

SELECT col_default_is('scopes', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMP');

SELECT col_not_null('scopes', 'name', 'name has a NOT NULL constraint');
SELECT col_not_null('scopes', 'description', 'description has a NOT NULL constraint');
SELECT col_not_null('scopes', 'type', 'type has a NOT NULL constraint');
SELECT col_not_null('scopes', 'created_at', 'created_at has a NOT NULL constraint');

SELECT col_is_null('scopes', 'updated_at', 'updated_at has a NULL constraint');

ROLLBACK;
