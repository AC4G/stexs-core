CREATE SCHEMA IF NOT EXISTS utils;

GRANT USAGE ON SCHEMA utils TO authenticated;
GRANT USAGE ON SCHEMA utils TO anon;

CREATE OR REPLACE FUNCTION utils.is_url_valid(url TEXT, secure BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN AS $$
BEGIN
	IF secure THEN
		RETURN url ~ '^https:\/\/[^\s]+$';
	ELSE
		RETURN url ~ '^https?:\/\/[^\s]+$';
	END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION utils.is_url_valid(url TEXT, secure BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION utils.is_url_valid(url TEXT, secure BOOLEAN) TO anon;
