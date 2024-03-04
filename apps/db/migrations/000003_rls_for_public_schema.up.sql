ALTER TABLE public.blocked ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_select
    ON public.blocked
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.uid() = blocker_id OR
                auth.uid() = blocked_id
            )
        ) AND 
        (
            (
                auth.grant() = 'password'
            ) OR 
            (
                auth.grant() = 'authorization_code' AND
                utils.has_client_scope(34)
            )
        )
    );

CREATE POLICY blocked_delete
    ON public.blocked
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.uid() = blocker_id AND
        (
            auth.grant() = 'password' OR
            (
                auth.grant() = 'authorization_code' AND
                utils.has_client_scope(36)
            )
        )
    );

CREATE POLICY blocked_insert
    ON public.blocked
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.uid() = blocker_id AND
        (
            auth.grant() = 'password' OR
            (
                auth.grant() = 'authorization_code' AND
                utils.has_client_scope(35)
            )
        )
    );  



ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY friend_requests_select
    ON public.friend_requests
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            auth.uid() = requester_id OR 
            auth.uid() = addressee_id
        ) AND
        (
            auth.grant() = 'password' OR
            (
                auth.grant() = 'authorization_code' AND
                utils.has_client_scope(30)
            )
        )
    );

CREATE POLICY friend_requests_delete
    ON public.friend_requests
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            auth.uid() = requester_id OR 
            auth.uid() = addressee_id
        ) AND
        (
            auth.grant() = 'password' OR
            (
                auth.grant() = 'authorization_code' AND
                utils.has_client_scope(31)
            )
        )
    );

CREATE POLICY friend_requests_insert
    ON public.friend_requests
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK ( 
        auth.uid() <> addressee_id AND
        NOT EXISTS (
            SELECT 1
            FROM public.friends AS f
            WHERE f.user_id = auth.uid() 
                AND f.friend_id = addressee_id
        ) AND 
        (
            auth.grant() = 'password' OR
            (
                auth.grant() = 'authorization_code' AND
                utils.has_client_scope(29)
            )
        ) AND 
        NOT EXISTS (
            SELECT 1
            FROM public.blocked AS b
            WHERE b.blocker_id = addressee_id 
                AND b.blocked_id = requester_id
            UNION
            SELECT 1
            FROM public.blocked AS b
            WHERE b.blocker_id = requester_id
                AND b.blocked_id = addressee_id
        ) AND
        NOT EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.user_id = addressee_id 
                AND p.accept_friend_requests IS FALSE
        )
    );



CREATE OR REPLACE FUNCTION utils.is_selected_friend_a_friend_or_has_friend_with_current_user(_user_id UUID, _friend_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.friends AS f
        WHERE f.user_id = auth.uid() 
            AND f.friend_id = _user_id 
        UNION
        SELECT 1
        FROM public.friends AS f
        WHERE f.user_id = auth.uid() 
            AND f.friend_id = _friend_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.is_selected_friend_a_friend_or_has_friend_with_current_user(_user_id UUID, _friend_id UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION utils.is_selected_friend_a_friend_or_has_friend_with_current_user(_user_id UUID, _friend_id UUID) TO anon;

CREATE POLICY friends_select
    ON public.friends
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() IS NULL AND
                NOT EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = public.friends.user_id
                        AND p.is_private IS TRUE 
                    UNION
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = friend_id 
                        AND p.is_private IS TRUE
                )
            )
            OR
            (
                auth.grant() = 'password' AND
                (
                    auth.uid() = user_id OR
                    auth.uid() = friend_id
                )
            )
            OR
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                utils.has_client_scope(1)
            )  
            OR 
            (
                auth.grant() = 'password' AND
                utils.is_selected_friend_a_friend_or_has_friend_with_current_user(user_id, friend_id)
            )
            OR 
            (
                auth.grant() = 'password' AND
                NOT EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = public.friends.user_id 
                        AND p.is_private IS TRUE
                    UNION
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = friend_id 
                        AND p.is_private IS TRUE
                ) AND
                NOT EXISTS (
                    SELECT 1
                    FROM public.blocked AS b
                    WHERE b.blocker_id = user_id 
                        AND b.blocked_id = auth.uid()
                    UNION
                    SELECT 1
                    FROM public.blocked AS b
                    WHERE b.blocker_id = auth.uid() 
                        AND b.blocked_id = user_id
                    UNION
                    SELECT 1
                    FROM public.blocked AS b
                    WHERE b.blocker_id = friend_id 
                        AND b.blocked_id = auth.uid()
                    UNION
                    SELECT 1
                    FROM public.blocked AS b
                    WHERE b.blocker_id = auth.uid() 
                        AND b.blocked_id = friend_id
                )
            )
        )
    );

