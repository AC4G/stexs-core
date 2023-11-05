BEGIN;

SELECT plan(35);

SELECT has_table('profiles', 'public.profiles table exists');

SELECT has_column('profiles', 'user_id', 'user_id is a column in public.profiles');
SELECT has_column('profiles', 'username', 'username is a column in public.profiles');
SELECT has_column('profiles', 'is_private', 'is_private is a column in public.profiles');
SELECT has_column('profiles', 'friend_privacy_level', 'friend_privacy_level is a column in public.profiles');
SELECT has_column('profiles', 'inventory_privacy_level', 'inventory_privacy_level is a column in public.profiles');
SELECT has_column('profiles', 'created_at', 'created_at is a column in public.profiles');

SELECT has_check('profiles', 'public.profiles has a check constraint');

SELECT col_has_check('profiles', ARRAY[
    'friend_privacy_level',
    'inventory_privacy_level'
], 'friend_privacy_level and inventory_privacy_level have a check constraint');

SELECT column_privs_are('profiles', 'username', 'authenticated', ARRAY['SELECT', 'UPDATE'], 'authenticated role has UPDATE and SELECT privileges on username');
SELECT column_privs_are('profiles', 'is_private', 'authenticated', ARRAY['SELECT', 'UPDATE'], 'authenticated role has UPDATE and SELECT privileges on is_private');
SELECT column_privs_are('profiles', 'friend_privacy_level', 'authenticated', ARRAY['SELECT', 'UPDATE'], 'authenticated role has UPDATE and SELECT privileges on friend_privacy_level');
SELECT column_privs_are('profiles', 'inventory_privacy_level', 'authenticated', ARRAY['SELECT', 'UPDATE'], 'authenticated role has UPDATE and SELECT privileges on inventory_privacy_level');

SELECT table_privs_are('profiles', 'anon', ARRAY['SELECT'], 'anon role has SELECT privilege on public.profiles');
SELECT table_privs_are('profiles', 'authenticated', ARRAY['SELECT'], 'authenticated role has SELECT privilege on public.profiles');

SELECT fk_ok('public', 'profiles', 'user_id', 'auth', 'users', 'id', 'user_id references to auth.users(id)');

SELECT col_is_unique('profiles', 'username', 'username has a unique constraint');

SELECT col_type_is('profiles', 'user_id', 'uuid', 'user_id is of type uuid');
SELECT col_type_is('profiles', 'username', 'citext', 'username is of type citext');
SELECT col_type_is('profiles', 'is_private', 'boolean', 'is_private is of type boolean');
SELECT col_type_is('profiles', 'friend_privacy_level', 'integer', 'friend_privacy_level is of type integer');
SELECT col_type_is('profiles', 'inventory_privacy_level', 'integer', 'inventory_privacy_level is of type integer');
SELECT col_type_is('profiles', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');

SELECT col_default_is('profiles', 'is_private', FALSE, 'is_private has default FALSE');
SELECT col_default_is('profiles', 'friend_privacy_level', 0, 'friend_privacy_level has default 0');
SELECT col_default_is('profiles', 'inventory_privacy_level', 0, 'inventory_privacy_level has default 0');
SELECT col_default_is('profiles', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMP');

SELECT col_not_null('profiles', 'username', 'username has a NOT NULL constraint');
SELECT col_not_null('profiles', 'is_private', 'is_private has a NOT NULL constraint');

PREPARE insert_invalid_friend_privacy_level_higher_then_2 AS INSERT INTO public.profiles (user_id, username, friend_privacy_level) VALUES (uuid_generate_v4(), 'test', 3);
SELECT throws_ok('insert_invalid_friend_privacy_level_higher_then_2', '23514', 'new row for relation "profiles" violates check constraint "profiles_check"', 'Should get an violation for check constraint "porfiles_check" for invalid friend_privacy_level value for higher then 2');

PREPARE insert_invalid_friend_privacy_level_lower_then_0 AS INSERT INTO public.profiles (user_id, username, friend_privacy_level) VALUES (uuid_generate_v4(), 'test', -1);
SELECT throws_ok('insert_invalid_friend_privacy_level_lower_then_0', '23514', 'new row for relation "profiles" violates check constraint "profiles_check"', 'Should get an violation for check constraint "porfiles_check" for invalid friend_privacy_level value for lower then 0');

PREPARE insert_valid_friend_privacy_level AS INSERT INTO public.profiles (user_id, username, friend_privacy_level) VALUES (uuid_generate_v4(), 'test', 1);
SELECT throws_ok('insert_valid_friend_privacy_level', '23503', 'insert or update on table "profiles" violates foreign key constraint "profiles_user_id_fkey"', 'Should get an violation for foreign key constraint "profiles_user_id_fkey" for valid friend_privacy_level value of 1');

PREPARE insert_invalid_inventory_privacy_level_higher_then_2 AS INSERT INTO public.profiles (user_id, username, inventory_privacy_level) VALUES (uuid_generate_v4(), 'test', 3);
SELECT throws_ok('insert_invalid_inventory_privacy_level_higher_then_2', '23514', 'new row for relation "profiles" violates check constraint "profiles_check"', 'Should get an violation for check constraint "porfiles_check" for invalid inventory_privacy_level value for higher then 2');

PREPARE insert_invalid_inventory_privacy_level_lower_then_0 AS INSERT INTO public.profiles (user_id, username, inventory_privacy_level) VALUES (uuid_generate_v4(), 'test', -1);
SELECT throws_ok('insert_invalid_inventory_privacy_level_lower_then_0', '23514', 'new row for relation "profiles" violates check constraint "profiles_check"', 'Should get an violation for check constraint "porfiles_check" for invalid inventory_privacy_level value for lower then 0');

PREPARE insert_valid_inventory_privacy_level AS INSERT INTO public.profiles (user_id, username, inventory_privacy_level) VALUES (uuid_generate_v4(), 'test', 1);
SELECT throws_ok('insert_valid_inventory_privacy_level', '23503', 'insert or update on table "profiles" violates foreign key constraint "profiles_user_id_fkey"', 'Should get an violation for foreign key constraint "profiles_user_id_fkey" for valid inventory_privacy_level value of 1');

ROLLBACK;
