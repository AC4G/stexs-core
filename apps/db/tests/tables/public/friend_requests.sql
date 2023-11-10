BEGIN;

SELECT plan(24);

SELECT has_table('friend_requests', 'public.friend_requests table exists');

SELECT has_column('friend_requests', 'id', 'id is a column in public.friend_requests');
SELECT has_column('friend_requests', 'requester_id', 'requester_id is a column in public.friend_requests');
SELECT has_column('friend_requests', 'addressee_id', 'addressee_id is a column in public.friend_requests');
SELECT has_column('friend_requests', 'created_at', 'created_at is a column in public.friend_requests');

SELECT has_check('friend_requests', 'public.friend_requests has a check constraint');

SELECT col_has_check('friend_requests', ARRAY['requester_id', 'addressee_id'], 'requester_id and addressee_id have a check constraint');

SELECT column_privs_are('friend_requests', 'requester_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on requester_id');
SELECT column_privs_are('friend_requests', 'addressee_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on addressee_id');

SELECT table_privs_are('friend_requests', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has a SELECT and DELETE privileges on public.friend_requests');

SELECT col_is_pk('friend_requests', 'id', 'id is a primary key');

SELECT fk_ok('public', 'friend_requests', 'requester_id', 'auth', 'users', 'id', 'requester_id references to auth.users(id)');
SELECT fk_ok('public', 'friend_requests', 'addressee_id', 'auth', 'users', 'id', 'addressee_id references to auth.users(id)');

SELECT has_index('friend_requests', 'unique_friend_requests_combination', ARRAY['LEAST(requester_id, addressee_id)', 'GREATEST(requester_id, addressee_id)'], 'requester_id and addressee_id have a least and greatest named index');

SELECT col_type_is('friend_requests', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('friend_requests', 'requester_id', 'uuid', 'requester_id is of type uuid');
SELECT col_type_is('friend_requests', 'addressee_id', 'uuid', 'addressee_id is of type uuid');
SELECT col_type_is('friend_requests', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');

SELECT col_default_is('friend_requests', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

SELECT col_not_null('friend_requests', 'requester_id', 'requester_id has a NOT NULL constraint');
SELECT col_not_null('friend_requests', 'addressee_id', 'addressee_id has a NOT NULL constraint');
SELECT col_not_null('friend_requests', 'created_at', 'created_at has a NOT NULL constraint');

PREPARE insert_user_friend_request_to_himself AS INSERT INTO public.friend_requests (requester_id, addressee_id) VALUES ('75336027-7f85-494b-8f25-910e41c9af73'::UUID, '75336027-7f85-494b-8f25-910e41c9af73'::UUID);
SELECT throws_ok('insert_user_friend_request_to_himself', '23514', 'new row for relation "friend_requests" violates check constraint "friend_requests_check"', 'Should get an violation for check constraint "friend_requests_check" for inserting his id in requester_id and addressee_id');

PREPARE insert_user_friend_request_to_someone_else AS INSERT INTO public.friend_requests (requester_id, addressee_id) VALUES ('75336027-7f85-494b-8f25-910e41c9af73'::UUID, '75336027-7f85-494b-8f25-910e41c9af74'::UUID);
SELECT throws_ok('insert_user_friend_request_to_someone_else', '23503', 'insert or update on table "friend_requests" violates foreign key constraint "friend_requests_requester_id_fkey"', 'Should get an violation for foreign key constraint "friend_requests_requester_id_fkey" for having a different id in addressee_id as his own in requester_id');

ROLLBACK;
