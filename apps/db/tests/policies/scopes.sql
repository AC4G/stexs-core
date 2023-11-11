BEGIN;

SELECT plan(5);

SELECT policies_are('scopes', ARRAY[
    'scopes_select'
], 'Table public.scopes should have scopes_select policy');

SELECT policy_cmd_is('scopes', 'scopes_select', 'SELECT', 'Policy scopes_select for table public.scopes should apply to SELECT command');

INSERT INTO public.scopes (id, name, description, type) VALUES (1, 'inventory.read', 'Allows client to read the users inventory', 'client');

SET ROLE authenticated;

SELECT set_config('request.jwt.claim.grant_type', 'authorization_code', true);

SELECT ok((SELECT 1 FROM public.scopes WHERE id = 1) IS NULL, 'Should return NULL by selecting with grant type authorization_code');

SELECT set_config('request.jwt.claim.grant_type', 'password', true);

SELECT ok(1 = (SELECT 1 FROM public.scopes WHERE id = 1), 'Should return entry by selecting with grant type password');

SELECT set_config('request.jwt.claim.grant_type', 'client_credentials', true);

SELECT ok(1 = (SELECT 1 FROM public.scopes WHERE id = 1), 'Should return entry by selecting with grant type client_credentials');

ROLLBACK;
