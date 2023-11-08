BEGIN;

SELECT plan(6);

SELECT has_function('generate_client_credentials', 'Function public.generate_client_credentials() should exist');

SELECT is_normal_function('generate_client_credentials', 'Function public.generate_client_credentials() is a normal function');

SELECT has_trigger('oauth2_apps', 'generate_client_credentials_trigger', 'Table public.oauth2_apps has a trigger generate_client_credentials_trigger');

SELECT trigger_is('oauth2_apps', 'generate_client_credentials_trigger', 'generate_client_credentials', 'Trigger generate_client_credentials_trigger should call public.generate_client_credentials() function');

INSERT INTO public.organizations (id, name) VALUES (1, 'test_organization');
INSERT INTO public.oauth2_apps (id, name, organization_id, redirect_url) VALUES (1, 'test_app', 1, 'https://test');

SELECT matches((SELECT client_id::TEXT FROM public.oauth2_apps WHERE id = 1), E'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'Client id should be an uuid');
SELECT matches((SELECT client_secret FROM public.oauth2_apps WHERE id =1 ), E'^[a-f0-9]{32}$', 'Client secret should be a md5 32 character long string');

ROLLBACK;