CREATE POLICY friends_delete
    ON public.friends
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            auth.uid() = user_id OR 
            auth.uid() = friend_id
        ) AND
        (
            auth.grant() = 'password' OR
            (
                auth.grant() = 'authorization_code' AND
                utils.has_client_scope(33)
            )
        )
    );

CREATE POLICY friends_insert
    ON public.friends
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        (auth.uid() = user_id OR auth.uid() = friend_id) AND
        EXISTS (
            SELECT 1
            FROM public.friend_requests AS fr
            WHERE fr.addressee_id = auth.uid() 
                AND fr.requester_id = friend_id
            UNION
            SELECT 1
            FROM public.friend_requests AS fr
            WHERE fr.addressee_id = auth.uid() 
                AND fr.requester_id = user_id
        ) AND
        (
            auth.grant() = 'password' OR
            (
                auth.grant() = 'authorization_code' AND
                utils.has_client_scope(32)
            )
        )
    );



ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventories_select
    ON public.inventories
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() = 'password' AND
                (
                    auth.uid() = user_id OR
                    EXISTS (
                        SELECT 1 
                        FROM public.friends AS fr
                        WHERE fr.user_id = auth.uid() 
                            AND fr.friend_id = user_id
                    ) OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.profiles AS p
                            WHERE p.user_id = public.inventories.user_id 
                                AND p.is_private IS FALSE
                        ) AND
                        NOT EXISTS (
                            SELECT 1
                            FROM public.blocked AS b
                            WHERE b.blocker_id = user_id 
                                AND b.blocked_id = auth.uid()
                            UNION
                            SELECT 1
                            FROM public.blocked AS b
                            WHERE b.blocker_id = auth.uid() 
                                AND b.blocked_id = user_id
                        )
                    )
                )
            )
            OR
            (
                auth.grant() IS NULL AND
                EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = public.inventories.user_id 
                        AND p.is_private IS FALSE
                )
            )
            OR
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                utils.has_client_scope(6)
            )
        )
    );

CREATE POLICY inventories_update
    ON public.inventories
    AS PERMISSIVE
    FOR UPDATE
    USING (
        auth.grant() = 'authorization_code' AND
        auth.uid() = user_id AND
        utils.has_client_scope(7)
    );
    
CREATE POLICY inventories_delete
    ON public.inventories
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'authorization_code' AND
        auth.uid() = user_id AND
        utils.has_client_scope(8)
    );

CREATE POLICY inventories_insert
    ON public.inventories
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'authorization_code' AND
        auth.uid() = user_id AND
        utils.has_client_scope(9)
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
                utils.has_client_scope(2)
            )
            OR
            (
                auth.grant() = 'password' OR
                auth.grant() IS NULL
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
                utils.has_client_scope(3) AND
                EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                    WHERE p.id = project_id
                        AND (
                            oa.project_id = public.items.project_id OR
                            oa.project_id IS NULL
                        )
                        AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                )
            )
            OR
            (
                auth.grant() = 'password' AND
                EXISTS (
                    SELECT 1
                    FROM public.project_members AS pm
                    WHERE pm.project_id = public.items.project_id 
                        AND pm.member_id = auth.uid() 
                        AND pm.role IN ('Owner', 'Admin')
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
                utils.has_client_scope(4) AND
                EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                    WHERE p.id = project_id 
                        AND (
                            oa.project_id = public.items.project_id OR
                            oa.project_id IS NULL
                        )
                        AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                )
            )
            OR
            (
                auth.grant() = 'password' AND
                EXISTS (
                    SELECT 1
                    FROM public.project_members AS pm
                    WHERE pm.project_id = public.items.project_id 
                        AND pm.member_id = auth.uid() 
                        AND pm.role IN ('Owner', 'Admin')
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
                utils.has_client_scope(5) AND
                EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                    WHERE p.id = project_id 
                        AND (
                            oa.project_id = public.items.project_id OR
                            oa.project_id IS NULL
                        )
                        AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                )
            )
            OR
            (
                auth.grant() = 'password' AND
                EXISTS (
                    SELECT 1
                    FROM public.project_members AS pm
                    WHERE pm.project_id = public.items.project_id 
                        AND pm.member_id = auth.uid() 
                        AND pm.role IN ('Owner', 'Admin')
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
        auth.grant() = 'password' AND
        (
            (SELECT type FROM public.scopes WHERE id = scope_id) = 'user' OR
            EXISTS (
                SELECT 1
                FROM public.organization_members AS om
                JOIN public.oauth2_apps AS oa ON om.organization_id = oa.organization_id
                WHERE oa.id = app_id 
                    AND om.member_id = auth.uid() 
                    AND om.role IN ('Owner', 'Admin')
            )
        )
    );

CREATE POLICY oauth2_app_scopes_delete
    ON public.oauth2_app_scopes
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND
        EXISTS (
            SELECT 1
            FROM public.organization_members AS om
            JOIN public.oauth2_apps AS oa ON om.organization_id = oa.organization_id
            WHERE oa.id = app_id 
                AND om.member_id = auth.uid() 
                AND om.role IN ('Owner', 'Admin')
        )
    );

