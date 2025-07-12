CREATE TABLE auth.refresh_tokens (
	id SERIAL PRIMARY KEY,
	token UUID NOT NULL,
	user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
	connection_id INT REFERENCES public.oauth2_connections (id) ON DELETE CASCADE,
	session_id UUID,
	grant_type VARCHAR(50) NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_refresh_token_combination UNIQUE (user_id, session_id, grant_type, token, connection_id)
);

CREATE OR REPLACE FUNCTION auth.delete_connection()
RETURNS TRIGGER AS $$
BEGIN   
	IF OLD.connection_id IS NOT NULL THEN
		DELETE FROM public.oauth2_connections 
		WHERE id = OLD.connection_id;
	END IF;

	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_connection_trigger
AFTER DELETE ON auth.refresh_tokens
FOR EACH ROW
EXECUTE FUNCTION auth.delete_connection();
