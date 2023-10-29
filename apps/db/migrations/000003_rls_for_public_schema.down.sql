ALTER TABLE public.blocked DISABLE ROW LEVEL SECURITY;

DROP POLICY blocked_select ON public.blocked;
DROP POLICY blocked_delete ON public.blocked;
DROP POLICY blocked_insert ON public.blocked;

ALTER TABLE public.friend_requests DISABLE ROW LEVEL SECURITY;

DROP POLICY friend_requests_select ON public.friend_requests;
DROP POLICY friend_requests_delete ON public.friend_requests;
DROP POLICY friend_requests_insert ON public.friend_requests;

ALTER TABLE public.friends DISABLE ROW LEVEL SECURITY;

DROP POLICY friends_select ON public.friends;
DROP POLICY friends_delete ON public.friends;
DROP POLICY friends_insert ON public.friends;

DROP VIEW public.friends_of_current_user;

ALTER TABLE public.inventories DISABLE ROW LEVEL SECURITY;

DROP POLICY inventories_select ON public.inventories;
DROP POLICY inventories_update ON public.inventories;
DROP POLICY inventories_delete ON public.inventories;
DROP POLICY inventories_insert ON public.inventories;

ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;

DROP POLICY items_select ON public.items;
DROP POLICY items_update ON public.items;
DROP POLICY items_delete ON public.items;
DROP POLICY items_insert ON public.items;

ALTER TABLE public.oauth2_app_scopes DISABLE ROW LEVEL SECURITY;

DROP POLICY oauth2_app_scopes_select ON public.oauth2_app_scopes;
DROP POLICY oauth2_app_scopes_delete ON public.oauth2_app_scopes;
DROP POLICY oauth2_app_scopes_insert ON public.oauth2_app_scopes;

ALTER TABLE public.oauth2_apps DISABLE ROW LEVEL SECURITY;

DROP POLICY oauth2_apps_select ON public.oauth2_apps;
DROP POLICY oauth2_apps_update ON public.oauth2_apps;
DROP POLICY oauth2_apps_delete ON public.oauth2_apps;
DROP POLICY oauth2_apps_insert ON public.oauth2_apps;

ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

DROP POLICY organizations_select ON public.organizations;
DROP POLICY organizations_update ON public.organizations;
DROP POLICY organizations_delete ON public.organizations;
DROP POLICY organizations_insert ON public.organizations;

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY profiles_select ON public.profiles;
DROP POLICY profiles_update ON public.profiles;

ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

DROP POLICY projects_select ON public.projects;
DROP POLICY projects_update ON public.projects;
DROP POLICY projects_delete ON public.projects;
DROP POLICY projects_insert ON public.projects;

ALTER TABLE public.scopes DISABLE ROW LEVEL SECURITY;

DROP POLICY scopes_select ON public.scopes;