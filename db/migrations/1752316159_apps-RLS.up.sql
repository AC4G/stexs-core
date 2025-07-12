ALTER TABLE public.oauth2_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth2_apps_select
	ON public.oauth2_apps
	AS PERMISSIVE
	FOR SELECT
	USING (
		auth.grant() = 'password' AND
		(
			EXISTS (
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
		EXISTS (
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
		EXISTS (
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
		EXISTS (
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
