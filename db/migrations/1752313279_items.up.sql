CREATE TABLE public.items (id SERIAL PRIMARY KEY,
	name CITEXT NOT NULL,
	parameter JSONB DEFAULT '{}'::JSONB NOT NULL,
	description VARCHAR(800),
	project_id INT REFERENCES public.projects (id) ON DELETE CASCADE NOT NULL,
	is_private BOOLEAN DEFAULT FALSE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_items_combination UNIQUE (name, project_id),
	CONSTRAINT name_max_length CHECK (length(name) <= 50),
	CONSTRAINT parameter_size_limit CHECK (pg_column_size(parameter) <= 1048576),
	CONSTRAINT name_allowed_characters CHECK (name ~ '^[^\s]+(\s[^\s]+)*$')
);

GRANT INSERT (name, parameter, project_id, is_private) ON TABLE public.items TO authenticated;
GRANT UPDATE (name, parameter, project_id, is_private) ON TABLE public.items TO authenticated;
GRANT DELETE, SELECT ON TABLE public.items TO authenticated;
GRANT SELECT ON TABLE public.items TO anon;

GRANT USAGE, SELECT ON SEQUENCE public.items_id_seq TO authenticated;
