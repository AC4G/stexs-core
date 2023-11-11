BEGIN;

SELECT plan(11);

SELECT policies_are('blocked', ARRAY[
    'blocked_select',
    'blocked_delete',
    'blocked_insert'
], 'Table public.blocked should have blocked_select, blocked_delete and blocked_insert policies');

SELECT policy_cmd_is('blocked', 'blocked_select', 'SELECT', 'Policy blocked_select for table public.blocked should apply to SELECT command');
SELECT policy_cmd_is('blocked', 'blocked_delete', 'DELETE', 'Policy blocked_delete for table public.blocked should apply to DELETE command');
SELECT policy_cmd_is('blocked', 'blocked_insert', 'INSERT', 'Policy blocked_insert for table public.blocked should apply to INSERT command');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test1@example.com', 'Test12345.', '{"username": "test1"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'test2@example.com', 'Test12345.', '{"username": "test2"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0621'::UUID, 'test3@example.com', 'Test12345.', '{"username": "test3"}'::JSONB);

SET ROLE authenticated;

PREPARE insert_entry AS INSERT INTO public.blocked (blocker_id, blocked_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'bb753d90-a640-433b-b339-6632b57a0620'::UUID);

SELECT set_config('request.jwt.claim.grant_type', 'password', true);
SELECT set_config('request.jwt.claim.sub', 'bb753d90-a640-433b-b339-6632b57a0619', true);

SELECT lives_ok('insert_entry', 'Should create a new entry');

SELECT set_config('request.jwt.claim.sub', 'bb753d90-a640-433b-b339-6632b57a0620', true);

SELECT throws_ok('insert_entry', '42501', 'new row violates row-level security policy for table "blocked"', 'Should get an violation for security policy for table "blocked" by inserting with different blocker_id then his id');

PREPARE insert_the_same_id_for_blocker_and_blocked_id AS INSERT INTO public.blocked (blocker_id, blocked_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'bb753d90-a640-433b-b339-6632b57a0620'::UUID);
SELECT throws_ok('insert_the_same_id_for_blocker_and_blocked_id', '23514', 'new row for relation "blocked" violates check constraint "blocked_check"', 'Should get an violation for check constraint "blocked_check" by inserting with blocked_id as the blocker_id');

RESET ROLE;

INSERT INTO public.blocked (blocker_id, blocked_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'bb753d90-a640-433b-b339-6632b57a0621'::UUID);
INSERT INTO public.blocked (blocker_id, blocked_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'bb753d90-a640-433b-b339-6632b57a0621'::UUID);

SET ROLE authenticated;

SELECT set_config('request.jwt.claim.grant_type', 'password', true);
SELECT set_config('request.jwt.claim.sub', 'bb753d90-a640-433b-b339-6632b57a0619', true);

SELECT ok((SELECT 1 FROM public.blocked WHERE blocker_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID) IS NULL, 'Should return no entries because blocker_id is not the current users id');
SELECT ok(1 = (SELECT 1 FROM public.blocked WHERE blocker_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID AND blocked_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID), 'Should return entry');

DELETE FROM public.blocked WHERE blocker_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID;

SELECT ok((SELECT 1 FROM public.blocked WHERE blocker_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID) IS NULL, 'Should allow the deletion of the entry');

DELETE FROM public.blocked WHERE blocker_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID;

RESET ROLE;

SELECT ok(1 = (SELECT 1 FROM public.blocked WHERE blocker_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID), 'Should not allow the deletion of the entry');

ROLLBACK;
