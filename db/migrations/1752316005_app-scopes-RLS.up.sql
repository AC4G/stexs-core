ALTER TABLE public.oauth2_app_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth2_app_scopes_select
	ON public.oauth2_app_scopes
	AS PERMISSIVE
	FOR SELECT
	USING (
		auth.grant() = 'password' AND
		(
			(
                SELECT type FROM public.scopes
                WHERE id = scope_id
            ) = 'user' OR
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
