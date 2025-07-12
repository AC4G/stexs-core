CREATE OR REPLACE FUNCTION public.generate_new_client_secret(app_id INT)
RETURNS TABLE (client_secret VARCHAR(64)) AS $$
DECLARE
    new_client_secret VARCHAR(64);
BEGIN
	IF (
		(
			auth.grant() = 'password' AND
			EXISTS (
				SELECT 1
				FROM public.oauth2_apps AS oa
				JOIN public.organization_members AS om ON oa.organization_id = om.organization_id
				WHERE oa.id = app_id
					AND om.member_id = auth.uid()
					AND om.role IN ('Owner', 'Admin')
			)
		) 
		OR 
		(
			auth.grant() = 'client_credentials' AND
			utils.has_client_scope(42) AND
			EXISTS (
				SELECT 1
				FROM public.oauth2_apps 
				WHERE id = app_id
					AND client_id = (auth.jwt()->>'client_id')::UUID
			)
		)
	) THEN
		new_client_secret := encode(gen_random_bytes(32), 'hex');

		UPDATE public.oauth2_apps
		SET client_secret = new_client_secret
		WHERE id = app_id;

		RETURN QUERY
		SELECT new_client_secret;
	ELSE
		RAISE sqlstate '42501' USING
			message = 'Insufficient Privilege';
		RETURN;
	END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.generate_new_client_secret(INT) TO authenticated;
