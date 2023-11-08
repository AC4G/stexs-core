BEGIN;

SELECT plan(5);

SELECT has_function('auth', 'encrypt_password', 'Function auth.encrypt_password() should exist');

SELECT is_normal_function('auth', 'encrypt_password', 'Function auth.encrypt_password() is a normal function');

SELECT has_trigger('auth', 'users', 'encrypt_password_trigger', 'Table auth.users has a trigger encrypt_password_trigger');

SELECT trigger_is('auth', 'users', 'encrypt_password_trigger', 'auth', 'encrypt_password', 'Trigger encrypt_password_trigger should call auth.encrypt_password()');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test@example.com', 'Test12345.', '{"username": "test"}'::JSONB);

SELECT matches((SELECT encrypted_password FROM auth.users WHERE id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID), E'\\$2a\\$[0-9]{2}\\$.{53}', 'Password should be stored encrypted');

ROLLBACK;