CREATE POLICY oauth2_app_scopes_insert
    ON public.oauth2_app_scopes
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND 
        EXISTS (
            SELECT 1
            FROM public.organization_members AS om
            JOIN public.oauth2_apps AS oa ON om.organization_id = oa.organization_id
            WHERE oa.id = app_id 
                AND om.member_id = auth.uid() 
                AND om.role IN ('Owner', 'Admin')
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
                FROM public.organization_members AS om
                WHERE om.organization_id = public.oauth2_apps.organization_id 
                    AND om.member_id = auth.uid() 
                    AND om.role IN ('Owner', 'Admin')
            )
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
            FROM public.organization_members AS om
            WHERE om.organization_id = public.oauth2_apps.organization_id 
                AND om.member_id = auth.uid() 
                AND om.role IN ('Owner', 'Admin')
        ) AND
        (
            project_id IS NULL OR
            EXISTS (
                SELECT 1
                FROM public.projects AS p
                WHERE p.id = project_id
                    AND p.organization_id = public.oauth2_apps.organization_id
            )
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
            FROM public.organization_members AS om
            WHERE om.organization_id = public.oauth2_apps.organization_id 
                AND om.member_id = auth.uid() 
                AND om.role IN ('Owner', 'Admin')
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
            FROM public.organization_members AS om
            WHERE om.organization_id = public.oauth2_apps.organization_id 
                AND om.member_id = auth.uid() 
                AND om.role IN ('Owner', 'Admin')
        ) AND
        (
            project_id IS NULL OR
            EXISTS (
                SELECT 1
                FROM public.projects AS p
                WHERE p.id = project_id
                    AND p.organization_id = public.oauth2_apps.organization_id
            )
        )
    );



ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION utils.is_current_user_member_of_organization(_organization_id INT) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members AS om
        WHERE om.organization_id = _organization_id 
            AND om.member_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.is_current_user_member_of_organization(_organization_id INT) TO authenticated;
GRANT EXECUTE ON FUNCTION utils.is_current_user_member_of_organization(_organization_id INT) TO anon;

CREATE POLICY organization_members_select
    ON public.organization_members
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            (
                auth.grant() IS NULL OR
                auth.grant() = 'password'
            ) AND
            EXISTS (
                SELECT 1
                FROM public.profiles AS p
                WHERE p.user_id = member_id
                    AND p.is_private IS FALSE
            )
        )
        OR
        (
            auth.grant() = 'password' AND
            utils.is_current_user_member_of_organization(organization_id)
        )
        OR
        (
            auth.grant() = 'client_credentials' AND
            utils.has_client_scope(22) AND
            organization_id = (auth.jwt()->>'organization_id')::INT
        )
    );

