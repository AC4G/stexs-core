CREATE TABLE public.oauth2_app_scopes (
	id SERIAL PRIMARY KEY,
	app_id INT REFERENCES public.oauth2_apps (id) ON DELETE CASCADE NOT NULL,
	scope_id INT REFERENCES public.scopes (id) ON DELETE CASCADE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT unique_oauth2_app_scopes_combination UNIQUE (app_id, scope_id)
);

GRANT INSERT (app_id, scope_id) ON TABLE public.oauth2_app_scopes TO authenticated;
GRANT DELETE, SELECT ON TABLE public.oauth2_app_scopes TO authenticated;
GRANT SELECT ON TABLE public.oauth2_app_scopes TO anon;

GRANT USAGE, SELECT ON SEQUENCE public.oauth2_app_scopes_id_seq TO authenticated;
