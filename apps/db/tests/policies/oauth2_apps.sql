BEGIN;

SELECT plan(5);

SELECT policies_are('oauth2_apps', ARRAY[
    'oauth2_apps_select',
    'oauth2_apps_update',
    'oauth2_apps_delete',
    'oauth2_apps_insert'
], 'Table public.oauth2_apps should have oauth2_apps_select, oauth2_apps_update, oauth2_apps_delete and oauth2_apps_insert policies');

SELECT policy_cmd_is('oauth2_apps', 'oauth2_apps_select', 'SELECT', 'Policy oauth2_apps_select for table public.oauth2_apps should apply to SELECT command');
SELECT policy_cmd_is('oauth2_apps', 'oauth2_apps_update', 'UPDATE', 'Policy oauth2_apps_update for table public.oauth2_apps should apply to UPDATE command');
SELECT policy_cmd_is('oauth2_apps', 'oauth2_apps_delete', 'DELETE', 'Policy oauth2_apps_delete for table public.oauth2_apps should apply to DELETE command');
SELECT policy_cmd_is('oauth2_apps', 'oauth2_apps_insert', 'INSERT', 'Policy oauth2_apps_insert for table public.oauth2_apps should apply to INSERT command');

ROLLBACK;