CREATE OR REPLACE FUNCTION utils.organization_members_update_policy(_organization_id INT, _member_id UUID, _role TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    SELECT role
    INTO current_user_role
    FROM public.organization_members AS om
    WHERE om.member_id = auth.uid() 
        AND om.organization_id = _organization_id;

    RETURN (
        (
            auth.grant() = 'password' AND
            auth.uid() <> _member_id AND
            (
                (
                    current_user_role = 'Owner' AND
                    NOT EXISTS (
                        SELECT 1
                        FROM public.organization_members AS om
                        WHERE om.member_id = _member_id 
                            AND om.organization_id = _organization_id 
                            AND om.role = 'Owner'
                    )
                )
                OR
                (
                    current_user_role = 'Admin' AND
                    NOT EXISTS (
                        SELECT 1
                        FROM public.organization_members AS om
                        WHERE om.member_id = _member_id 
                            AND om.organization_id = _organization_id 
                            AND om.role IN ('Owner', 'Admin')
                    ) AND
                    _role NOT IN ('Owner', 'Admin')
                )
            )
        )
        OR
        (
            auth.grant() = 'client_credentials' AND
            utils.has_client_scope(23) AND
            _organization_id = (auth.jwt()->>'organization_id')::INT AND
            role NOT IN ('Owner', 'Admin') AND
            NOT EXISTS (
                SELECT 1
                FROM public.organization_members AS om
                WHERE om.organization_id = _organization_id 
                    AND om.member_id = _member_id 
                    AND om.role IN ('Owner', 'Admin')
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.organization_members_update_policy(_organization_id INT, _member_id UUID, _role TEXT) TO authenticated;

CREATE POLICY organization_members_update
    ON public.organization_members
    AS PERMISSIVE
    FOR UPDATE
    USING (
        utils.organization_members_update_policy(organization_id, member_id, role)
    );

CREATE OR REPLACE FUNCTION utils.is_current_user_allowed_to_delete_organization_member(_organization_id INT, _member_id UUID, _role TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    SELECT role
    INTO current_user_role
    FROM public.organization_members AS om
    WHERE om.member_id = auth.uid() 
        AND om.organization_id = _organization_id;

    RETURN (
        auth.grant() = 'password' AND
        (
            (
                auth.uid() = _member_id AND
                _role in ('Admin', 'Moderator', 'Member')
            )
            OR
            (
                auth.uid() = _member_id AND
                (
                    SELECT COUNT(*)
                    FROM public.organization_members AS om
                    WHERE om.organization_id = _organization_id
                        AND om.role = 'Owner'
                ) > 1 AND
                _role = 'Owner'
            )
            OR
            (
                current_user_role = 'Owner' AND
                _role in ('Admin', 'Moderator', 'Member')
            )
            OR
            (
                current_user_role = 'Admin' AND
                _role in ('Moderator', 'Member')
            )
            OR
            (
                current_user_role = 'Moderator' AND
                _role = 'Member'
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.is_current_user_allowed_to_delete_organization_member(_organization_id INT, _member_id UUID, _role TEXT) TO authenticated;

CREATE POLICY organization_members_delete
    ON public.organization_members
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            utils.is_current_user_allowed_to_delete_organization_member(organization_id, member_id, role)
            OR
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(24) AND
                organization_id = (auth.jwt()->>'organization_id')::INT AND
                role NOT IN ('Owner', 'Admin')
            )
        )
    );

CREATE OR REPLACE FUNCTION utils.is_user_allowed_to_join_organization(_organization_id INT, _member_id UUID, _role TEXT) RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.grant() = 'password' AND
        auth.uid() = _member_id AND
        (
            EXISTS (
                SELECT 1
                FROM public.organization_requests AS orq
                WHERE orq.organization_id = _organization_id 
                    AND orq.addressee_id = auth.uid() 
                    AND orq.role = _role
            )
            OR
            (
                NOT EXISTS (
                    SELECT 1
                    FROM public.organization_members AS om
                    WHERE om.organization_id = _organization_id 
                        AND om.role = 'Owner'
                ) AND
                _role = 'Owner'
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.is_user_allowed_to_join_organization(_organization_id INT, _member_id UUID, _role TEXT) TO authenticated;

CREATE POLICY organization_members_insert
    ON public.organization_members
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        utils.is_user_allowed_to_join_organization(organization_id, member_id, role)
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
                    FROM public.organization_members AS om
                    WHERE om.organization_id = public.organization_requests.organization_id 
                        AND om.member_id = auth.uid() 
                        AND om.role IN ('Owner', 'Admin')
                )
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(25) AND
                organization_id = (auth.jwt()->>'organization_id')::INT
            )
        )
    );

CREATE OR REPLACE FUNCTION utils.is_organization_request_with_role_owner_or_admin(_organization_id INT, _addressee_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_requests AS orq
        WHERE orq.organization_id = _organization_id 
            AND orq.addressee_id = _addressee_id 
            AND orq.role IN ('Owner', 'Admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.is_organization_request_with_role_owner_or_admin(_organization_id INT, _addressee_id UUID) TO authenticated;

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
                        FROM public.organization_members AS om
                        WHERE om.organization_id = public.organization_requests.organization_id 
                            AND om.member_id = auth.uid() 
                            AND om.role = 'Owner'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.organization_members AS om
                            WHERE om.organization_id = public.organization_requests.organization_id 
                                AND om.member_id = auth.uid() 
                                AND om.role = 'Admin'
                        ) AND
                        role NOT IN ('Owner', 'Admin') AND
                        NOT utils.is_organization_request_with_role_owner_or_admin(organization_id, addressee_id)
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(26) AND
                organization_id = (auth.jwt()->>'organization_id')::INT AND
                role NOT IN ('Owner', 'Admin') AND 
                NOT utils.is_organization_request_with_role_owner_or_admin(organization_id, addressee_id)
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
                        FROM public.organization_members AS om
                        WHERE om.organization_id = public.organization_requests.organization_id 
                            AND om.member_id = auth.uid() 
                            AND om.role = 'Owner'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.organization_members AS om
                            WHERE om.organization_id = public.organization_requests.organization_id 
                                AND om.member_id = auth.uid() 
                                AND om.role = 'Admin'
                        ) AND
                        role NOT IN ('Owner', 'Admin')
                    )
                )
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(27) AND
                organization_id = (auth.jwt()->>'organization_id')::INT AND
                role NOT IN ('Owner', 'Admin')
            )
        )
    );

