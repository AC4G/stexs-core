CREATE OR REPLACE FUNCTION utils.is_auth_friends_with_either_user(_user_id UUID, _friend_id UUID) RETURNS BOOLEAN AS $$
BEGIN
	RETURN EXISTS (
		SELECT 1
		FROM public.friends AS f
		WHERE f.user_id = auth.uid() 
			AND f.friend_id = _user_id 
		UNION
		SELECT 1
		FROM public.friends AS f
		WHERE f.user_id = auth.uid() 
			AND f.friend_id = _friend_id
	);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION utils.is_auth_friends_with_either_user(_user_id UUID, _friend_id UUID) TO authenticated, anon;


ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY friends_select
	ON public.friends
	AS PERMISSIVE
	FOR SELECT
	USING (
		(
			(
				auth.grant() IS NULL AND
				NOT EXISTS (
					SELECT 1
					FROM public.profiles AS p
					WHERE p.user_id = public.friends.user_id
						AND p.is_private IS TRUE
					UNION
					SELECT 1
					FROM public.profiles AS p
					WHERE p.user_id = friend_id
						AND p.is_private IS TRUE
				)
			)
			OR
			(
				auth.grant() = 'password' AND
				(
					auth.uid() = user_id OR
					auth.uid() = friend_id
				)
			)
			OR
			(
				auth.grant() = 'authorization_code' AND
				auth.uid() = user_id AND
				utils.has_client_scope(31)
			)
			OR
			(
				auth.grant() = 'password' AND
				utils.is_auth_friends_with_either_user(user_id, friend_id)
			)
			OR
			(
				auth.grant() = 'password' AND
				NOT EXISTS (
					SELECT 1
					FROM public.profiles AS p
					WHERE p.user_id = public.friends.user_id
						AND p.is_private IS TRUE
					UNION
					SELECT 1
					FROM public.profiles AS p
					WHERE p.user_id = friend_id
						AND p.is_private IS TRUE
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
					UNION
					SELECT 1
					FROM public.blocked AS b
					WHERE b.blocker_id = friend_id
						AND b.blocked_id = auth.uid()
					UNION
					SELECT 1
					FROM public.blocked AS b
					WHERE b.blocker_id = auth.uid()
						AND b.blocked_id = friend_id
				)
			)
		)
	);

CREATE POLICY friends_delete
	ON public.friends
	AS PERMISSIVE
	FOR DELETE
	USING (
		(
			auth.uid() = user_id OR
			auth.uid() = friend_id
		) AND
		(
			auth.grant() = 'password' OR
			(
				auth.grant() = 'authorization_code' AND
				utils.has_client_scope(33)
			)
		)
	);

CREATE POLICY friends_insert
	ON public.friends
	AS PERMISSIVE
	FOR INSERT
	WITH CHECK (
		(auth.uid() = user_id OR auth.uid() = friend_id) AND
		EXISTS (
			SELECT 1
			FROM public.friend_requests AS fr
			WHERE fr.addressee_id = auth.uid()
				AND fr.requester_id = friend_id
			UNION
			SELECT 1
			FROM public.friend_requests AS fr
			WHERE fr.addressee_id = auth.uid()
				AND fr.requester_id = user_id
		) AND
		(
			auth.grant() = 'password' OR
			(
				auth.grant() = 'authorization_code' AND
				utils.has_client_scope(32)
			)
		)
	);
