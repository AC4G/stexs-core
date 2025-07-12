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

GRANT EXECUTE ON FUNCTION utils.is_current_user_member_of_organization(_organization_id INT) TO authenticated, anon;

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
			utils.has_client_scope(21) AND
			organization_id = (auth.jwt() ->> 'organization_id')::INT
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
			utils.has_client_scope(22) AND
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
				utils.has_client_scope(23) AND
				organization_id = (auth.jwt() ->> 'organization_id')::INT AND
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
