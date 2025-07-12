CREATE TABLE public.profiles (
	user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
	username CITEXT NOT NULL UNIQUE,
	bio VARCHAR(150),
	url VARCHAR(150),
	is_private BOOLEAN NOT NULL DEFAULT FALSE,
	accept_friend_requests BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT username_max_length CHECK (length(username) <= 20),
	CONSTRAINT username_allowed_characters CHECK (username ~ '^[A-Za-z0-9._]+$'),
	CONSTRAINT valid_url CHECK (utils.is_url_valid(url, TRUE))
);

GRANT UPDATE (username, is_private, bio, url, accept_friend_requests) ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION auth.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO public.profiles (user_id, username)
	VALUES (NEW.id, NEW.raw_user_meta_data->>'username');

	UPDATE auth.users
	SET raw_user_meta_data = raw_user_meta_data - 'username'
	WHERE id = NEW.id;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.create_profile_for_user();
