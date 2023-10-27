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



ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY friend_requests_select
    ON public.friend_requests
    AS PERMISSIVE
    FOR SELECT
    USING (
        auth.grant() = 'password' AND
        (auth.uid() = requester_id OR auth.uid() = addressee_id)
    );

CREATE POLICY friend_requests_delete
    ON public.friend_requests
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND
        (auth.uid() = requester_id OR auth.uid() = addressee_id)
    );

CREATE POLICY friend_requests_insert
    ON public.friend_requests
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND 
        auth.uid() <> addressee_id AND
        NOT EXISTS (
            SELECT 1
            FROM public.friends
            WHERE user_id = auth.uid() AND friend_id = addressee_id
        )
    );



ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE VIEW public.friends_of_current_user AS
SELECT friend_id
FROM public.friends
WHERE user_id = auth.uid();

GRANT SELECT ON public.friends_of_current_user TO authenticated;

CREATE POLICY friends_select
    ON public.friends
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() = 'password' AND
                auth.uid() = user_id
            )
            OR
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                'friends.read' = ANY(auth.scopes())
            )  
            OR 
            (
                auth.grant() = 'password' AND
                user_id = ANY(SELECT friend_id FROM public.friends_of_current_user)
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = user_id AND friend_privacy_level = 2
                )
            )
            OR 
            (
                auth.grant() <> 'client_credentials' AND
                auth.grant() <> 'authorization_code' AND
                EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE (p.user_id = user_id AND friend_privacy_level = 0 AND p.is_private = FALSE) AND
                          (p.user_id = friend_id AND friend_privacy_level = 0 AND p.is_private = FALSE)
                )
            )
        )
    );

CREATE POLICY friends_delete
    ON public.friends
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND
        (auth.uid() = user_id OR auth.uid() = friend_id)
    );

CREATE POLICY friends_insert
    ON public.friends
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND
        (auth.uid() = user_id OR auth.uid() = friend_id) AND
        EXISTS (
            SELECT 1
            FROM public.friend_requests
            WHERE
                addressee_id = auth.uid() AND requester_id = friend_id
            UNION
            SELECT 1
            FROM public.friend_requests
            WHERE
                addressee_id = auth.uid() AND requester_id = user_id
        )
    );



CREATE OR REPLACE VIEW public.project_ids_by_jwt_organization AS
SELECT p.project_id
FROM public.projects p
WHERE p.organization_id = auth.jwt()->>'organization_id'::TEXT;

GRANT EXECUTE ON public.project_ids_by_jwt_organization TO authenticated;

ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventories_select
    ON public.inventories
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                'inventory.read' = ANY(auth.scopes())
            )
            OR 
            (
                auth.grant() = 'password' AND
                user_id = ANY(SELECT friend_id FROM public.friends_of_current_user)
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = user_id AND inventory_privacy_level = 2
                )
            )
            OR
            (
                auth.grant() <> 'client_credentials' AND
                auth.grant() <> 'authorization_code' AND
                EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = user_id AND inventory_privacy_level = 0 AND p.is_private = FALSE
                )
            )
        )
    );

CREATE POLICY inventories_update
    ON public.inventories
    AS PERMISSIVE
    FOR UPDATE
    USING (
        (
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                'inventory.update' = ANY(auth.scopes()) AND
                (SELECT project_id FROM public.items WHERE id = item_id) = ANY(SELECT project_id FROM public.project_ids_by_jwt_organization)
            )
            OR 
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                'inventory.update' = ANY(auth.scopes()) AND
                (SELECT project_id FROM public.items WHERE id = item_id) <> ANY(SELECT project_id FROM public.project_ids_by_jwt_organization) AND
                (amount < (SELECT amount FROM public.inventories i WHERE i.item_id = item_id AND i.user_id = auth.uid()))
            )
        )
    );
    
CREATE POLICY inventories_delete
    ON public.inventories
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'authorization_code' AND
        auth.uid() = user_id AND
        'inventory.update' = ANY(auth.scopes())
    );

CREATE POLICY inventories_insert
    ON public.inventories
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'authorization_code' AND
        auth.uid() = user_id AND
        'inventory.insert' = ANY(auth.scopes()) AND
        (SELECT project_id FROM public.items WHERE id = item_id) = ANY(SELECT project_id FROM public.project_ids_by_jwt_organization)
    );



ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_select
    ON public.items
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() = 'client_credentials' AND
                'items.read' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT project_id FROM project_ids_by_jwt_organization)
            )
            OR
            (
                auth.grant() <> 'client_credentials' AND
                auth.grant() <> 'authorization_code'
            )
        )
    );

CREATE POLICY items_update
    ON public.items
    AS PERMISSIVE
    FOR UPDATE
    USING (
        (
            (
                auth.grant() = 'client_credentials' AND
                'items.update' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT project_id FROM project_ids_by_jwt_organization)
            )
            OR
            (
                auth.grant() = 'password' AND
                EXISTS (
                    SELECT 1
                    FROM public.project_members pm
                    WHERE
                        pm.project_id = project_id AND
                        pm.member_id = auth.uid() AND
                        pm.role IN ('Admin', 'Editor', 'Moderator')
                )
            )
        )
    );

CREATE POLICY items_delete
    ON public.items
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            (
                auth.grant() = 'client_credentials' AND
                'items.delete' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT project_id FROM project_ids_by_jwt_organization)
            )
            OR
            (
                auth.grant() = 'password' AND
                EXISTS (
                    SELECT 1
                    FROM public.project_members pm
                    WHERE
                        pm.project_id = project_id AND
                        pm.member_id = auth.uid() AND
                        pm.role IN ('Admin', 'Editor', 'Moderator')
                )
            )
        )
    );

CREATE POLICY items_insert
    ON public.items
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        (
            (
                auth.grant() = 'client_credentials' AND
                'items.insert' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT project_id FROM project_ids_by_jwt_organization)
            )
            OR
            (
                auth.grant() = 'password' AND
                EXISTS (
                    SELECT 1
                    FROM public.project_members pm
                    WHERE
                        pm.project_id = project_id AND
                        pm.member_id = auth.uid() AND
                        pm.role IN ('Admin', 'Editor', 'Moderator')
                )
            )
        )
    );



ALTER TABLE public.oauth2_app_scopes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.oauth2_apps ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scopes ENABLE ROW LEVEL SECURITY;


