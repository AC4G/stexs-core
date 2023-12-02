SET TIME ZONE 'UTC';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";  
CREATE EXTENSION IF NOT EXISTS "pgtap";



CREATE ROLE authenticator LOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOSUPERUSER ENCRYPTED PASSWORD 'authenticator';
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;



GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT USAGE ON SCHEMA public TO anon;



CREATE SCHEMA auth;

CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS JSONB
 STABLE
AS $$
BEGIN
    RETURN coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), ''),
        nullif(current_setting('jwt.claims', true), '')
    )::JSONB;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth.role()
 RETURNS TEXT
 STABLE
AS $$
BEGIN 
  RETURN coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::JSONB ->> 'role'),
    nullif(current_setting('jwt.claims.role', true), ''),
    (nullif(current_setting('jwt.claims', true), '')::JSONB ->> 'role')
  )::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS UUID
 STABLE
AS $$
BEGIN
  RETURN coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::JSONB ->> 'sub'),
    nullif(current_setting('jwt.claims.sub', true), ''),
    (nullif(current_setting('jwt.claims', true), '')::JSONB ->> 'sub')
  )::UUID;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth.grant()
 RETURNS TEXT
 STABLE
AS $$
BEGIN
  RETURN coalesce(
    nullif(current_setting('request.jwt.claim.grant_type', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::JSONB ->> 'grant_type'),
    nullif(current_setting('jwt.claims.grant_type', true), ''),
    (nullif(current_setting('jwt.claims', true), '')::JSONB ->> 'grant_type')
  )::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth.scopes()
 RETURNS TEXT[]
 STABLE
AS $$
BEGIN
  RETURN coalesce(
    string_to_array(nullif(current_setting('request.jwt.claim.scopes', true), ''), ','),
    string_to_array(nullif(current_setting('request.jwt.claims', true)::JSONB->>'scopes', ''), ','),
    string_to_array(nullif(current_setting('jwt.claims.scopes', true), ''), ','),
    string_to_array(nullif(current_setting('jwt.claims', true)::JSONB->>'scopes', ''), ',')
  )::TEXT[];
END;
$$ LANGUAGE plpgsql;

GRANT USAGE ON SCHEMA auth to authenticated;

GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.grant() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.scopes() TO authenticated;



CREATE TABLE auth.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email CITEXT NOT NULL UNIQUE,
    encrypted_password VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMPTZ,
    verification_token UUID,
    verification_sent_at TIMESTAMPTZ,
    raw_user_meta_data JSONB DEFAULT '{}'::JSONB NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
    banned_until TIMESTAMPTZ,
    email_change VARCHAR(255),
    email_change_sent_at TIMESTAMPTZ,
    email_change_token UUID,
    recovery_token UUID,
    recovery_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_email_change_combination UNIQUE (email_change, email_change_token)
);

CREATE TABLE auth.mfa (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email BOOLEAN DEFAULT TRUE NOT NULL,
    totp BOOLEAN DEFAULT FALSE NOT NULL,
    totp_secret VARCHAR(255),
    totp_verified_at TIMESTAMPTZ,
    email_code VARCHAR(8),
    email_code_sent_at TIMESTAMPTZ
);

