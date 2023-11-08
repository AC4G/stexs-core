BEGIN;

SELECT plan(6);

SELECT has_function('auth', 'create_profile_for_user', 'Function auth.create_profile_for_user() should exist');

SELECT is_normal_function('auth', 'create_profile_for_user', 'Function auth.create_profile_for_user() is a normal function');

SELECT has_trigger('auth', 'users', 'create_profile_trigger', 'Table auth.users has a trigger create_profile_trigger');

SELECT trigger_is('auth', 'users', 'create_profile_trigger', 'auth', 'create_profile_for_user', 'Trigger create_profile_trigger should call auth.create_profile_for_user()');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test@example.com', 'Test12345.', '{"username": "test"}'::JSONB);

SELECT ok(1 = (SELECT 1 FROM public.profiles WHERE user_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID AND username = 'test'), 'auth.create_profile_for_user() should create an entry in public.profiles');
SELECT ok('{}'::JSONB = (SELECT raw_user_meta_data FROM auth.users WHERE id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID), 'auth.create_profile_for_user() should set raw_user_meta_data to default value {}');

ROLLBACK;
