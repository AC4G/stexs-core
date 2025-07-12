ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY friend_requests_select
	ON public.friend_requests
	AS PERMISSIVE
	FOR SELECT
	USING (
		(
			auth.uid() = requester_id OR
			auth.uid() = addressee_id
		) AND
		(
			auth.grant() = 'password' OR
			(
				auth.grant() = 'authorization_code' AND
				utils.has_client_scope(29)
			)
		)
	);

CREATE POLICY friend_requests_delete
	ON public.friend_requests
	AS PERMISSIVE
	FOR DELETE
	USING (
		(
			auth.uid() = requester_id OR
			auth.uid() = addressee_id
		) AND
		(
			auth.grant() = 'password' OR
			(
				auth.grant() = 'authorization_code' AND
				utils.has_client_scope(30)
			)
		)
	);

CREATE POLICY friend_requests_insert
	ON public.friend_requests
	AS PERMISSIVE
	FOR INSERT
	WITH CHECK (
		auth.uid() <> addressee_id AND
		NOT EXISTS (
			SELECT 1
			FROM public.friends AS f
			WHERE f.user_id = auth.uid()
				AND f.friend_id = addressee_id
		) AND
		(
			auth.grant() = 'password' OR
			(
				auth.grant() = 'authorization_code' AND
				utils.has_client_scope(28)
			)
		) AND
		NOT EXISTS (
			SELECT 1
			FROM public.blocked AS b
			WHERE b.blocker_id = addressee_id
				AND b.blocked_id = requester_id
			UNION
			SELECT 1
			FROM public.blocked AS b
			WHERE b.blocker_id = requester_id
				AND b.blocked_id = addressee_id
		) AND
		NOT EXISTS (
			SELECT 1
			FROM public.profiles AS p
			WHERE p.user_id = addressee_id
				AND p.accept_friend_requests IS FALSE
		)
	);
