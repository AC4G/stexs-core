BEGIN;

SELECT plan(4);

SELECT policies_are('blocked', ARRAY[
    'blocked_select',
    'blocked_delete',
    'blocked_insert'
], 'Table public.blocked should have blocked_select, blocked_delete and blocked_insert policies');

SELECT policy_cmd_is('blocked', 'blocked_select', 'SELECT', 'Policy blocked_select for table public.blocked should apply to SELECT command');
SELECT policy_cmd_is('blocked', 'blocked_delete', 'DELETE', 'Policy blocked_delete for table public.blocked_delete should apply to DELETE command');
SELECT policy_cmd_is('blocked', 'blocked_insert', 'INSERT', 'Policy blocked_insert for table public.blocked_insert should apply to INSERT command');

ROLLBACK;