CREATE POLICY organization_requests_insert
    ON public.organization_requests
    AS PERMISSIVE
    FOR INSERT 
    WITH CHECK (
        (
            NOT EXISTS (
                SELECT 1
                FROM public.organization_members AS om
                WHERE om.organization_id = public.organization_requests.organization_id 
                    AND om.member_id = addressee_id   
            ) AND
            (
                (
                    auth.grant() = 'password' AND
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.organization_members AS om
                            WHERE om.organization_id = public.organization_requests.organization_id 
                                AND om.member_id = auth.uid() 
                                AND om.role = 'Owner'
                        )
                        OR
                        (
                            EXISTS (
                                SELECT 1
                                FROM public.organization_members AS om
                                WHERE om.organization_id = public.organization_requests.organization_id 
                                    AND om.member_id = auth.uid() 
                                    AND om.role = 'Admin'
                            ) AND
                            role NOT IN ('Owner', 'Admin')
                        )
                    )
                )
                OR 
                (
                    auth.grant() = 'client_credentials' AND
                    utils.has_client_scope(28) AND
                    organization_id = (auth.jwt()->>'organization_id')::INT AND
                    role NOT IN ('Owner', 'Admin')
                )
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
                auth.grant() = 'password' OR
                auth.grant() IS NULL
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(20)
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
                    FROM public.organization_members AS om
                    WHERE om.organization_id = id 
                        AND om.member_id = auth.uid() 
                        AND om.role IN ('Owner', 'Admin')
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(21) AND
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
            FROM public.organization_members AS om
            WHERE om.organization_id = id 
                AND om.member_id = auth.uid() 
                AND om.role = 'Owner'
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
                auth.grant() = 'password'
            )
            OR
            (
                auth.grant() IS NULL
            )
            OR
            (
                auth.grant() = 'authorization_code' AND
                auth.uid() = user_id AND
                utils.has_client_scope(10)
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
                    FROM public.project_members AS pm
                    WHERE pm.project_id = public.project_requests.project_id 
                        AND pm.member_id = auth.uid() 
                        AND pm.role IN ('Owner', 'Admin')
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(16) AND
                EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                    WHERE p.id = project_id 
                        AND (
                            oa.project_id = public.project_requests.project_id OR
                            oa.project_id IS NULL
                        )
                        AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                )
            )
        )
    );

CREATE OR REPLACE FUNCTION utils.is_project_request_with_role_owner_or_admin(_project_id INT, _addressee_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_requests AS orq
        WHERE orq.organization_id = _organization_id 
            AND orq.addressee_id = _addressee_id 
            AND orq.role IN ('Owner', 'Admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.is_project_request_with_role_owner_or_admin(_project_id INT, _addressee_id UUID) TO authenticated;

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
                        FROM public.project_members AS pm
                        WHERE pm.project_id = public.project_requests.project_id 
                            AND pm.member_id = auth.uid() 
                            AND pm.role = 'Owner'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.project_members AS pm
                            WHERE pm.project_id = public.project_requests.project_id 
                                AND pm.member_id = auth.uid() 
                                AND pm.role = 'Admin'
                        ) AND
                        role NOT IN ('Owner', 'Admin') AND 
                        utils.is_project_request_with_role_owner_or_admin(project_id, addressee_id)
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(17) AND
                EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                    WHERE p.id = project_id 
                        AND (
                            oa.project_id = public.project_requests.project_id OR
                            oa.project_id IS NULL
                        )
                        AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                ) AND
                role NOT IN ('Owner', 'Admin') AND
                utils.is_project_request_with_role_owner_or_admin(project_id, addressee_id)
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
                        FROM public.project_members AS pm
                        WHERE pm.project_id = public.project_requests.project_id 
                            AND pm.member_id = auth.uid() 
                            AND pm.role = 'Owner'
                    )
                    OR
                    (
                        EXISTS (
                            SELECT 1
                            FROM public.project_members AS pm
                            WHERE pm.project_id = public.project_requests.project_id 
                                AND pm.member_id = auth.uid() 
                                AND pm.role = 'Admin'
                        ) AND
                        role NOT IN ('Owner', 'Admin')
                    )
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(18) AND
                EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                    WHERE p.id = project_id
                        AND (
                            oa.project_id = public.project_requests.project_id OR
                            oa.project_id IS NULL
                        )
                        AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                ) AND
                role NOT IN ('Owner', 'Admin')
            )
        )
    );

