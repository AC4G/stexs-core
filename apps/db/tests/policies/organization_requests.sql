BEGIN;

SELECT plan(5);

SELECT policies_are('organization_requests', ARRAY[
    'organization_requests_select',
    'organization_requests_update',
    'organization_requests_delete',
    'organization_requests_insert'
], 'Table public.organization_requests should have organization_requests_select, organization_requests_update, organization_requests_delete and organization_requests_insert policies');

SELECT policy_cmd_is('organization_requests', 'organization_requests_select', 'SELECT', 'Policy organization_requests_select for table public.organization_requests should apply to SELECT command');
SELECT policy_cmd_is('organization_requests', 'organization_requests_update', 'UPDATE', 'Policy organization_requests_update for table public.organization_requests should apply to UPDATE command');
SELECT policy_cmd_is('organization_requests', 'organization_requests_delete', 'DELETE', 'Policy organization_requests_delete for table public.organization_requests should apply to DELETE command');
SELECT policy_cmd_is('organization_requests', 'organization_requests_insert', 'INSERT', 'Policy organization_requests_insert for table public.organization_requests should apply to INSERT command');

ROLLBACK;
