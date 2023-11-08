BEGIN;

SELECT plan(6);

SELECT has_function('friend_delete', 'Function public.friend_delete() should exist');

SELECT is_normal_function('friend_delete', 'Function public.friend_delete() is a normal function');

SELECT has_trigger('friends', 'friend_delete_trigger', 'Table public.friends has a trigger friend_delete_trigger');

SELECT trigger_is('friends', 'friend_delete_trigger', 'friend_delete', 'Trigger friend_delete_trigger should cal public.friend_delete()');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test1@example.com', 'Test12345.', '{"username": "test1"}'::JSONB);
INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'test2@example.com', 'Test12345.', '{"username": "test2"}'::JSONB);

INSERT INTO public.friend_requests (requester_id, addressee_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'bb753d90-a640-433b-b339-6632b57a0620'::UUID);

INSERT INTO public.friends (user_id, friend_id) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'bb753d90-a640-433b-b339-6632b57a0619'::UUID);

DELETE FROM public.friends WHERE user_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID AND friend_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID;

SELECT ok((SELECT 1 FROM public.friends WHERE user_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID AND friend_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID) IS NULL, 'Should have deleted the friend entry');
SELECT ok((SELECT 1 FROM public.friends WHERE user_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID AND friend_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID) IS NULL, 'Should have deleted the bipolar friend entry');

ROLLBACK;
