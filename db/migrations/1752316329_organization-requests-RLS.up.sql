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
				utils.has_client_scope(24) AND
				organization_id = (auth.jwt() ->> 'organization_id')::INT
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
				utils.has_client_scope(25) AND
				organization_id = (auth.jwt() ->> 'organization_id')::INT AND
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
				utils.has_client_scope(26) AND
				organization_id = (auth.jwt() ->> 'organization_id')::INT AND
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
					utils.has_client_scope(27) AND
					organization_id = (auth.jwt() ->> 'organization_id')::INT AND
					role NOT IN ('Owner', 'Admin')
				)
			)
		)
	);
