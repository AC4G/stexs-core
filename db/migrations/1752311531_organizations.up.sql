CREATE TABLE public.organizations (
	id SERIAL PRIMARY KEY,
	name CITEXT NOT NULL UNIQUE,
	display_name CITEXT,
	description VARCHAR(150),
	readme VARCHAR(10000),
	email VARCHAR(254),
	url VARCHAR(150),
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT name_max_length CHECK (length(name) <= 50),
	CONSTRAINT display_name_max_length CHECK (length(display_name) <= 50),
	CONSTRAINT name_allowed_characters CHECK (name ~ '^[A-Za-z0-9._-]+$'),
	CONSTRAINT display_name_allowed_characters CHECK (display_name ~ '^[A-Za-z0-9._-]+(\s[A-Za-z0-9._-]+)*$'),
	CONSTRAINT valid_url CHECK (utils.is_url_valid(url, TRUE))
);

GRANT INSERT (name, display_name, description, readme, email, url) ON TABLE public.organizations TO authenticated;
GRANT UPDATE (name, display_name, description, readme, email, url) ON TABLE public.organizations TO authenticated;
GRANT DELETE ON TABLE public.organizations TO authenticated;
GRANT SELECT ON TABLE public.organizations TO anon, authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.organizations_id_seq TO authenticated;
