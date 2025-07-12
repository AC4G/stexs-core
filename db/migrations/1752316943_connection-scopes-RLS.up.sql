ALTER TABLE public.oauth2_connection_scopes ENABLE ROW LEVEL SECURITY;

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
			(
				(
					auth.grant() = 'client_credentials' AND
					utils.has_client_scope(44)
				)
				OR
				(
					auth.grant() = 'authorization_code' AND
					utils.has_client_scope(46)
				)
			) AND
			EXISTS (
				SELECT 1
				FROM public.oauth2_apps AS oa
				JOIN public.oauth2_connections AS oc ON oc.id = connection_id
				JOIN public.oauth2_apps AS oac ON oac.client_id = (auth.jwt() ->> 'client_id')::UUID
				WHERE oa.client_id = oc.client_id
					AND (
						oac.project_id = oa.project_id OR
						oac.project_id IS NULL
					)
					AND oa.organization_id = (auth.jwt() ->> 'organization_id')::INT
			)
		)
	);
