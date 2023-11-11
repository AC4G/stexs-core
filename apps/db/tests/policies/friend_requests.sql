BEGIN;

SELECT plan(4);

SELECT policies_are('friend_requests', ARRAY[
    'friend_requests_select',
    'friend_requests_delete',
    'friend_requests_insert'
], 'Table public.friend_requests should have friend_requests_select, friend_requests_delete and friend_requests_insert policies');

SELECT policy_cmd_is('friend_requests', 'friend_requests_select', 'SELECT', 'Policy friend_requests_select for table public.friend_requests should apply to SELECT command');
SELECT policy_cmd_is('friend_requests', 'friend_requests_delete', 'DELETE', 'Policy friend_requests_delete for table public.friend_requests should apply to DELETE command');
SELECT policy_cmd_is('friend_requests', 'friend_requests_insert', 'INSERT', 'Policy friend_requests_insert for table public.friend_requests should apply to INSERT command');

ROLLBACK;
