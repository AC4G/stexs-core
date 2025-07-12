CREATE TABLE auth.oauth2_authorization_codes (
	id SERIAL PRIMARY KEY,
	code UUID NOT NULL UNIQUE,
	user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
	app_id INT REFERENCES public.oauth2_apps (id) ON DELETE CASCADE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT unique_oauth2_authorization_codes_combination UNIQUE (user_id, app_id)
);

CREATE TABLE auth.oauth2_authorization_code_scopes (
	id SERIAL PRIMARY KEY,
	code_id INT REFERENCES auth.oauth2_authorization_codes (id) ON DELETE CASCADE NOT NULL,
	scope_id INT REFERENCES public.scopes (id) ON DELETE CASCADE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT unique_oauth2_authorization_code_scopes_combination UNIQUE (code_id, scope_id)
);
