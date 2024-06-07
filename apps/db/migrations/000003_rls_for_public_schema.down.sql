ALTER TABLE public.blocked DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blocked_select ON public.blocked;
DROP POLICY IF EXISTS blocked_delete ON public.blocked;
DROP POLICY IF EXISTS blocked_insert ON public.blocked;

ALTER TABLE public.friend_requests DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friend_requests_select ON public.friend_requests;
DROP POLICY IF EXISTS friend_requests_delete ON public.friend_requests;
DROP POLICY IF EXISTS friend_requests_insert ON public.friend_requests;

REVOKE EXECUTE ON FUNCTION utils.is_selected_friend_a_friend_or_has_friend_with_current_user(UUID, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION utils.is_selected_friend_a_friend_or_has_friend_with_current_user(UUID, UUID) FROM anon;

DROP FUNCTION IF EXISTS utils.is_selected_friend_a_friend_or_has_friend_with_current_user(UUID, UUID);

ALTER TABLE public.friends DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friends_select ON public.friends;
DROP POLICY IF EXISTS friends_delete ON public.friends;
DROP POLICY IF EXISTS friends_insert ON public.friends;

ALTER TABLE public.inventories DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventories_select ON public.inventories;
DROP POLICY IF EXISTS inventories_update ON public.inventories;
DROP POLICY IF EXISTS inventories_delete ON public.inventories;
DROP POLICY IF EXISTS inventories_insert ON public.inventories;

ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS items_select ON public.items;
DROP POLICY IF EXISTS items_update ON public.items;
DROP POLICY IF EXISTS items_delete ON public.items;
DROP POLICY IF EXISTS items_insert ON public.items;

ALTER TABLE public.oauth2_app_scopes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oauth2_app_scopes_select ON public.oauth2_app_scopes;
DROP POLICY IF EXISTS oauth2_app_scopes_delete ON public.oauth2_app_scopes;
DROP POLICY IF EXISTS oauth2_app_scopes_insert ON public.oauth2_app_scopes;

ALTER TABLE public.oauth2_apps DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oauth2_apps_select ON public.oauth2_apps;
DROP POLICY IF EXISTS oauth2_apps_update ON public.oauth2_apps;
DROP POLICY IF EXISTS oauth2_apps_delete ON public.oauth2_apps;
DROP POLICY IF EXISTS oauth2_apps_insert ON public.oauth2_apps;

ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_members_select ON public.organization_members;
DROP POLICY IF EXISTS organization_members_update ON public.organization_members;
DROP POLICY IF EXISTS organization_members_delete ON public.organization_members;
DROP POLICY IF EXISTS organization_members_insert ON public.organization_members;

REVOKE EXECUTE ON FUNCTION utils.is_current_user_member_of_organization(INT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION utils.is_current_user_member_of_organization(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION utils.organization_members_update_policy(INT, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION utils.is_current_user_allowed_to_delete_organization_member(INT, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION utils.is_user_allowed_to_join_organization(INT, UUID, TEXT) FROM authenticated;

DROP FUNCTION IF EXISTS utils.is_user_allowed_to_join_organization(INT, UUID, TEXT);
DROP FUNCTION IF EXISTS utils.is_current_user_allowed_to_delete_organization_member(INT, UUID, TEXT);
DROP FUNCTION IF EXISTS utils.organization_members_update_policy(INT, UUID, TEXT);
DROP FUNCTION IF EXISTS utils.is_current_user_member_of_organization(INT);

ALTER TABLE public.organization_requests DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_requests_select ON public.organization_requests;
DROP POLICY IF EXISTS organization_requests_update ON public.organization_requests;
DROP POLICY IF EXISTS organization_requests_delete ON public.organization_requests;
DROP POLICY IF EXISTS organization_requests_insert ON public.organization_requests;

REVOKE EXECUTE ON FUNCTION utils.is_organization_request_with_role_owner_or_admin(INT, UUID) FROM authenticated;

DROP FUNCTION IF EXISTS utils.is_organization_request_with_role_owner_or_admin(INT, UUID);

ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select ON public.organizations;
DROP POLICY IF EXISTS organizations_update ON public.organizations;
DROP POLICY IF EXISTS organizations_delete ON public.organizations;
DROP POLICY IF EXISTS organizations_insert ON public.organizations;

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;

ALTER TABLE public.project_requests DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_requests_select ON public.project_requests;
DROP POLICY IF EXISTS project_requests_update ON public.project_requests;
DROP POLICY IF EXISTS project_requests_delete ON public.project_requests;
DROP POLICY IF EXISTS project_requests_insert ON public.project_requests;

REVOKE EXECUTE ON FUNCTION utils.is_project_request_with_role_owner_or_admin(INT, UUID) FROM authenticated;

DROP FUNCTION IF EXISTS utils.is_project_request_with_role_owner_or_admin(INT, UUID);

ALTER TABLE public.project_members DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_members_select ON public.project_members;
DROP POLICY IF EXISTS project_members_update ON public.project_members;
DROP POLICY IF EXISTS project_members_delete ON public.project_members;
DROP POLICY IF EXISTS project_members_insert ON public.project_members;

REVOKE EXECUTE ON FUNCTION utils.project_member_update_policy(INT, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION utils.is_current_user_allowed_to_delete_project_member(INT, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION utils.has_project_owner(INT) FROM authenticated;

DROP FUNCTION IF EXISTS utils.has_project_owner(INT);
DROP FUNCTION IF EXISTS utils.is_current_user_allowed_to_delete_project_member(INT, UUID, TEXT);
DROP FUNCTION IF EXISTS utils.project_member_update_policy(INT, UUID, TEXT);

ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select ON public.projects;
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete ON public.projects;
DROP POLICY IF EXISTS projects_insert ON public.projects;

ALTER TABLE public.scopes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scopes_select ON public.scopes;

ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_update ON public.notifications;
DROP POLICY IF EXISTS notifications_delete ON public.notifications;
DROP POLICY IF EXISTS notifications_insert ON public.notifications;

ALTER TABLE public.oauth2_connections DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oauth2_connections_select ON public.oauth2_connections;

ALTER TABLE public.oauth2_connection_scopes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oauth2_connection_scopes_select ON public.oauth2_connection_scopes;
