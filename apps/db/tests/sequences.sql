BEGIN;

SELECT plan(28);

SELECT has_sequence('blocked_id_seq', 'public.blocked_id_seq should exist');
SELECT has_sequence('friends_id_seq', 'public.friends_id_seq should exist');
SELECT has_sequence('friend_requests_id_seq', 'public.friend_requests_id_seq should exist');
SELECT has_sequence('inventories_id_seq', 'public.inventories_id_seq should exist');
SELECT has_sequence('items_id_seq', 'public.items_id_seq should exist');
SELECT has_sequence('oauth2_app_scopes_id_seq', 'public.oauth2_app_scopes_id_seq should exist');
SELECT has_sequence('oauth2_apps_id_seq', 'public.oauth2_apps_id_seq should exist');
SELECT has_sequence('organization_members_id_seq', 'public.organization_members_id_seq should exist');
SELECT has_sequence('organizations_id_seq', 'public.organizations_id_seq should exist');
SELECT has_sequence('organization_requests_id_seq', 'public.organization_requests_id_seq should exist');
SELECT has_sequence('project_members_id_seq', 'public.project_members_id_seq should exist');
SELECT has_sequence('projects_id_seq', 'public.projects_id_seq should exist');
SELECT has_sequence('project_requests_id_seq', 'public.project_requests_id_seq should exist');
SELECT has_sequence('scopes_id_seq', 'public.scopes_id_seq should exist');

SELECT sequence_privs_are('blocked_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.blocked_id_seq sequence');
SELECT sequence_privs_are('friends_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.friends_id_seq sequence');
SELECT sequence_privs_are('friend_requests_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.friend_requests_id_seq sequence');
SELECT sequence_privs_are('inventories_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.inventories_id_seq sequence');
SELECT sequence_privs_are('items_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.items_id_seq sequence');
SELECT sequence_privs_are('oauth2_app_scopes_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.oauth2_app_scopes_id_seq sequence');
SELECT sequence_privs_are('oauth2_apps_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.oauth2_apps_id_seq sequence');
SELECT sequence_privs_are('organization_members_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.organization_members_id_seq sequence');
SELECT sequence_privs_are('organizations_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.organizations_id_seq sequence');
SELECT sequence_privs_are('organization_requests_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.organization_requests_id_seq sequence');
SELECT sequence_privs_are('project_members_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.project_members_id_seq sequence');
SELECT sequence_privs_are('projects_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.projects_id_seq sequence');
SELECT sequence_privs_are('project_requests_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.project_requests_id_seq sequence');
SELECT sequence_privs_are('scopes_id_seq', 'authenticated', ARRAY['SELECT', 'USAGE'], 'authenticated role has SELECT and USAGE privilege on public.scopes_id_seq sequence');

ROLLBACK;
