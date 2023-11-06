BEGIN;

SELECT plan(34);

SELECT has_table('inventories', 'public.inventories table exists');

SELECT has_column('inventories', 'id', 'id is a column in public.inventories');
SELECT has_column('inventories', 'item_id', 'item_id is a column in public.inventories');
SELECT has_column('inventories', 'user_id', 'user_id is a column in public.inventories');
SELECT has_column('inventories', 'amount', 'amount is a column in public.inventories');
SELECT has_column('inventories', 'parameter', 'parameter is a column in public.inventories');
SELECT has_column('inventories', 'created_at', 'created_at is a column in public.inventories');
SELECT has_column('inventories', 'updated_at', 'updated_at is a column in public.inventories');

SELECT column_privs_are('inventories', 'item_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on item_id');
SELECT column_privs_are('inventories', 'user_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT priveleges on user_id');
SELECT column_privs_are('inventories', 'amount', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE priveleges on amount');
SELECT column_privs_are('inventories', 'parameter', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE priveleges on parameter');

SELECT table_privs_are('inventories', 'anon', ARRAY['SELECT'], 'anon role has a SELECT privilege on public.inventories');
SELECT table_privs_are('inventories', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has a SELECT and DELETE privileges on public.inventories');

SELECT col_is_pk('inventories', 'id', 'id is a primary key');

SELECT fk_ok('inventories', 'item_id', 'items', 'id', 'item_id references to public.items(id)');
SELECT fk_ok('public', 'inventories', 'user_id', 'auth', 'users', 'id', 'user_id references to auth.users(id)');

SELECT col_is_unique('inventories', ARRAY['item_id', 'user_id'], 'item_id and user_id have a unique constraint');

SELECT col_type_is('inventories', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('inventories', 'item_id', 'integer', 'item_id is of type integer');
SELECT col_type_is('inventories', 'user_id', 'uuid', 'user_id is of type uuid');
SELECT col_type_is('inventories', 'amount', 'integer', 'amount is of type integer');
SELECT col_type_is('inventories', 'parameter', 'jsonb', 'parameter is of type jsonb');
SELECT col_type_is('inventories', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('inventories', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('inventories', 'amount', '0', 'amount has a default 0');
SELECT col_default_is('inventories', 'parameter', '{}', 'parameter has a default {}');
SELECT col_default_is('inventories', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

SELECT col_not_null('inventories', 'item_id', 'item_id has a NOT NULL constraint');
SELECT col_not_null('inventories', 'user_id', 'user_id has a NOT NULL constraint');
SELECT col_not_null('inventories', 'amount', 'amount has a NOT NULL constraint');
SELECT col_not_null('inventories', 'parameter', 'parameter has a NOT NULL constraint');
SELECT col_not_null('inventories', 'created_at', 'created_at has a NOT NULL constraint');

SELECT col_is_null('inventories', 'updated_at', 'updated_at has a NULL constraint');

ROLLBACK;
