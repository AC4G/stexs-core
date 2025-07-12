ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select
	ON public.profiles
	AS PERMISSIVE
	FOR SELECT
	USING (
		(
			(
				auth.grant() = 'password'
			)
			OR
			(
				auth.grant() IS NULL
			)
			OR
			(
				auth.grant() = 'authorization_code' AND
				auth.uid() = user_id AND
				utils.has_client_scope(9)
			)
		)
	);

CREATE POLICY profiles_update
	ON public.profiles
	AS PERMISSIVE
	FOR UPDATE
	USING (
		auth.grant() = 'password' AND
		auth.uid() = user_id
	);
