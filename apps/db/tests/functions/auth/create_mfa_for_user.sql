BEGIN;

SELECT plan(5);

SELECT has_function('auth', 'create_mfa_for_user', 'Function auth.create_mfa_for_user() should exist');

SELECT is_normal_function('auth', 'create_mfa_for_user', 'Function auth.create_mfa_for_user() is a normal function');

SELECT has_trigger('auth', 'users', 'create_mfa_trigger', 'Table auth.users has a trigger create_mfa_trigger');

SELECT trigger_is('auth', 'users', 'create_mfa_trigger', 'auth', 'create_mfa_for_user', 'Trigger create_mfa_trigger should call auth.create_mfa_for_user() function');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test@exmaple.com', 'Test12345.', '{"username": "test"}'::JSONB);

SELECT ok(1 = (SELECT 1 FROM auth.mfa WHERE user_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID), 'create_mfa_for_user should create an entry in auth.mfa with the same user_id as the provided one');

ROLLBACK;
