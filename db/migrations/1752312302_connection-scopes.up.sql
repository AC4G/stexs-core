CREATE TABLE public.oauth2_connection_scopes (
	id SERIAL PRIMARY KEY,
	connection_id INT REFERENCES public.oauth2_connections (id) ON DELETE CASCADE NOT NULL,
	scope_id INT REFERENCES public.scopes (id) ON DELETE CASCADE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT unique_oauth2_connection_scopes_combination UNIQUE (connection_id, scope_id)
);

CREATE OR REPLACE FUNCTION public.enforce_user_scope()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT type FROM public.scopes WHERE id = NEW.scope_id) <> 'user' THEN
        RETURN NULL;
    END IF;
	
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_oauth2_authorization_code_scopes_user_trigger
BEFORE INSERT OR UPDATE ON public.oauth2_connection_scopes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_scope();

CREATE TRIGGER check_oauth2_connection_scopes_user_trigger
BEFORE INSERT OR UPDATE ON public.oauth2_connection_scopes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_scope();
