BEGIN;

SELECT plan(14);

SELECT has_function('generate_new_client_secret', ARRAY['integer'], 'Function public.generate_new_client_secret(int) should exist');

SELECT function_lang_is('generate_new_client_secret', 'plpgsql', 'generate_new_client_secret should be written in plpgsql');

SELECT function_privs_are('generate_new_client_secret', ARRAY['int'], 'authenticated', ARRAY['EXECUTE'], 'authenticated role has EXECUTE privilege on public.generate_new_client_secret');

SELECT is_normal_function('generate_new_client_secret', 'generate_new_client_secret is a normal function');

INSERT INTO public.organizations (id, name) VALUES (1, 'test1');
INSERT INTO public.oauth2_apps (id, name, organization_id, redirect_url) VALUES (1, 'test_app', 1, 'https://test');

PREPARE generate_new_secret AS SELECT public.generate_new_client_secret(1);

SELECT throws_ok('generate_new_secret', '42501', 'Insufficient Privilege', 'Should get an Insufficient Privilege exception for executing the function not as as authenticated role or not being an owner or admin of the organization');

SELECT set_config('request.jwt.claim.grant_type', 'password', true);
SELECT set_config('request.jwt.claim.sub', '9f69bb3f-36ec-4495-bbb0-ad9b68037c53', true);

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('9f69bb3f-36ec-4495-bbb0-ad9b68037c53'::UUID, 'test1@example.com', 'Test12345.', '{"username": "test1"}'::JSONB);
INSERT INTO public.organization_members (organization_id, member_id, role) VALUES (1, '9f69bb3f-36ec-4495-bbb0-ad9b68037c53'::UUID, 'Owner');

SELECT lives_ok('generate_new_secret', 'Should generate new client secret with owner role');

CREATE OR REPLACE FUNCTION check_old_secret_with_new_one() RETURNS BOOLEAN AS $$
DECLARE
    old_secret TEXT;
    new_secret TEXT;
BEGIN
    old_secret := (SELECT client_secret FROM public.oauth2_apps WHERE id = 1);

    BEGIN
        PERFORM public.generate_new_client_secret(1);
    EXCEPTION
        WHEN others THEN
    END;

    new_secret := (SELECT client_secret FROM public.oauth2_apps WHERE id = 1);

    RETURN old_secret <> new_secret;
END;
$$ LANGUAGE plpgsql;

SELECT ok(check_old_secret_with_new_one(), 'New secret should be different from old one with owner role');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('9f69bb3f-36ec-4495-bbb0-ad9b68037c54'::UUID, 'test2@example.com', 'Test12345.', '{"username": "test2"}'::JSONB);
INSERT INTO public.organizations(id, name) VALUES (2, 'test2');
INSERT INTO public.oauth2_apps (id, name, organization_id, redirect_url) VALUES (2, 'test_app', 2, 'https://test');
INSERT INTO public.organization_members (organization_id, member_id, role) VALUES (2, '9f69bb3f-36ec-4495-bbb0-ad9b68037c54'::UUID, 'Owner');

SELECT set_config('request.jwt.claim.sub', '9f69bb3f-36ec-4495-bbb0-ad9b68037c54', true);

SELECT throws_ok('generate_new_secret', '42501', 'Insufficient Privilege', 'Should get an Insufficient Privilege exception for executing the function not being an owner of the organization');

SELECT ok(NOT check_old_secret_with_new_one(), 'New secret should be the same as the old one with owner from not organization with id 1');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('9f69bb3f-36ec-4495-bbb0-ad9b68037c55'::UUID, 'test3@example.com', 'Test12345.', '{"username": "test3"}'::JSONB);
INSERT INTO public.organization_members (organization_id, member_id, role) VALUES (1, '9f69bb3f-36ec-4495-bbb0-ad9b68037c55'::UUID, 'Admin');

SELECT set_config('request.jwt.claim.sub', '9f69bb3f-36ec-4495-bbb0-ad9b68037c55', true);

SELECT lives_ok('generate_new_secret', 'Should generate new client secret with admin role');

SELECT ok(check_old_secret_with_new_one(), 'New secret should be different from old one with admin role');

SELECT set_config('request.jwt.claim.grant_type', NULL, true);
SELECT set_config('request.jwt.claim.sub', NULL, true);
 
SELECT throws_ok('generate_new_secret', '42501', 'Insufficient Privilege', 'Should get an Insufficient Privilege exception for executing the function not being authenticated');

SELECT set_config('request.jwt.claim.grant_type', 'client_credentials', true);

SELECT throws_ok('generate_new_secret', '42501', 'Insufficient Privilege', 'Should get an Insufficient Privilege exception for executing the function with grant type not being password');

SELECT ok(NOT check_old_secret_with_new_one(), 'New secret should be the same as the old one with invalid grant type');

ROLLBACK;
