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
				utils.has_client_scope(10)
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
				utils.has_client_scope(11) AND
				EXISTS (
					SELECT 1
					FROM public.oauth2_apps AS oa
					WHERE oa.client_id = (auth.jwt() ->> 'client_id')::UUID
						AND (
							oa.project_id = id OR
							oa.project_id IS NULL
						)
				) AND
				organization_id = (auth.jwt() ->> 'organization_id')::INT
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
