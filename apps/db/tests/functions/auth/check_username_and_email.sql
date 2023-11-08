BEGIN;

SELECT plan(7);

SELECT has_function('auth', 'check_username_and_email', 'Function auth.check_username_and_email() should exist');

SELECT is_normal_function('auth', 'check_username_and_email', 'Function auth.check_username_and_email() is a normal function');

SELECT has_trigger('auth', 'users','check_username_and_email_trigger', 'Table auth.users has a trigger check_username_and_email_trigger');

SELECT trigger_is('auth', 'users', 'check_username_and_email_trigger', 'auth', 'check_username_and_email', 'Trigger check_username_and_email_trigger should call auth.check_username_and_email() function');

PREPARE insert_new_user AS INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data) VALUES ('test@example.com', 'Test12345.', '{"username": "test1"}'::JSONB);

SELECT lives_ok('insert_new_user', 'Should insert new user');

SELECT throws_ok('insert_new_user', '23505', 'Provided username is already taken', 'Should raise an exception with message that the provided username is already taken');

PREPARE insert_new_user_with_diff_username AS INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data) VALUES ('test@example.com', 'Test12345.', '{"username": "test2"}'::JSONB);
 
SELECT throws_ok('insert_new_user_with_diff_username', '23505', 'Provided email is already taken', 'Should raise an exception with message that the provided email is already taken');

ROLLBACK;
