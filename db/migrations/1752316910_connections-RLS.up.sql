ALTER TABLE public.oauth2_connections ENABLE ROW LEVEL SECURITY;

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
			(
				(
					auth.grant() = 'client_credentials' AND
					utils.has_client_scope(43)
				)
				OR
				(
					auth.grant() = 'authorization_code' AND
					utils.has_client_scope(45)
				)
			) AND
			EXISTS (
				SELECT 1
				FROM public.oauth2_apps AS oa
				JOIN public.oauth2_apps AS oac ON oac.client_id = (auth.jwt() ->> 'client_id')::UUID
				WHERE (
					oac.project_id = oa.project_id OR
					oac.project_id IS NULL
				)
					AND oa.organization_id = (auth.jwt() ->> 'organization_id')::INT
			)
		)
	);

CREATE POLICY oauth2_connections_delete
	ON public.oauth2_connections
	AS PERMISSIVE
	FOR DELETE
	USING (
		auth.grant() = 'password' AND
		user_id = auth.uid()
	);
