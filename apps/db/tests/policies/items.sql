BEGIN;

SELECT plan(5);

SELECT policies_are('items', ARRAY[
    'items_select',
    'items_update',
    'items_delete',
    'items_insert'
], 'Table public.items should have items_select, items_update, items_delete and items_insert policies');

SELECT policy_cmd_is('items', 'items_select', 'SELECT', 'Policy items_select for table public.items should apply to SELECT command');
SELECT policy_cmd_is('items', 'items_update', 'UPDATE', 'Policy items_update for table public.items should apply to UPDATE command');
SELECT policy_cmd_is('items', 'items_delete', 'DELETE', 'Policy items_delete for table public.items should apply to DELETE command');
SELECT policy_cmd_is('items', 'items_insert', 'INSERT', 'Policy items_insert for table public.items should apply to INSERT command');

ROLLBACK;
