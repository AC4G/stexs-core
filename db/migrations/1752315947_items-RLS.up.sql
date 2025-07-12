ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_select
	ON public.items
	AS PERMISSIVE
	FOR SELECT
	USING (
		(
			(
				auth.grant() = 'client_credentials' AND
				utils.has_client_scope(1)
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
				utils.has_client_scope(2) AND
				EXISTS (
					SELECT 1
					FROM public.projects AS p
					JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
					WHERE p.id = project_id
						AND (
							oa.project_id = public.items.project_id OR
							oa.project_id IS NULL
						)
						AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
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
				utils.has_client_scope(3) AND
				EXISTS (
					SELECT 1
					FROM public.projects AS p
					JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
					WHERE p.id = project_id
						AND (
							oa.project_id = public.items.project_id OR
							oa.project_id IS NULL
						)
						AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
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
				utils.has_client_scope(4) AND
				EXISTS (
						SELECT 1
						FROM public.projects AS p
						JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
						WHERE p.id = project_id
							AND (
								oa.project_id = public.items.project_id OR
								oa.project_id IS NULL
							)
							AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
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
