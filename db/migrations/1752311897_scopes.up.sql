CREATE TABLE public.scopes (
	id SERIAL PRIMARY KEY,
	scope VARCHAR(200) NOT NULL,
	type VARCHAR(50) NOT NULL,
	CONSTRAINT scope_type CHECK (type IN ('user', 'client')),
	CONSTRAINT unique_scope_combination UNIQUE (scope, type)
);

GRANT SELECT ON TABLE public.scopes TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.scopes_id_seq TO authenticated;
