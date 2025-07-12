CREATE SCHEMA IF NOT EXISTS auth;

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

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO anon;

GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.grant() TO authenticated;