CREATE POLICY project_requests_insert
    ON public.project_requests
    AS PERMISSIVE
    FOR INSERT 
    WITH CHECK (
        (
            NOT EXISTS (
                SELECT 1
                FROM public.project_members AS pm
                WHERE pm.project_id = public.project_requests.project_id 
                    AND pm.member_id = addressee_id
            ) AND
            (
                (
                    auth.grant() = 'password' AND
                    (
                        auth.uid() = addressee_id OR
                        EXISTS (
                            SELECT 1
                            FROM public.project_members AS pm
                            WHERE pm.project_id = public.project_requests.project_id 
                                AND pm.member_id = auth.uid() 
                                AND pm.role = 'Owner'
                        )
                        OR
                        (
                            EXISTS (
                                SELECT 1
                                FROM public.project_members AS pm
                                WHERE pm.project_id = public.project_requests.project_id 
                                    AND pm.member_id = auth.uid() 
                                    AND pm.role = 'Admin'
                            ) AND
                            role NOT IN ('Owner', 'Admin')
                        )
                    )
                )
                OR
                (
                    auth.grant() = 'client_credentials' AND
                    utils.has_client_scope(19) AND
                    EXISTS (
                        SELECT 1
                        FROM public.projects AS p
                        JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                        WHERE p.id = project_id
                            AND (
                                oa.project_id = public.project_requests.project_id OR
                                oa.project_id IS NULL
                            )
                            AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                    ) AND
                    role NOT IN ('Owner', 'Admin')
                )
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
                (
                    auth.grant() IS NULL OR
                    auth.grant() = 'password'
                ) AND
                EXISTS (
                    SELECT 1
                    FROM public.profiles AS p
                    WHERE p.user_id = member_id 
                        AND p.is_private IS FALSE
                )
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(13) AND
                EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                    WHERE p.id = project_id 
                        AND (
                            oa.project_id = public.project_members.project_id OR
                            oa.project_id IS NULL
                        )
                        AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                )
            )
        )
    );

