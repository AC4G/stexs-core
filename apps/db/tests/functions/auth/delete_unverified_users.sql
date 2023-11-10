BEGIN;

SELECT plan(6);

SELECT has_function('auth', 'delete_unverified_users', 'Function auth.delete_unverified_users() should exist');

SELECT is_normal_function('auth', 'delete_unverified_users', 'Function auth.delete_unverified_users() is a normal function');

INSERT INTO auth.users (id, email, encrypted_password, email_verified_at, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0618'::UUID, 'test1@example.com', 'Test12345.', CURRENT_TIMESTAMP - INTERVAL '180', '{"username": "test1"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, email_verified_at, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test2@example.com', 'Test12345.', CURRENT_TIMESTAMP - INTERVAL '18h', '{"username": "test2"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, verification_sent_at, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'test3@example.com', 'Test12345.', CURRENT_TIMESTAMP - INTERVAL '26h', '{"username": "test3"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, verification_sent_at, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0621'::UUID, 'test4@example.com', 'Test12345.', CURRENT_TIMESTAMP - INTERVAL '30d', '{"username": "test4"}'::JSONB);

SELECT auth.delete_unverified_users();

SELECT ok(1 = (SELECT 1 FROM auth.users WHERE id = 'bb753d90-a640-433b-b339-6632b57a0618'::UUID), 'Should return 1 because the user is long been verified');
SELECT ok(1 = (SELECT 1 FROM auth.users WHERE id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID), 'Should return 1 because the user is verified');
SELECT ok((SELECT 1 FROM auth.users WHERE id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID) IS NULL, 'Should return NULL because the account is not verified past 24h and was been deleted');
SELECT ok((SELECT 1 FROM auth.users WHERE id = 'bb753d90-a640-433b-b339-6632b57a0621'::UUID) IS NULL, 'SHould return NULL because the account is not verified far past 24h and was been deleted');

ROLLBACK;
