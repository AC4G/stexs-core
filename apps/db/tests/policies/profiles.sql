BEGIN;

SELECT plan(3);

SELECT policies_are('profiles', ARRAY[
    'profiles_select',
    'profiles_update'
], 'Table public.profiles should have profiles_select and profiles_update policies');

SELECT policy_cmd_is('profiles', 'profiles_select', 'SELECT', 'Policy profiles_select for table public.profiles should apply to SELECT command');
SELECT policy_cmd_is('profiles', 'profiles_update', 'UPDATE', 'Policy profiles_update for table public.profiles should apply to UPDATE command');

ROLLBACK;
