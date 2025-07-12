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
				utils.has_client_scope(12) AND
				EXISTS (
					SELECT 1
					FROM public.projects AS p
					JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
					WHERE p.id = project_id
						AND (
							oa.project_id = public.project_members.project_id OR
							oa.project_id IS NULL
						)
						AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
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
			utils.has_client_scope(13) AND
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
				utils.has_client_scope(14) AND
				EXISTS (
					SELECT 1
					FROM public.projects AS p
					JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
					WHERE p.id = project_id
						AND (
							oa.project_id = public.project_members.project_id OR
							oa.project_id IS NULL
						)
						AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
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
					AND pr.role = public.project_members.role
			)
			OR
			(
				NOT utils.has_project_owner(project_id) AND
				role = 'Owner'
			)
		)
	);
