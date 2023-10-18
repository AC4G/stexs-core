SET TIME ZONE 'UTC';

CREATE SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "citext";  

CREATE ROLE anon NOLOGIN;
GRANT anon TO postgres;
GRANT USAGE ON SCHEMA public to anon;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    email CITEXT NOT NULL UNIQUE,
    encrypted_password VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMPTZ NULL,
    verification_token UUID NULL,
    verification_sent_at TIMESTAMPTZ NULL,
    raw_user_meta_data JSONB NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    banned_until TIMESTAMPTZ NULL,
    email_change VARCHAR(255) NULL,
    email_change_sent_at TIMESTAMPTZ NULL,
    email_change_token UUID NULL,
    recovery_token UUID null,
    recovery_sent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT unique_email_change_combination UNIQUE (email_change, email_change_token)
);

CREATE TABLE auth.mfa (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email BOOLEAN DEFAULT TRUE,
    totp BOOLEAN DEFAULT FALSE,
    totp_secret VARCHAR(255) NULL,
    totp_verified_at TIMESTAMPTZ NULL,
    email_code VARCHAR(8) NULL,
    email_code_sent_at TIMESTAMPTZ NULL
);

CREATE TABLE auth.refresh_tokens (
    id SERIAL PRIMARY KEY,
    token UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID NULL,
    grant_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
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
    AND verification_sent_at + interval '24 hours' < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth.check_username_and_email_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM 1
    FROM public.profiles
    WHERE username = NEW.raw_user_meta_data->>'username';

    IF FOUND THEN
        RAISE EXCEPTION USING HINT = 'Please choose a different username';
    END IF;

    PERFORM 1
    FROM auth.users
    WHERE email = NEW.email;

    IF FOUND THEN
        RAISE EXCEPTION USING HINT = 'Please choose a different email';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_username_and_email_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.check_username_and_email_before_insert();

CREATE OR REPLACE FUNCTION auth.encrypt_password()
RETURNS TRIGGER AS $$
BEGIN
    NEW.encrypted_password := extensions.crypt(NEW.encrypted_password, extensions.gen_salt('bf'));
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_private BOOLEAN DEFAULT FALSE
);

CREATE TABLE public.organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NULL,
    description TEXT NULL,
    readme TEXT NULL,
    email VARCHAR(255) NULL,
    url VARCHAR(255) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL
);

CREATE TABLE public.projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE,
    description TEXT NULL,
    readme TEXT NULL,
    email VARCHAR(255) NULL,
    url VARCHAR(255) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT unique_project_combination UNIQUE (name, organization_id)
);

CREATE TABLE public.oauth2_apps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_id UUID NOT NULL UNIQUE,
    client_secret VARCHAR(255) NOT NULL,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE,
    description TEXT NULL,
    homepage_url VARCHAR(255) NOT NULL,
    redirect_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT unique_organization_oauth2_apps_combination UNIQUE (name, organization_id)
);

CREATE TABLE public.scopes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    type VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL
);

CREATE TABLE public.oauth2_app_scopes (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES public.oauth2_apps(id) ON DELETE CASCADE,
    scope_id INT REFERENCES public.scopes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_oauth2_app_scopes_combination UNIQUE (client_id, scope_id)
);

CREATE TABLE auth.oauth2_authorization_tokens (
    id SERIAL PRIMARY KEY,
    token UUID NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id INT REFERENCES public.oauth2_apps(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_oauth2_authorization_tokens_combination UNIQUE (user_id, client_id)
);

CREATE TABLE auth.oauth2_authorization_token_scopes (
    id SERIAL PRIMARY KEY,
    token_id INT REFERENCES auth.oauth2_authorization_tokens(id) ON DELETE CASCADE NOT NULL,
    scope_id INT REFERENCES public.scopes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_oauth2_authorization_token_scopes_combination UNIQUE (token_id, scope_id)
);

CREATE TABLE auth.oauth2_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id INT REFERENCES public.oauth2_apps(id) ON DELETE CASCADE NOT NULL,
    refresh_token_id INT REFERENCES auth.refresh_tokens(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT unique_oauth2_connections_combination UNIQUE (user_id, client_id)
);

CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');

    UPDATE auth.users
    SET raw_user_meta_data = NULL
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_user();

GRANT ALL ON public.profiles to anon;
GRANT ALL ON public.organizations to anon;
GRANT ALL ON public.projects to anon;
GRANT ALL ON public.oauth2_apps to anon;
GRANT ALL ON public.scopes to anon;
GRANT ALL ON public.oauth2_app_scopes to anon;
