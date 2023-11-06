BEGIN;

SELECT plan(21);

SELECT has_table('friends', 'public.friends table exists');

SELECT has_column('friends', 'id', 'id is a column in public.friends');
SELECT has_column('friends', 'user_id', 'user_id is a column in public.friends');
SELECT has_column('friends', 'friend_id', 'friend_id is a column in public.friends');
SELECT has_column('friends', 'created_at', 'created_at is a column in public.friends');

SELECT column_privs_are('friends', 'user_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on user_id');
SELECT column_privs_are('friends', 'friend_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on friend_id');

SELECT table_privs_are('friends', 'anon', ARRAY['SELECT'], 'anon role has SELECT privelege on public.friends');
SELECT table_privs_are('friends', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT and DELETE priveleges on public.friends');

SELECT col_is_pk('friends', 'id', 'id is a primary key');

SELECT fk_ok('public', 'friends', 'user_id', 'auth', 'users', 'id', 'user_id references to auth.users(id)');
SELECT fk_ok('public', 'friends', 'friend_id', 'auth', 'users', 'id', 'friend_id references to auth.users(id)');

SELECT col_is_unique('friends', ARRAY['user_id', 'friend_id'], 'user_id and friend_id have a unique constraint');

SELECT col_type_is('friends', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('friends', 'user_id', 'uuid', 'user_id is of type uuid');
SELECT col_type_is('friends', 'friend_id', 'uuid', 'friend_id is of type uuid');
SELECT col_type_is('friends', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');

SELECT col_default_is('friends', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

SELECT col_not_null('friends', 'user_id', 'user_id has a NOT NULL constraint');
SELECT col_not_null('friends', 'friend_id', 'friend_id has a NOT NULL constraint');
SELECT col_not_null('friends', 'created_at', 'created_at has a NOT NULL constraint');

ROLLBACK;
