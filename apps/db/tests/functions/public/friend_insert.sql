BEGIN;

SELECT plan(5);

SELECT has_function('friend_insert', 'Function public.friend_insert() should exist');

SELECT is_normal_function('friend_insert', 'Function public.friend_insert() is a normal function');

SELECT has_trigger('friends', 'friend_insert_trigger', 'Table public.friends has a trigger friend_insert_trigger');

SELECT trigger_is('friends', 'friend_insert_trigger', 'friend_insert', 'Trigger friend_insert_trigger should call public.friend_insert()');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test1@example.com', 'Test12345.', '{"username": "test1"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'test2@example.com', 'Test12345.', '{"username": "test2"}'::JSONB);

INSERT INTO public.friend_requests (requester_id, addressee_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'bb753d90-a640-433b-b339-6632b57a0620'::UUID);

INSERT INTO public.friends (user_id, friend_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'bb753d90-a640-433b-b339-6632b57a0619'::UUID);

SELECT ok(1 = (SELECT 1 FROM public.friends WHERE friend_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID AND user_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID), 'Should create a bipolar entry');

ROLLBACK;
