BEGIN;

SELECT plan(5);

SELECT policies_are('project_members', ARRAY[
    'project_members_select',
    'project_members_update',
    'project_members_delete',
    'project_members_insert'
], 'Table public.project_members should have project_members_select, project_members_update, project_members_delete and project_members_insert policies');

SELECT policy_cmd_is('project_members', 'project_members_select', 'SELECT', 'Policy project_members_select for table public.project_members should apply to SELECT command');
SELECT policy_cmd_is('project_members', 'project_members_update', 'UPDATE', 'Policy project_members_update for table public.project_members should apply to UPDATE command');
SELECT policy_cmd_is('project_members', 'project_members_delete', 'DELETE', 'Policy project_members_delete for table public.project_members should apply to DELETE command');
SELECT policy_cmd_is('project_members', 'project_members_insert', 'INSERT', 'Policy project_members_insert for table public.project_members should apply to INSERT command');

ROLLBACK;
