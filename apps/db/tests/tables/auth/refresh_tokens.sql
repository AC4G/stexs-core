BEGIN;

SELECT plan(24);

SELECT has_table('auth', 'refresh_tokens', 'auth.refresh_tokens table exists');

SELECT has_column('auth', 'refresh_tokens', 'id', 'id is a column in auth.refresh_tokens');
SELECT has_column('auth', 'refresh_tokens', 'token', 'token is a column in auth.refresh_tokens');
SELECT has_column('auth', 'refresh_tokens', 'user_id', 'user_id is a column in auth.refresh_tokens');
SELECT has_column('auth', 'refresh_tokens', 'session_id', 'session_id is a column in auth.refresh_tokens');
SELECT has_column('auth', 'refresh_tokens', 'grant_type', 'grant_type is a column in auth.refresh_tokens');
SELECT has_column('auth', 'refresh_tokens', 'created_at', 'created_at is a column in auth.refresh_tokens');
SELECT has_column('auth', 'refresh_tokens', 'updated_at', 'updated_at is a column in auth.refresh_tokens');

SELECT col_is_pk('auth', 'refresh_tokens', 'id', 'id is a primary key');

SELECT col_is_unique('auth', 'refresh_tokens', ARRAY['user_id', 'session_id', 'grant_type', 'token'], 'user_id, session_id, grant_type and token have a unique constraint');

SELECT fk_ok('auth', 'refresh_tokens', 'user_id', 'auth', 'users', 'id', 'user_id references to auth.users(id)');

SELECT col_type_is('auth', 'refresh_tokens', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('auth', 'refresh_tokens', 'token', 'uuid', 'token is of type uuid');
SELECT col_type_is('auth', 'refresh_tokens', 'user_id', 'uuid', 'user_id is of type uuid');
SELECT col_type_is('auth', 'refresh_tokens', 'session_id', 'uuid', 'session_id is of type uuid');
SELECT col_type_is('auth', 'refresh_tokens', 'grant_type', 'character varying(50)', 'grant_type is of type varchar(50)');
SELECT col_type_is('auth', 'refresh_tokens', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('auth', 'refresh_tokens', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('auth', 'refresh_tokens', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMPTZ');

SELECT col_not_null('auth', 'refresh_tokens', 'token', 'token has a NOT NULL constraint');
SELECT col_not_null('auth', 'refresh_tokens', 'user_id', 'user_id has a NOT NULL constraint');
SELECT col_not_null('auth', 'refresh_tokens', 'grant_type', 'grant_type has a NOT NULL constraint');

SELECT col_is_null('auth', 'refresh_tokens', 'session_id', 'session_id has a NULL constraint');
SELECT col_is_null('auth', 'refresh_tokens', 'updated_at', 'updated_at has a NULL constraint');

ROLLBACK;
