BEGIN;

SELECT plan(4);

SELECT policies_are('friends', ARRAY[
    'friends_select',
    'friends_delete',
    'friends_insert'
], 'Table public.friends should have friends_select, friends_delete and friends_insert policies');

SELECT policy_cmd_is('friends', 'friends_select', 'SELECT', 'Policy friends_select for table public.friends should apply to SELECT command');
SELECT policy_cmd_is('friends', 'friends_delete', 'DELETE', 'Policy friends_delete for table public.friends should apply to DELETE command');
SELECT policy_cmd_is('friends', 'friends_insert', 'INSERT', 'Policy friends_insert for table public.friends should apply to INSERT command');

ROLLBACK;
