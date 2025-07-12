ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventories_select
	ON public.inventories
	AS PERMISSIVE
	FOR SELECT
	USING (
		(
			(
				auth.grant() = 'password' AND
				(
					auth.uid() = user_id OR
					EXISTS (
						SELECT 1
						FROM public.friends AS fr
						WHERE fr.user_id = auth.uid()
							AND fr.friend_id = user_id
					) OR
					(
						EXISTS (
							SELECT 1
							FROM public.profiles AS p
							WHERE p.user_id = public.inventories.user_id
								AND p.is_private IS FALSE
						) AND
						NOT EXISTS (
							SELECT 1
							FROM public.blocked AS b
							WHERE b.blocker_id = user_id
								AND b.blocked_id = auth.uid()
							UNION
							SELECT 1
							FROM public.blocked AS b
							WHERE b.blocker_id = auth.uid()
								AND b.blocked_id = user_id
						)
					)
				)
			)
			OR
			(
				auth.grant() IS NULL AND
				EXISTS (
					SELECT 1
					FROM public.profiles AS p
					WHERE p.user_id = public.inventories.user_id
						AND p.is_private IS FALSE
			)
			)
			OR
			(
				auth.grant() = 'authorization_code' AND
				auth.uid() = user_id AND
				utils.has_client_scope(5)
			)
		)
	);

CREATE POLICY inventories_update
	ON public.inventories
	AS PERMISSIVE
	FOR UPDATE
	USING (
		auth.grant() = 'authorization_code' AND
		auth.uid() = user_id AND
		utils.has_client_scope(6)
	);

CREATE POLICY inventories_delete
	ON public.inventories
	AS PERMISSIVE
	FOR DELETE
	USING (
		auth.grant() = 'authorization_code' AND
		auth.uid() = user_id AND
		utils.has_client_scope(7)
	);

CREATE POLICY inventories_insert
	ON public.inventories
	AS PERMISSIVE
	FOR INSERT
	WITH CHECK (
		auth.grant() = 'authorization_code' AND
		auth.uid() = user_id AND
		utils.has_client_scope(8)
	);
