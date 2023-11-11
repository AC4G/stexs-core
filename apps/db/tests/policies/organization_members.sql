BEGIN;

SELECT plan(5);

SELECT policies_are('organization_members', ARRAY[
    'organization_members_select',
    'organization_members_update',
    'organization_members_delete',
    'organization_members_insert'
], 'Table public.organization_members should have organization_members_select, organization_members_update, organization_members_delete and organization_members_insert policies');

SELECT policy_cmd_is('organization_members', 'organization_members_select', 'SELECT', 'Policy organization_members_select for table public.organization_members should apply to SELECT command');
SELECT policy_cmd_is('organization_members', 'organization_members_update', 'UPDATE', 'Policy organization_members_update for table public.organization_members should apply to UPDATE command');
SELECT policy_cmd_is('organization_members', 'organization_members_delete', 'DELETE', 'Policy organization_members_delete for table public.organization_members should apply to DELETE command');
SELECT policy_cmd_is('organization_members', 'organization_members_insert', 'INSERT', 'Policy organization_members_insert for table public.organization_members should apply to INSERT command');

ROLLBACK;
