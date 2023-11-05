BEGIN;

SELECT plan(25);

SELECT has_table('auth', 'oauth2_connections', 'auth.oauth2_connections table exists');

SELECT has_column('auth', 'oauth2_connections', 'id', 'id is a column in auth.oauth2_connections');
SELECT has_column('auth', 'oauth2_connections', 'user_id', 'user_id is a column in auth.oauth2_connections');
SELECT has_column('auth', 'oauth2_connections', 'app_id', 'app_id is a column in auth.oauth2_connections');
SELECT has_column('auth', 'oauth2_connections', 'refresh_token_id', 'refresh_token_id is a column in auth.oauth2_connections');
SELECT has_column('auth', 'oauth2_connections', 'created_at', 'created_at is a column in auth.oauth2_connections');
SELECT has_column('auth', 'oauth2_connections', 'updated_at', 'updated_at is a column in auth.oauth2_connections');

SELECT col_is_pk('auth', 'oauth2_connections', 'id', 'id is a primary key');

SELECT fk_ok('auth', 'oauth2_connections', 'user_id', 'auth', 'users', 'id', 'user_id references to auth.users(id)');
SELECT fk_ok('auth', 'oauth2_connections', 'app_id', 'public', 'oauth2_apps', 'id', 'app_id references to public.oauth2_apps(id)');
SELECT fk_ok('auth', 'oauth2_connections', 'refresh_token_id', 'auth', 'refresh_tokens', 'id', 'refresh_token_id references to auth.refresh_tokens(id)');

SELECT col_is_unique('auth', 'oauth2_connections', 'refresh_token_id', 'refresh_token_id has a unique constraint');
SELECT col_is_unique('auth', 'oauth2_connections', ARRAY['user_id', 'app_id'], 'user_id and app_id have a unique constraint');

SELECT col_type_is('auth', 'oauth2_connections', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('auth', 'oauth2_connections', 'user_id', 'uuid', 'user_id is of type uuid');
SELECT col_type_is('auth', 'oauth2_connections', 'app_id', 'integer', 'app_id is of type integer');
SELECT col_type_is('auth', 'oauth2_connections', 'refresh_token_id', 'integer', 'refresh_token_id is of type integer');
SELECT col_type_is('auth', 'oauth2_connections', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('auth', 'oauth2_connections', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('auth', 'oauth2_connections', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMP');

SELECT col_not_null('auth', 'oauth2_connections', 'user_id', 'user_id has a NOT NULL constraint');
SELECT col_not_null('auth', 'oauth2_connections', 'app_id', 'app_id has a NOT NULL constraint');
SELECT col_not_null('auth', 'oauth2_connections', 'refresh_token_id', 'refresh_token_id has a NOT NULL constraint');
SELECT col_not_null('auth', 'oauth2_connections', 'created_at', 'created_at has a NOT NULL constraint');

SELECT col_is_null('auth', 'oauth2_connections', 'updated_at', 'updated_at has a NULL constraint');

ROLLBACK;