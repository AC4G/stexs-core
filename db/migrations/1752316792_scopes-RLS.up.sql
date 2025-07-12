ALTER TABLE public.scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scopes_select
	ON public.scopes
	AS PERMISSIVE
	FOR SELECT
	USING (
		auth.grant() <> 'authorization_code'
	);
