CREATE TABLE public.oauth2_apps (
	id SERIAL PRIMARY KEY,
	name CITEXT NOT NULL,
	client_id UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
	client_secret VARCHAR(64) NOT NULL,
	organization_id INT REFERENCES public.organizations (id) ON DELETE CASCADE NOT NULL,
	project_id INT REFERENCES public.projects (id) ON DELETE CASCADE,
	redirect_url VARCHAR(200) NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_organization_oauth2_apps_combination UNIQUE (name, organization_id),
	CONSTRAINT name_max_length CHECK (length(name) <= 50),
	CONSTRAINT name_allowed_characters CHECK (name ~ '^[A-Za-z0-9._-]+(\s[A-Za-z0-9._-]+)*$'),
	CONSTRAINT valid_redirect_url CHECK (utils.is_url_valid(redirect_url))
);

GRANT INSERT (name, organization_id, project_id, redirect_url) ON TABLE public.oauth2_apps TO authenticated;
GRANT UPDATE (name, project_id, redirect_url) ON TABLE public.oauth2_apps TO authenticated;
GRANT DELETE, SELECT ON TABLE public.oauth2_apps TO authenticated;

CREATE OR REPLACE FUNCTION public.get_oauth2_app_by_client_id(client_id_param UUID)
RETURNS TABLE (
	id INT,
	name CITEXT,
	client_id UUID,
	organization_id INT,
	organization_name CITEXT,
	project_name CITEXT,
	created_at TIMESTAMPTZ
)
SECURITY DEFINER AS $$
BEGIN
	IF auth.grant() = 'password' THEN
		RETURN QUERY
		SELECT 
			oa.id, 
			oa.name, 
			oa.client_id,
			org.id AS organization_id,
			org.name AS organization_name,
			proj.name AS project_name,
			oa.created_at
		FROM public.oauth2_apps AS oa
		LEFT JOIN public.organizations AS org ON org.id = oa.organization_id
		LEFT JOIN public.projects AS proj ON proj.id = oa.project_id
		WHERE oa.client_id = client_id_param;
	ELSE
		RAISE sqlstate 'PT401' USING
			message = 'Unauthorized access',
			detail = 'Access to the requested resource is denied.',
			hint = 'Ensure you are signed in.';
	END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_oauth2_app_by_client_id(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_client_credentials()
RETURNS TRIGGER AS $$
BEGIN
	NEW.client_secret := encode(digest(random()::text || clock_timestamp()::text, 'sha256'), 'hex');
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_client_credentials_trigger
BEFORE INSERT ON public.oauth2_apps
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_credentials();

GRANT USAGE, SELECT ON SEQUENCE public.oauth2_apps_id_seq TO authenticated;
