BEGIN;

SELECT plan(4);

SELECT policies_are('oauth2_app_scopes', ARRAY[
    'oauth2_app_scopes_select',
    'oauth2_app_scopes_delete',
    'oauth2_app_scopes_insert'
], 'Table public.oauth2_app_scopes should have oauth2_app_scopes_select, oauth2_app_scopes_delete and oauth2_app_scopes_insert policies');

SELECT policy_cmd_is('oauth2_app_scopes', 'oauth2_app_scopes_select', 'SELECT', 'Policy oauth2_app_scopes_select for table public.oauth2_app_scopes should apply to SELECT command');
SELECT policy_cmd_is('oauth2_app_scopes', 'oauth2_app_scopes_delete', 'DELETE', 'Policy oauth2_app_scopes_delete for table public.oauth2_app_scopes should apply to DELETE command');
SELECT policy_cmd_is('oauth2_app_scopes', 'oauth2_app_scopes_insert', 'INSERT', 'Policy oauth2_app_scopes_insert for table public.oauth2_app_scopes should apply to INSERT command');

ROLLBACK;
