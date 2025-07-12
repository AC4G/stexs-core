ALTER TABLE public.blocked ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_select
	ON public.blocked
	AS PERMISSIVE
	FOR SELECT
	USING (
		(
			(
				auth.uid() = public.blocked.blocker_id OR
				auth.uid() = public.blocked.blocked_id
			)
		) AND
		(
			(
				auth.grant() = 'password'
			) OR
			(
				auth.grant() = 'authorization_code' AND
				utils.has_client_scope(34)
			)
		)
	);

CREATE POLICY blocked_delete
	ON public.blocked
	AS PERMISSIVE
	FOR DELETE
	USING (
		auth.uid() = blocker_id AND
		(
			auth.grant() = 'password' OR
			(
				auth.grant() = 'authorization_code' AND
				utils.has_client_scope(36)
			)
		)
	);

CREATE POLICY blocked_insert
	ON public.blocked
	AS PERMISSIVE
	FOR INSERT
	WITH CHECK (
		auth.uid() = blocker_id AND
		(
			auth.grant() = 'password' OR
			(
				auth.grant() = 'authorization_code' AND
				utils.has_client_scope(35)
			)
		)
	);
