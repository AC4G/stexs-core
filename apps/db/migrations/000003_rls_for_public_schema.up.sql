ALTER TABLE public.blocked ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_select
    ON public.blocked
    AS PERMISSIVE
    FOR SELECT
    USING (
        auth.grant() = 'password' AND 
        auth.uid() = blocker_id
    );

CREATE POLICY blocked_delete
    ON public.blocked
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND 
        auth.uid() = blocker_id
    );

CREATE POLICY blocked_insert
    ON public.blocked
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND 
        auth.uid() = blocker_id AND 
        auth.uid() <> blocked_id
    );  

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;



ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.oauth2_app_scopes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.oauth2_apps ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scopes ENABLE ROW LEVEL SECURITY;


