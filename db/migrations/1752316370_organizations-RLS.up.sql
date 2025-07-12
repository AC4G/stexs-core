ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_select
	ON public.organizations
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
				utils.has_client_scope(19)
			)
		)
	);

CREATE POLICY organizations_update
	ON public.organizations
	AS PERMISSIVE
	FOR UPDATE
	USING (
		(
			(
				auth.grant() = 'password' AND
				EXISTS (
					SELECT 1
					FROM public.organization_members AS om
					WHERE om.organization_id = id
						AND om.member_id = auth.uid()
						AND om.role IN ('Owner', 'Admin')
				)
			)
			OR
			(
				auth.grant() = 'client_credentials' AND
				utils.has_client_scope(20) AND
				id = (auth.jwt() ->> 'organization_id')::INT
			)
		)
	);

CREATE POLICY organizations_delete
	ON public.organizations
	AS PERMISSIVE
	FOR DELETE
	USING (
		auth.grant() = 'password' AND
		EXISTS (
			SELECT 1
			FROM public.organization_members AS om
			WHERE om.organization_id = id
				AND om.member_id = auth.uid()
				AND om.role = 'Owner'
		)
	);

CREATE POLICY organizations_insert
	ON public.organizations
	AS PERMISSIVE
	FOR INSERT
	WITH CHECK (
		auth.grant() = 'password'
	);
