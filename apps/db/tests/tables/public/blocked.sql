BEGIN;

SELECT plan(19);

SELECT has_table('blocked', 'public.blocked table exists');

SELECT has_column('blocked', 'id', 'id is a column in public.blocked');
SELECT has_column('blocked', 'blocker_id', 'blocker_id is a column in public.blocked');
SELECT has_column('blocked', 'blocked_id', 'blocked_id is a column in public.blocked');
SELECT has_column('blocked', 'created_at', 'created_at is a column in public.blocked');

SELECT column_privs_are('blocked', 'blocker_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on blocker_id');
SELECT column_privs_are('blocked', 'blocked_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on blocked_id');

SELECT table_privs_are('blocked', 'authenticated', ARRAY['SELECT', 'DELETE'], 'anon role has SELECT and DELETE privileges on public.blocked');

SELECT col_is_pk('blocked', 'id', 'id is a primary key');

SELECT fk_ok('public', 'blocked', 'blocker_id', 'auth', 'users', 'id', 'blocker_id references to auth.users(id)');
SELECT fk_ok('public', 'blocked', 'blocked_id', 'auth', 'users', 'id', 'blocked_id references to auth.users(id)');

SELECT col_is_unique('blocked', ARRAY['blocker_id', 'blocked_id'], 'blocker_id and blocked_id have a unique constraint');

SELECT col_type_is('blocked', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('blocked', 'blocker_id', 'uuid', 'blocker_id is of type uuid');
SELECT col_type_is('blocked', 'blocked_id', 'uuid', 'blocked_id is of type uuid');
SELECT col_type_is('blocked', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');

SELECT col_not_null('blocked', 'blocker_id', 'blocker_id has a NOT NULL constraint');
SELECT col_not_null('blocked', 'blocked_id', 'blocked_id has a NOT NULL constraint');
SELECT col_not_null('blocked', 'created_at', 'created_at has a NOT NULL constraint');

ROLLBACK;
