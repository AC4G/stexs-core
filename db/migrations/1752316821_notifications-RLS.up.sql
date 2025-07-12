ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select
	ON public.notifications
	AS PERMISSIVE
	FOR SELECT
	USING (
		auth.grant() = 'password' AND
		auth.uid() = user_id
	);


CREATE POLICY notifications_update
	ON public.notifications
	AS PERMISSIVE
	FOR UPDATE
	USING (
		auth.grant() = 'password' AND
		user_id = auth.uid()
	);

CREATE POLICY notifications_delete
	ON public.notifications
	AS PERMISSIVE
	FOR DELETE
	USING (
		auth.grant() = 'password' AND
		auth.uid() = user_id AND
		type = 'message'
	);

CREATE POLICY notifications_insert
	ON public.notifications
	AS PERMISSIVE
	FOR INSERT
	WITH CHECK (
		message IS NULL AND
		(
			(
				auth.grant() IN ('password', 'athorization_code') AND
				type = 'friend_request' AND
				organization_request_id IS NULL AND
				project_request_id IS NULL AND
				EXISTS (
					SELECT 1
					FROM public.friend_requests AS fr
					WHERE fr.id = friend_request_id
						AND fr.addressee_id = user_id
						AND fr.requester_id = auth.uid()
				)
			)
			OR
			(
				auth.grant() IN ('password', 'client_credentials') AND
				(
					(
						type = 'organization_request' AND
						friend_request_id IS NULL AND
						project_request_id IS NULL AND
						EXISTS (
							SELECT 1
							FROM public.organization_requests AS ogr
							WHERE ogr.id = organization_request_id
								AND ogr.addressee_id = auth.uid()
						)
					)
					OR
					(
						type = 'project_request' AND
						friend_request_id IS NULL AND
						organization_request_id IS NULL AND
						EXISTS (
							SELECT 1
							FROM public.project_requests AS pr
							WHERE pr.id = project_request_id
								AND pr.addressee_id = auth.uid()
						)
					)
				)
			)
		)
	);
