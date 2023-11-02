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
                auth.grant() NOT IN ('client_credentials', 'authorization_code') AND
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
SELECT id
FROM public.projects
WHERE organization_id = (auth.jwt()->>'organization_id')::INT;

GRANT SELECT ON public.project_ids_by_jwt_organization TO authenticated;



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
                    WHERE p.user_id = user_id AND p.inventory_privacy_level = 2
                )
            )
            OR
            (
                auth.grant() NOT IN ('client_credentials', 'authorization_code') AND
                EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = user_id AND p.inventory_privacy_level = 0 AND p.is_private = FALSE
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
                (SELECT project_id FROM public.items WHERE id = item_id) = ANY(SELECT id FROM public.project_ids_by_jwt_organization)
            )
            OR 
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                'inventory.update' = ANY(auth.scopes()) AND
                (SELECT project_id FROM public.items WHERE id = item_id) <> ANY(SELECT id FROM public.project_ids_by_jwt_organization) AND
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
        (SELECT project_id FROM public.items WHERE id = item_id) = ANY(SELECT id FROM public.project_ids_by_jwt_organization)
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
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization)
            )
            OR
            (
                auth.grant() NOT IN ('client_credentials', 'authorization_code')
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
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization)
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
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization)
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
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization)
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

CREATE POLICY oauth2_app_scopes_select
    ON public.oauth2_app_scopes
    AS PERMISSIVE
    FOR SELECT
    USING (
        auth.grant() = 'password'
    );

CREATE POLICY oauth2_app_scopes_delete
    ON public.oauth2_app_scopes
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND
        EXISTS (
            WITH app AS (
                SELECT oa.organization_id
                FROM public.oauth2_apps oa
                WHERE oa.id = app_id
            )
            SELECT 1
            FROM public.organization_members om
            WHERE
                om.organization_id = (SELECT organization_id FROM app) AND
                om.member_id = auth.uid() AND
                om.role IN ('Admin', 'Moderator')
        )
    );

CREATE POLICY oauth2_app_scopes_insert
    ON public.oauth2_app_scopes
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND 
        EXISTS (
            WITH app AS (
                SELECT oa.organization_id
                FROM public.oauth2_apps oa
                WHERE oa.id = app_id
            )
            SELECT 1
            FROM public.organization_members om
            WHERE
                om.organization_id = (SELECT organization_id FROM app) AND
                om.member_id = auth.uid() AND
                om.role IN ('Admin', 'Moderator')
        )
    );



ALTER TABLE public.oauth2_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth2_apps_select
    ON public.oauth2_apps
    AS PERMISSIVE
    FOR SELECT
    USING (
        auth.grant() = 'password' AND
        (
            EXISTS(
                SELECT 1
                FROM public.organization_members om
                WHERE
                    om.organization_id = organization_id AND
                    om.member_id = auth.uid() AND
                    om.role IN ('Admin', 'Moderator')
            ) OR
            client_secret IS NULL
        )
    );

CREATE POLICY oauth2_apps_update
    ON public.oauth2_apps
    AS PERMISSIVE
    FOR UPDATE
    USING (
        auth.grant() = 'password' AND
        EXISTS(
            SELECT 1
            FROM public.organization_members om
            WHERE
                om.organization_id = organization_id AND
                om.member_id = auth.uid() AND
                om.role IN ('Admin', 'Moderator')
        )
    );

CREATE POLICY oauth2_apps_delete
    ON public.oauth2_apps
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND
        EXISTS(
            SELECT 1
            FROM public.organization_members om
            WHERE
                om.organization_id = organization_id AND
                om.member_id = auth.uid() AND
                om.role IN ('Admin', 'Moderator')
        )
    );

CREATE POLICY oauth2_apps_insert
    ON public.oauth2_apps
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND
        EXISTS(
            SELECT 1
            FROM public.organization_members om
            WHERE
                om.organization_id = organization_id AND
                om.member_id = auth.uid() AND
                om.role IN ('Admin', 'Moderator')
        )
    );



ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_members_select
    ON public.organization_members
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            auth.grant() NOT IN ('client_credentials', 'authorization_code') AND
            EXISTS (
                SELECT 1
                FROM public.profiles AS p
                WHERE p.user_id = user_id AND p.is_private = FALSE
            )
        )
        OR
        (
            auth.grant() = 'client_credentials' AND
            'organization.members.read' = ANY(auth.scopes()) AND
            organization_id = (auth.jwt()->>'organization_id')::INT
        )
    );

