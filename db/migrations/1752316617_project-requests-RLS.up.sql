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
				utils.has_client_scope(15) AND
				EXISTS (
					SELECT 1
					FROM public.projects AS p
					JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
					WHERE p.id = project_id
						AND (
							oa.project_id = public.project_requests.project_id OR
							oa.project_id IS NULL
						)
						AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
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
				utils.has_client_scope(16) AND
				EXISTS (
					SELECT 1
					FROM public.projects AS p
					JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
					WHERE p.id = project_id
						AND (
							oa.project_id = public.project_requests.project_id OR
							oa.project_id IS NULL
						)
						AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
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
				utils.has_client_scope(17) AND
				EXISTS (
					SELECT 1
					FROM public.projects AS p
					JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
					WHERE p.id = project_id
						AND (
							oa.project_id = public.project_requests.project_id OR
							oa.project_id IS NULL
						)
						AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
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
					utils.has_client_scope(18) AND
					EXISTS (
						SELECT 1
						FROM public.projects AS p
						JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
						WHERE p.id = project_id
							AND (
								oa.project_id = public.project_requests.project_id OR
								oa.project_id IS NULL
							)
							AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
					) AND
					role NOT IN ('Owner', 'Admin')
				)
			)
		)
	);
