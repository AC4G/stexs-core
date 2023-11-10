BEGIN;

SELECT plan(10);

SELECT policies_are('blocked', ARRAY[
    'blocked_select',
    'blocked_delete',
    'blocked_insert'
], 'Table public.blocked should have blocked_select, blocked_delete and blocked_insert policies');

SELECT policy_cmd_is('blocked', 'blocked_select', 'SELECT', 'Policy blocked_select for table public.blocked should apply to SELECT command');
SELECT policy_cmd_is('blocked', 'blocked_delete', 'DELETE', 'Policy blocked_delete for table public.blocked_delete should apply to DELETE command');
SELECT policy_cmd_is('blocked', 'blocked_insert', 'INSERT', 'Policy blocked_insert for table public.blocked_insert should apply to INSERT command');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test1@example.com', 'Test12345.', '{"username": "test1"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'test2@example.com', 'Test12345.', '{"username": "test2"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0621'::UUID, 'test3@example.com', 'Test12345.', '{"username": "test3"}'::JSONB);

-- Start blocked_insert policy

SET ROLE anon;

PREPARE insert_entry AS INSERT INTO public.blocked (blocker_id, blocked_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'bb753d90-a640-433b-b339-6632b57a0620'::UUID);
SELECT throws_ok('insert_entry', '42501', 'permission denied for table blocked', 'Should throw an permission denied error for inserting with anon role');

SET ROLE authenticated;

SELECT throws_ok('insert_entry', '42501', 'new row violates row-level security policy for table "blocked"', 'Should get an violation for security policy for table "blocked" by inserting with authenticated role only');

SELECT set_config('request.jwt.claim.grant_type', 'authorization_code', true);
SELECT set_config('request.jwt.claim.sub', 'bb753d90-a640-433b-b339-6632b57a0619', true);

SELECT throws_ok('insert_entry', '42501', 'new row violates row-level security policy for table "blocked"', 'Should get an violation for security policy for table "blocked" by inserting with grant type authorization_code');

SELECT set_config('request.jwt.claim.grant_type', 'password', true);

SELECT lives_ok('insert_entry', 'Should create a new entry');

SELECT set_config('request.jwt.claim.sub', 'bb753d90-a640-433b-b339-6632b57a0620', true);

SELECT throws_ok('insert_entry', '42501', 'new row violates row-level security policy for table "blocked"', 'Should get an violation for security policy for table "blocked" by inserting with different blocker_id then his id');

PREPARE insert_the_same_id_for_blocker_and_blocked_id AS INSERT INTO public.blocked (blocker_id, blocked_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'bb753d90-a640-433b-b339-6632b57a0620'::UUID);
SELECT throws_ok('insert_the_same_id_for_blocker_and_blocked_id', '23514', 'new row for relation "blocked" violates check constraint "blocked_check"', 'Should get an violation for check constraint "blocked_check" by inserting with blocked_id as the blocker_id');

-- Start blocked_select policy



ROLLBACK;
