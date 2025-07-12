CREATE TABLE public.projects (
	id SERIAL PRIMARY KEY,
	name CITEXT NOT NULL,
	organization_id INT REFERENCES public.organizations (id) ON DELETE CASCADE NOT NULL,
	description VARCHAR(150),
	readme VARCHAR(10000),
	email VARCHAR(254),
	url VARCHAR(150),
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_project_combination UNIQUE (name, organization_id),
	CONSTRAINT name_max_length CHECK (length(name) <= 50),
	CONSTRAINT name_allowed_characters CHECK (name ~ '^[A-Za-z0-9._-]+(\s[A-Za-z0-9._-]+)*$'),
	CONSTRAINT valid_url CHECK (utils.is_url_valid(url, TRUE))
);

GRANT INSERT (name, organization_id, description, readme, email, url) ON TABLE public.projects TO authenticated;
GRANT UPDATE (name, description, readme, email, url) ON TABLE public.projects TO authenticated;
GRANT DELETE, SELECT ON TABLE public.projects TO authenticated;
GRANT SELECT ON TABLE public.projects TO anon;

GRANT USAGE, SELECT ON SEQUENCE public.projects_id_seq TO authenticated;
