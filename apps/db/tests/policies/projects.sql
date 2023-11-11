BEGIN;

SELECT plan(5);

SELECT policies_are('projects', ARRAY[
    'projects_select',
    'projects_update',
    'projects_delete',
    'projects_insert'
], 'Table public.projects should have projects_select, projects_update, projects_delete and projects_insert policies');

SELECT policy_cmd_is('projects', 'projects_select', 'SELECT', 'Policy projects_select for table public.projects should apply to SELECT command');
SELECT policy_cmd_is('projects', 'projects_update', 'UPDATE', 'Policy projects_update for table public.projects should apply to UPDATE command');
SELECT policy_cmd_is('projects', 'projects_delete', 'DELETE', 'Policy projects_delete for table public.projects should apply to DELETE command');
SELECT policy_cmd_is('projects', 'projects_insert', 'INSERT', 'Policy projects_insert for table public.projects should apply to INSERT command');

ROLLBACK;
