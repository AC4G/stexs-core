CREATE TABLE auth.users (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	email CITEXT NOT NULL UNIQUE,
	encrypted_password VARCHAR(255) NOT NULL,
	email_verified_at TIMESTAMPTZ,
	verification_token UUID,
	verification_sent_at TIMESTAMPTZ,
	raw_user_meta_data JSONB DEFAULT '{}'::JSONB NOT NULL,
	is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
	email_change CITEXT,
	email_change_sent_at TIMESTAMPTZ,
	email_change_code VARCHAR(8),
	recovery_token UUID,
	recovery_sent_at TIMESTAMPTZ,
	banned_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_email_change_combination UNIQUE (email_change, email_change_code)
);

CREATE OR REPLACE FUNCTION auth.create_mfa_for_user()
RETURNS TRIGGER AS $$
BEGIN   
	INSERT INTO auth.mfa (user_id)
	VALUES (NEW.id);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_mfa_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.create_mfa_for_user();

CREATE OR REPLACE FUNCTION auth.check_username_and_email()
RETURNS TRIGGER AS $$
BEGIN
	PERFORM 1
	FROM public.profiles
	WHERE username = NEW.raw_user_meta_data->>'username';

	IF FOUND THEN
		RAISE sqlstate '23505' USING
			MESSAGE = 'Provided username is already taken',
			HINT = 'Please choose a different username';
	END IF;

	PERFORM 1
	FROM auth.users
	WHERE email = NEW.email;

	IF FOUND THEN
		RAISE sqlstate '23505' USING
			MESSAGE = 'Provided email is already taken',
			HINT = 'Please choose a different email';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_username_and_email_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.check_username_and_email();