CREATE POLICY organization_members_update
    ON public.organization_members
    AS PERMISSIVE
    FOR UPDATE
    USING (
        (
            (
                auth.grant() = 'password' AND
                (
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.organization_members om
                            WHERE
                                om.organization_id = organization_id AND
                                om.member_id = auth.uid() AND
                                om.role = 'Admin'
                        ) AND
                        (
                            member_id <> auth.uid() OR
                            (
                                role <> 'Admin' AND
                                (
                                    SELECT COUNT(*)
                                    FROM public.organization_members om
                                    WHERE
                                        om.organization_id = organization_id AND
                                        om.role = 'Admin'
                                ) >= 2
                            )
                        )
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.organization_members om
                            WHERE
                                om.organization_id = organization_id AND
                                om.member_id = auth.uid() AND
                                om.role = 'Moderator'
                        ) AND
                        role NOT IN ('Admin', 'Moderator')
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'project.members.update' = ANY(auth.scopes()) AND
                organization_id = (auth.jwt()->>'organization_id')::INT AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );

CREATE POLICY organization_members_delete
    ON public.organization_members
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            (
                auth.grant() = 'password' AND
                EXISTS(
                    SELECT 1
                    FROM public.organization_members om
                    WHERE
                        om.organization_id = organization_id AND
                        om.member_id = auth.uid()
                )
            )
            OR
            (
                auth.grant() = 'password' AND
                EXISTS(
                    SELECT 1
                    FROM public.organization_members om
                    WHERE
                        om.organization_id = organization_id AND
                        om.role = 'Admin'
                )
            )
            OR 
            (
                auth.grant() = 'password' AND
                EXISTS(
                    SELECT 1
                    FROM public.organization_members om
                    WHERE
                        om.organization_id = organization_id AND
                        om.role = 'Moderator'
                ) AND
                role NOT IN ('Admin', 'Moderator')
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'organization.members.delete' = ANY(auth.scopes()) AND
                organization_id = (auth.jwt()->>'organization_id')::INT AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );

CREATE POLICY organization_members_insert
    ON public.organization_members
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND
        auth.uid() = member_id AND
        (
            EXISTS (
                SELECT 1
                FROM public.organization_requests orq
                WHERE 
                    orq.organization_id = organization_id AND 
                    orq.addressee_id = auth.uid() AND
                    orq.role = role
            )
            OR
            (
                NOT EXISTS (
                    SELECT 1
                    FROM public.organization_members om
                    WHERE 
                        om.organization_id = organization_id AND
                        om.role = 'Admin'
                ) AND
                role = 'Admin'
            )
        )
    );



ALTER TABLE public.organization_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_requests_select
    ON public.organization_requests
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() = 'password' AND
                auth.uid() = addressee_id 
            )
            OR 
            (
                auth.grant() = 'password' AND
                EXISTS (
                    SELECT 1
                    FROM public.organization_members om
                    WHERE
                        om.organization_id = organization_id AND
                        om.member_id = auth.uid() AND
                        om.role IN ('Admin', 'Moderator')
                )
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                'organization.requests.read' = ANY(auth.scopes()) AND
                organization_id = (auth.jwt()->>'organization_id')::INT
            )
        )
    );

CREATE POLICY organization_requests_update
    ON public.organization_requests
    AS PERMISSIVE
    FOR UPDATE
    USING (
        (
            (
                auth.grant() = 'password' AND
                (
                    EXISTS (
                        SELECT 1
                        FROM public.organization_members om
                        WHERE
                            om.organization_id = organization_id AND
                            om.member_id = auth.uid() AND
                            om.role = 'Admin'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.organization_members om
                            WHERE
                                om.organization_id = organization_id AND
                                om.member_id = auth.uid() AND
                                om.role = 'Moderator'
                        ) AND
                        role NOT IN ('Admin', 'Moderator')
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'organization.requests.update' = ANY(auth.scopes()) AND
                organization_id = (auth.jwt()->>'organization_id')::INT AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );

CREATE POLICY organization_requests_delete
    ON public.organization_requests
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            (
                auth.grant() = 'password' AND
                (
                    auth.uid() = addressee_id OR
                    EXISTS (
                        SELECT 1
                        FROM public.organization_members om
                        WHERE
                            om.organization_id = organization_id AND
                            om.member_id = auth.uid() AND
                            om.role = 'Admin'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.organization_members om
                            WHERE
                                om.organization_id = organization_id AND
                                om.member_id = auth.uid() AND
                                om.role = 'Moderator'
                        ) AND
                        role NOT IN ('Admin', 'Moderator')
                    )
                )
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                'organization.requests.delete' = ANY(auth.scopes()) AND
                organization_id = (auth.jwt()->>'organization_id')::INT AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );

CREATE POLICY organization_requests_insert
    ON public.organization_requests
    AS PERMISSIVE
    FOR INSERT 
    WITH CHECK (
        (
            (
                auth.grant() = 'password' AND
                (
                    EXISTS (
                        SELECT 1
                        FROM public.organization_members om
                        WHERE
                            om.organization_id = organization_id AND
                            om.member_id = auth.uid() AND
                            om.role = 'Admin'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.organization_members om
                            WHERE
                                om.organization_id = organization_id AND
                                om.member_id = auth.uid() AND
                                om.role = 'Moderator'
                        ) AND
                        role NOT IN ('Admin', 'Moderator')
                    )
                )
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                'organization.requests.insert' = ANY(auth.scopes()) AND
                organization_id = (auth.jwt()->>'organization_id')::INT AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );



ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_select
    ON public.organizations
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() NOT IN ('client_credentials', 'authorization_code')
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'organization.read' = ANY(auth.scopes()) AND
                id = (auth.jwt()->>'organization_id')::INT
            )
        )
    );

