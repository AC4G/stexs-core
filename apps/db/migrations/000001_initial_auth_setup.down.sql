REVOKE ALL ON public.oauth2_app_scopes FROM anon;
REVOKE ALL ON public.scopes FROM anon;
REVOKE ALL ON public.oauth2_apps FROM anon;
REVOKE ALL ON public.projects FROM anon;
REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.profiles FROM anon;

DROP TRIGGER create_profile_trigger ON auth.users;
DROP FUNCTION public.create_profile_for_user();

DROP TABLE auth.oauth2_connections;
DROP TABLE auth.oauth2_authorization_token_scopes;
DROP TABLE auth.oauth2_authorization_tokens;
DROP TABLE public.oauth2_app_scopes;
DROP TABLE public.scopes;
DROP TABLE public.oauth2_apps;
DROP TABLE public.projects;
DROP TABLE public.organizations;
DROP TABLE public.profiles;

DROP TRIGGER encrypt_password_trigger ON auth.users;
DROP FUNCTION auth.encrypt_password();

DROP TRIGGER check_username_and_email_trigger ON auth.users;
DROP FUNCTION auth.check_username_and_email_before_insert();

DROP TRIGGER create_mfa_trigger ON auth.users;
DROP FUNCTION auth.create_mfa_for_user();

DROP TABLE auth.users;
DROP TABLE auth.mfa;

REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA auth FROM anon;
REVOKE USAGE ON SCHEMA extensions FROM anon;
REVOKE ALL ON auth.users FROM anon;
REVOKE ALL ON auth.mfa FROM anon;
REVOKE ALL ON auth.refresh_tokens FROM anon;

DROP ROLE anon;

DROP EXTENSION IF EXISTS "citext" CASCADE;
DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

DROP SCHEMA auth CASCADE;
DROP SCHEMA extensions CASCADE;