CREATE OR REPLACE FUNCTION utils.project_member_update_policy(_project_id INT, _member_id UUID, _role TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    SELECT role
    INTO current_user_role
    FROM public.project_members AS pm
    WHERE pm.member_id = auth.uid() 
        AND pm.project_id = _project_id;

    RETURN (
        (
            auth.grant() = 'password' AND
            auth.uid() <> _member_id AND
            (
                (
                    current_user_role = 'Owner' AND
                    NOT EXISTS (
                        SELECT 1
                        FROM public.project_members AS pm
                        WHERE pm.member_id = _member_id 
                            AND pm.project_id = _project_id 
                            AND pm.role = 'Owner'
                    )
                )
                OR
                (
                    current_user_role = 'Admin' AND
                    NOT EXISTS (
                        SELECT 1
                        FROM public.project_members AS pm
                        WHERE pm.member_id = _member_id 
                            AND pm.project_id = _project_id 
                            AND pm.role IN ('Owner', 'Admin')
                    ) AND
                    _role NOT IN ('Owner', 'Admin')
                )
            )
        )
        OR
        (
            auth.grant() = 'client_credentials' AND
            utils.has_client_scope(14) AND
            EXISTS (
                SELECT 1
                FROM public.projects AS p
                JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
                WHERE p.id = _project_id
                    AND (
                        oa.project_id = _project_id OR
                        oa.project_id IS NULL
                    )
                    AND p.organization_id = (auth.jwt()->>'organization_id')::INT
            ) AND
            role NOT IN ('Owner', 'Admin') AND
            NOT EXISTS (
                SELECT 1
                FROM public.project_members AS pm
                WHERE pm.project_id = _project_id 
                    AND pm.member_id = _member_id 
                    AND pm.role IN ('Owner', 'Admin')
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.project_member_update_policy(_project_id INT, _member_id UUID, _role TEXT) TO authenticated;

CREATE POLICY project_members_update
    ON public.project_members
    AS PERMISSIVE
    FOR UPDATE 
    USING (
        utils.project_member_update_policy(project_id, member_id, role)
    );

CREATE OR REPLACE FUNCTION utils.is_current_user_allowed_to_delete_project_member(_project_id INT, _member_id UUID, _role TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    SELECT role
    INTO current_user_role
    FROM public.project_members AS pm
    WHERE pm.member_id = auth.uid() 
        AND pm.project_id = _project_id;

    RETURN (
        auth.grant() = 'password' AND
        (
            (
                auth.uid() = _member_id AND
                _role in ('Admin', 'Moderator', 'Member')
            )
            OR
            (
                auth.uid() = _member_id AND
                (
                    SELECT COUNT(*)
                    FROM public.project_members AS pm
                    WHERE pm.project_id = _project_id 
                        AND pm.role = 'Owner'
                ) > 1 AND
                _role = 'Owner'
            )
            OR
            (
                current_user_role = 'Owner' AND
                _role in ('Admin', 'Moderator', 'Member')
            )
            OR
            (
                current_user_role = 'Admin' AND
                _role in ('Moderator', 'Member')
            )
            OR
            (
                current_user_role = 'Moderator' AND
                _role = 'Member'
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.is_current_user_allowed_to_delete_project_member(_project_id INT, _member_id UUID, _role TEXT) TO authenticated;

CREATE POLICY project_members_delete
    ON public.project_members
    AS PERMISSIVE
    FOR DELETE
    USING (
        (
            utils.is_current_user_allowed_to_delete_project_member(project_id, member_id, role)
            OR 
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(15) AND
                EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUId
                    WHERE p.id = project_id
                        AND (
                            oa.project_id = public.project_members.project_id OR
                            oa.project_id IS NULL
                        )
                        AND p.organization_id = (auth.jwt()->>'organization_id')::INT
                ) AND
                role NOT IN ('Owner', 'Admin')
            )
        )
    );

CREATE OR REPLACE FUNCTION utils.has_project_owner(_project_id INT) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.project_members AS pm
        WHERE pm.project_id = _project_id 
            AND pm.role = 'Owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.has_project_owner(_project_id INT) TO authenticated;

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
                FROM public.project_requests AS pr
                WHERE pr.project_id = public.project_members.project_id 
                    AND pr.addressee_id = auth.uid() 
                    AND pr.role = role
            )
            OR
            (
                NOT utils.has_project_owner(project_id) AND
                role = 'Owner'
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
                auth.grant() = 'password' OR
                auth.grant() IS NULL
            )
            OR 
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(11)
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
                    FROM public.project_members AS pm
                    WHERE pm.project_id = id 
                        AND pm.member_id = auth.uid() 
                        AND pm.role IN ('Owner', 'Admin')
                )
            )
            OR
            (
                auth.grant() = 'client_credentials' AND
                utils.has_client_scope(12) AND
                EXISTS (
                    SELECT 1
                    FROM public.oauth2_apps AS oa
                    WHERE oa.client_id = (auth.jwt()->>'client_id')::UUID
                        AND (
                            oa.project_id = id OR
                            oa.project_id IS NULL
                        )
                ) AND
                organization_id = (auth.jwt()->>'organization_id')::INT
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
            FROM public.project_members AS pm
            WHERE pm.project_id = id 
                AND pm.member_id = auth.uid() 
                AND pm.role IN ('Owner', 'Admin')
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
            FROM public.organization_members AS om
            WHERE om.organization_id = public.projects.organization_id 
                AND om.member_id = auth.uid() 
                AND om.role IN ('Owner', 'Admin')
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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select
    ON public.notifications
    AS PERMISSIVE
    FOR SELECT
    USING (
        auth.grant() = 'password' AND
        auth.uid() = user_id
    );


CREATE POLICY notifications_update
    ON public.notifications
    AS PERMISSIVE
    FOR UPDATE
    USING (
        auth.grant() = 'password' AND
        user_id = auth.uid()
    );

CREATE POLICY notifications_delete
    ON public.notifications
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND
        auth.uid() = user_id AND
        type = 'message'
    );

CREATE POLICY notifications_insert
    ON public.notifications
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        message IS NULL AND
        (
            (
                auth.grant() IN ('password', 'athorization_code') AND
                type = 'friend_request' AND
                organization_request_id IS NULL AND
                project_request_id IS NULL AND
                EXISTS (
                    SELECT 1
                    FROM public.friend_requests AS fr
                    WHERE fr.id = friend_request_id 
                        AND fr.addressee_id = user_id 
                        AND fr.requester_id = auth.uid()
                )
            )
            OR
            (
                auth.grant() IN ('password', 'client_credentials') AND
                (
                    (
                        type = 'organization_request' AND
                        friend_request_id IS NULL AND
                        project_request_id IS NULL AND
                        EXISTS (
                            SELECT 1
                            FROM public.organization_requests AS ogr
                            WHERE ogr.id = organization_request_id 
                                AND ogr.addressee_id = auth.uid()
                        )
                    )
                    OR
                    (
                        type = 'project_request' AND
                        friend_request_id IS NULL AND
                        organization_request_id IS NULL AND
                        EXISTS (
                            SELECT id
                            FROM public.project_requests AS pr
                            WHERE pr.id = project_request_id 
                                AND  pr.addressee_id = auth.uid()
                        )
                    )
                )
            )
        )
    );



CREATE POLICY oauth2_connections_select
    ON public.oauth2_connections
    AS PERMISSIVE
    FOR SELECT
    USING (
        (
            auth.grant() = 'password' AND
            (
                auth.uid() = user_id OR
                EXISTS (
                    SELECT 1
                    FROM public.organization_members AS om
                    JOIN public.oauth2_apps AS oa ON oa.client_id = public.oauth2_connections.client_id
                    WHERE oa.project_id IS NULL 
                        AND om.role IN ('Owner', 'Admin') 
                        AND om.organization_id = oa.organization_id 
                        AND om.member_id = auth.uid()
                    UNION
                    SELECT 1
                    FROM project_members AS pm
                    JOIN public.oauth2_apps AS oa ON oa.client_id = public.oauth2_connections.client_id
                    WHERE oa.project_id IS NOT NULL 
                        AND pm.role IN ('Owner', 'Admin') 
                        AND pm.project_id = oa.project_id 
                        AND pm.member_id = auth.uid()
                )
            )
        )
        OR
        (
            auth.grant() = 'client_credentials' AND
            utils.has_client_scope(43) AND
            EXISTS (
                SELECT 1
                FROM public.oauth2_apps AS oa
                JOIN public.oauth2_apps AS oac ON oac.client_id = (auth.jwt()->>'client_id')::UUID
                WHERE (
                        oac.project_id = oa.project_id OR
                        oac.project_id IS NULL
                    )
                    AND oa.organization_id = (auth.jwt()->>'organization_id')::INT
            )
        )
    );



CREATE POLICY oauth2_connection_scopes_select
    ON public.oauth2_connection_scopes
    FOR SELECT
    USING (
        (
            auth.grant() = 'password' AND
            (
                EXISTS (
                    SELECT 1
                    FROM public.oauth2_connections AS os
                    WHERE os.id = connection_id
                        AND os.user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1
                    FROM public.organization_members AS om
                    JOIN public.oauth2_connections AS oc ON oc.id = connection_id
                    JOIN public.oauth2_apps AS oa ON oa.client_id = oc.client_id
                    WHERE oa.project_id IS NULL 
                        AND om.role IN ('Owner', 'Admin') 
                        AND om.organization_id = oa.organization_id 
                        AND om.member_id = auth.uid()
                    UNION
                    SELECT 1
                    FROM project_members AS pm
                    JOIN public.oauth2_connections AS oc ON oc.id = connection_id
                    JOIN public.oauth2_apps AS oa ON oa.client_id = oc.client_id
                    WHERE oa.project_id IS NOT NULL 
                        AND pm.role IN ('Owner', 'Admin') 
                        AND pm.project_id = oa.project_id 
                        AND pm.member_id = auth.uid()
                )
            )
        )
        OR
        (
            auth.grant() = 'client_credentials' AND
            utils.has_client_scope(44) AND
            EXISTS (
                SELECT 1
                FROM public.oauth2_apps AS oa
                JOIN public.oauth2_connections AS oc ON oc.id = connection_id
                JOIN public.oauth2_apps AS oac ON oac.client_id = (auth.jwt()->>'client_id')::UUID
                WHERE oa.client_id = oc.client_id 
                    AND (
                        oac.project_id = oa.project_id OR
                        oac.project_id IS NULL
                    )
                    AND oa.organization_id = (auth.jwt()->>'organization_id')::INT
            )
        )
    );