CREATE POLICY organizations_update
    ON public.organizations
    AS PERMISSIVE
    FOR UPDATE
    USING (
        (
            (
                auth.grant() = 'password' AND 
                EXISTS (
                    SELECT 1
                    FROM public.organization_members om
                    WHERE
                        om.organization_id = id AND
                        om.member_id = auth.uid() AND
                        om.role IN ('Admin', 'Moderator')
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'organization.update' = ANY(auth.scopes()) AND
                id = (auth.jwt()->>'organization_id')::INT
            )
        )
    );

CREATE POLICY organizations_delete
    ON public.organizations
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND 
        EXISTS (
            SELECT 1
            FROM public.organization_members om
            WHERE
                om.organization_id = id AND
                om.member_id = auth.uid() AND
                om.role = 'Admin'
        )
    );

CREATE POLICY organizations_insert
    ON public.organizations
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password'
    );



ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select
    ON public.profiles
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() NOT IN ('client_credentials', 'authorization_code')
            )
            OR
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                'profile.read' = ANY(auth.scopes())
            )
        )
    );

CREATE POLICY profiles_update
    ON public.profiles
    AS PERMISSIVE
    FOR UPDATE
    USING (
        auth.grant() = 'password' AND
        auth.uid() = user_id
    );



ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_requests_select
    ON public.project_requests
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() = 'password' AND
                auth.uid() = addressee_id 
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
                        pm.role IN ('Admin', 'Moderator')
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'project.requests.read' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization)
            )
        )
    );

CREATE POLICY project_requests_update
    ON public.project_requests
    AS PERMISSIVE
    FOR UPDATE
    USING (
        (
            (
                auth.grant() = 'password' AND
                (
                    EXISTS (
                        SELECT 1
                        FROM public.project_members pm
                        WHERE
                            pm.project_id = project_id AND
                            pm.member_id = auth.uid() AND
                            pm.role = 'Admin'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.project_members pm
                            WHERE
                                pm.project_id = project_id AND
                                pm.member_id = auth.uid() AND
                                pm.role = 'Moderator'
                        ) AND
                        role NOT IN ('Admin', 'Moderator')
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'project.requests.update' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization) AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );

CREATE POLICY project_requests_delete
    ON public.project_requests
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            (
                auth.grant() = 'password' AND
                (
                    auth.uid() = addressee_id OR
                    EXISTS (
                        SELECT 1
                        FROM public.project_members pm
                        WHERE
                            pm.project_id = project_id AND
                            pm.member_id = auth.uid() AND
                            pm.role = 'Admin'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.project_members pm
                            WHERE
                                pm.project_id = project_id AND
                                pm.member_id = auth.uid() AND
                                pm.role = 'Moderator'
                        ) AND
                        role NOT IN ('Admin', 'Moderator')
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'project.requests.delete' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization) AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );

CREATE POLICY project_requests_insert
    ON public.project_requests
    AS PERMISSIVE
    FOR INSERT 
    WITH CHECK (
        (
            (
                auth.grant() = 'password' AND
                (
                    auth.uid() = addressee_id OR
                    EXISTS (
                        SELECT 1
                        FROM public.project_members pm
                        WHERE
                            pm.project_id = project_id AND
                            pm.member_id = auth.uid() AND
                            pm.role = 'Admin'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.project_members pm
                            WHERE
                                pm.project_id = project_id AND
                                pm.member_id = auth.uid() AND
                                pm.role = 'Moderator'
                        ) AND
                        role NOT IN ('Admin', 'Moderator')
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'project.requests.insert' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization) AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );



ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_members_select
    ON public.project_members
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() NOT IN ('client_credentials', 'authorization_code') AND
                    EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = user_id AND p.is_private = FALSE
                )
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                'project.members.read' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization)
            )
        )
    );

