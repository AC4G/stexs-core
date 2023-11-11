BEGIN;

SELECT plan(5);

SELECT policies_are('organizations', ARRAY[
    'organizations_select',
    'organizations_update',
    'organizations_delete',
    'organizations_insert'
], 'Table public.organizations should have organizations_select, organizations_update, organizations_delete and organizations_insert policies');

SELECT policy_cmd_is('organizations', 'organizations_select', 'SELECT', 'Policy organizations_select for table public.organizations should apply to SELECT command');
SELECT policy_cmd_is('organizations', 'organizations_update', 'UPDATE', 'Policy organizations_update for table public.organizations should apply to UPDATE command');
SELECT policy_cmd_is('organizations', 'organizations_delete', 'DELETE', 'Policy organizations_delete for table public.organizations should apply to DELETE command');
SELECT policy_cmd_is('organizations', 'organizations_insert', 'INSERT', 'Policy organizations_insert for table public.organizations should apply to INSERT command');

ROLLBACK;
