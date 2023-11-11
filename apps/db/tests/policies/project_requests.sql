BEGIN;

SELECT plan(5);

SELECT policies_are('project_requests', ARRAY[
    'project_requests_select',
    'project_requests_update',
    'project_requests_delete',
    'project_requests_insert'
], 'Table public.project_requests should have project_requests_select, project_requests_update, project_requests_delete and project_requests_insert policies');

SELECT policy_cmd_is('project_requests', 'project_requests_select', 'SELECT', 'Policy project_requests_select for table public.project_requests should apply to SELECT command');
SELECT policy_cmd_is('project_requests', 'project_requests_update', 'UPDATE', 'Policy project_requests_update for table public.project_requests should apply to UPDATE command');
SELECT policy_cmd_is('project_requests', 'project_requests_delete', 'DELETE', 'Policy project_requests_delete for table public.project_requests should apply to DELETE command');
SELECT policy_cmd_is('project_requests', 'project_requests_insert', 'INSERT', 'Policy project_requests_insert for table public.project_requests should apply to INSERT command');

ROLLBACK;