CREATE POLICY project_members_update
    ON public.project_members
    AS PERMISSIVE
    FOR UPDATE 
    USING (
        (
            (
                auth.grant() = 'password' AND
                (
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.project_members pm
                            WHERE
                                pm.project_id = project_id AND
                                pm.member_id = auth.uid() AND
                                pm.role = 'Admin'
                        ) AND
                        (
                            member_id <> auth.uid() OR
                            (
                                role <> 'Admin' AND
                                (
                                    SELECT COUNT(*)
                                    FROM public.project_members pm
                                    WHERE
                                        pm.project_id = project_id AND
                                        pm.role = 'Admin'
                                ) >= 2
                            )
                        )
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.project_members pm
                            WHERE
                                pm.project_id = project_id AND
                                pm.member_id = auth.uid() AND
                                pm.role = 'Moderator'
                        ) AND
                        role NOT IN ('Admin', 'Moderator')
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'project.members.update' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization) AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );

CREATE POLICY project_members_delete
    ON public.project_members
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            (
                auth.grant() = 'password' AND
                EXISTS(
                    SELECT 1
                    FROM public.project_members pm
                    WHERE
                        pm.project_id = project_id AND
                        pm.member_id = auth.uid()
                )
            )
            OR
            (
                auth.grant() = 'password' AND
                EXISTS(
                    SELECT 1
                    FROM public.project_members pm
                    WHERE
                        pm.project_id = project_id AND
                        pm.role = 'Admin'
                )
            )
            OR 
            (
                auth.grant() = 'password' AND
                EXISTS(
                    SELECT 1
                    FROM public.project_members pm
                    WHERE
                        pm.project_id = project_id AND
                        pm.role = 'Moderator'
                ) AND
                role NOT IN ('Admin', 'Moderator')
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                'project.members.delete' = ANY(auth.scopes()) AND
                project_id = ANY(SELECT id FROM project_ids_by_jwt_organization) AND
                role NOT IN ('Admin', 'Moderator')
            )
        )
    );

CREATE POLICY project_members_insert
    ON public.project_members
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND
        auth.uid() = member_id AND
        (
            EXISTS (
                SELECT 1
                FROM public.project_requests prq
                WHERE 
                    prq.project_id = project_id AND 
                    prq.addressee_id = auth.uid() AND
                    prq.role = role
            )
            OR
            EXISTS (
                SELECT 1
                FROM public.organization_members om
                WHERE
                    om.organization_id = organization_id AND
                    om.member_id = auth.uid() AND
                    om.role = 'Admin'
            )
        )
    );



ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select
    ON public.projects
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() NOT IN ('client_credentials', 'authorization_code')
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                'project.read' = ANY(auth.scopes()) AND
                id = ANY(SELECT id FROM project_ids_by_jwt_organization)
            )
        )
    );

CREATE POLICY projects_update
    ON public.projects
    AS PERMISSIVE
    FOR UPDATE
    USING (
        (
            (
                auth.grant() = 'password' AND 
                EXISTS (
                    SELECT 1
                    FROM public.project_members pm
                    WHERE
                        pm.project_id = id AND
                        pm.member_id = auth.uid() AND
                        pm.role IN ('Admin', 'Moderator')
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                'project.update' = ANY(auth.scopes()) AND
                id = ANY(SELECT id FROM project_ids_by_jwt_organization)
            )
        )
    );

CREATE POLICY projects_delete
    ON public.projects
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND 
        EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE
                pm.project_id = id AND
                pm.member_id = auth.uid() AND
                pm.role = 'Admin'
        )
    );

CREATE POLICY projects_insert
    ON public.projects
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND 
        EXISTS (
            SELECT 1
            FROM public.organization_members om
            WHERE
                om.organization_id = organization_id AND
                om.member_id = auth.uid() AND
                om.role = 'Admin'
        )
    );



ALTER TABLE public.scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scopes_select
    ON public.scopes
    AS PERMISSIVE
    FOR SELECT
    USING (
        auth.grant() <> 'authorization_code'
    );
