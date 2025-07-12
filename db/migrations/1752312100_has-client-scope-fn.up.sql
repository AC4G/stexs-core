CREATE OR REPLACE FUNCTION utils.has_client_scope(_scope_id INT)
RETURNS BOOLEAN AS $$
BEGIN
	IF auth.grant() IS NULL OR auth.grant() = 'password' THEN
		RETURN FALSE;
	END IF;

	IF auth.grant() = 'client_credentials' THEN
		RETURN EXISTS (
			SELECT 1
			FROM public.oauth2_apps_scopes AS oas
			JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
			WHERE oas.app_id = oa.id
				AND oas.scope_id = _scope_id
		);
	END IF;

	RETURN EXISTS (
		SELECT 1
		FROM public.oauth2_connection_scopes AS cs
		JOIN public.oauth2_connections AS c ON cs.connection_id = c.id
		WHERE c.user_id = auth.uid()
			AND c.client_id = (auth.jwt()->>'client_id')::UUID
			AND cs.scope_id = _scope_id
	);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION utils.has_client_scope(scope_id INT) TO authenticated;
