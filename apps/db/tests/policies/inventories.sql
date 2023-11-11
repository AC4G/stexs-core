BEGIN;

SELECT plan(5);

SELECT policies_are('inventories', ARRAY[
    'inventories_select',
    'inventories_update',
    'inventories_delete',
    'inventories_insert'
], 'Table public.inventories should have inventories_select, inventories_update, inventories_delete and inventories_insert policies');

SELECT policy_cmd_is('inventories', 'inventories_select', 'SELECT', 'Policy inventories_select for table public.inventories should apply to SELECT command');
SELECT policy_cmd_is('inventories', 'inventories_update', 'UPDATE', 'Policy inventories_update for table public.inventories should apply to UPDATE command');
SELECT policy_cmd_is('inventories', 'inventories_delete', 'DELETE', 'Policy inventories_delete for table public.inventories should apply to DELETE command');
SELECT policy_cmd_is('inventories', 'inventories_insert', 'INSERT', 'Policy inventories_insert for table public.inventories should apply to INSERT command');

ROLLBACK;