CREATE TABLE auth.refresh_tokens (
    id SERIAL PRIMARY KEY,
    token UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID,
    grant_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_refresh_token_combination UNIQUE (user_id, session_id, grant_type, token)
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

CREATE OR REPLACE FUNCTION auth.delete_unverified_users()
RETURNS void AS $$
BEGIN
    DELETE FROM auth.users
    WHERE email_verified_at IS NULL
    AND verification_sent_at + INTERVAL '24 hours' < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION auth.encrypt_password()
RETURNS TRIGGER AS $$
BEGIN
    NEW.encrypted_password := crypt(NEW.encrypted_password, gen_salt('bf'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER encrypt_password_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.encrypt_password();



CREATE TABLE public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username CITEXT NOT NULL UNIQUE,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

GRANT UPDATE (username, is_private) ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;



CREATE TABLE public.organizations (
    id SERIAL PRIMARY KEY,
    name CITEXT NOT NULL UNIQUE,
    display_name VARCHAR(255),
    description TEXT,
    readme TEXT,
    email VARCHAR(255),
    url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ
);

GRANT INSERT (name, display_name, description, readme, email, url) ON TABLE public.organizations TO authenticated;
GRANT UPDATE (name, display_name, description, readme, email, url) ON TABLE public.organizations TO authenticated;
GRANT DELETE ON TABLE public.organizations TO authenticated;
GRANT SELECT ON TABLE public.organizations TO anon;
GRANT SELECT ON TABLE public.organizations TO authenticated;



CREATE TABLE public.projects (
    id SERIAL PRIMARY KEY,
    name CITEXT NOT NULL,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    readme TEXT,
    email VARCHAR(255),
    url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_project_combination UNIQUE (name, organization_id)
);

GRANT INSERT (name, organization_id, description, readme, email, url) ON TABLE public.projects TO authenticated;
GRANT UPDATE (name, description, readme, email, url) ON TABLE public.projects TO authenticated;
GRANT DELETE ON TABLE public.projects TO authenticated;
GRANT SELECT ON TABLE public.projects TO anon;
GRANT SELECT ON TABLE public.projects TO authenticated;



CREATE TABLE public.oauth2_apps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_id UUID NOT NULL UNIQUE,
    client_secret VARCHAR(255) NOT NULL,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    homepage_url VARCHAR(255),
    redirect_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_organization_oauth2_apps_combination UNIQUE (name, organization_id)
);

GRANT INSERT (name, organization_id, description, homepage_url, redirect_url) ON TABLE public.oauth2_apps TO authenticated;
GRANT UPDATE (name, description, homepage_url, redirect_url) ON TABLE public.oauth2_apps TO authenticated;
GRANT DELETE ON TABLE public.oauth2_apps TO authenticated;
GRANT SELECT ON TABLE public.oauth2_apps TO anon;
GRANT SELECT ON TABLE public.oauth2_apps TO authenticated;

CREATE OR REPLACE VIEW public.oauth2_apps_public AS
SELECT
    id,
    name,
    client_id,
    organization_id,
    description,
    homepage_url,
    redirect_url
FROM public.oauth2_apps;

GRANT SELECT ON public.oauth2_apps_public TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_client_credentials()
RETURNS TRIGGER AS $$
BEGIN
    NEW.client_id := uuid_generate_v4();
    NEW.client_secret := md5(random()::text || clock_timestamp()::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_client_credentials_trigger
BEFORE INSERT ON public.oauth2_apps
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_credentials();

CREATE OR REPLACE FUNCTION public.generate_new_client_secret(app_id INT)
RETURNS VOID AS $$
BEGIN
    IF (
        auth.grant() = 'password' AND
        EXISTS (
            SELECT 1
            FROM public.oauth2_apps oa
            JOIN public.organization_members om ON oa.organization_id = om.organization_id
            WHERE oa.id = app_id
                AND om.member_id = auth.uid()
                AND om.role IN ('Owner', 'Admin')
        )
    ) THEN
        UPDATE public.oauth2_apps
        SET client_secret = md5(random()::text || clock_timestamp()::text)
        WHERE id = app_id;
    ELSE
        RAISE sqlstate '42501' USING
            message = 'Insufficient Privilege';
    END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.generate_new_client_secret(INT) TO authenticated;



CREATE TABLE public.scopes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    type VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ
);

GRANT SELECT ON TABLE public.scopes TO authenticated;



CREATE TABLE public.oauth2_app_scopes (
    id SERIAL PRIMARY KEY,
    app_id INT REFERENCES public.oauth2_apps(id) ON DELETE CASCADE NOT NULL,
    scope_id INT REFERENCES public.scopes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_oauth2_app_scopes_combination UNIQUE (app_id, scope_id)
);

GRANT INSERT (app_id, scope_id) ON TABLE public.oauth2_app_scopes TO authenticated;
GRANT DELETE ON TABLE public.oauth2_app_scopes TO authenticated;
GRANT SELECT ON TABLE public.oauth2_app_scopes TO anon;
GRANT SELECT ON TABLE public.oauth2_app_scopes TO authenticated;



CREATE TABLE auth.oauth2_authorization_tokens (
    id SERIAL PRIMARY KEY,
    token UUID NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    app_id INT REFERENCES public.oauth2_apps(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_oauth2_authorization_tokens_combination UNIQUE (user_id, app_id)
);

CREATE TABLE auth.oauth2_authorization_token_scopes (
    id SERIAL PRIMARY KEY,
    token_id INT REFERENCES auth.oauth2_authorization_tokens(id) ON DELETE CASCADE NOT NULL,
    scope_id INT REFERENCES public.scopes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_oauth2_authorization_token_scopes_combination UNIQUE (token_id, scope_id)
);

CREATE TABLE auth.oauth2_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    app_id INT REFERENCES public.oauth2_apps(id) ON DELETE CASCADE NOT NULL,
    refresh_token_id INT REFERENCES auth.refresh_tokens(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_oauth2_connections_combination UNIQUE (user_id, app_id)
);



CREATE OR REPLACE FUNCTION auth.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.create_profile_for_user();
