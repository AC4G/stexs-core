CREATE TABLE public.oauth2_connections (
	id SERIAL PRIMARY KEY,
	user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
	client_id UUID REFERENCES public.oauth2_apps (client_id) ON DELETE CASCADE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_oauth2_connections_combination UNIQUE (user_id, client_id)
);

GRANT DELETE, SELECT ON TABLE public.oauth2_connections TO authenticated;
