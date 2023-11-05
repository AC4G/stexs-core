BEGIN;

SELECT plan(20);

SELECT has_table('auth', 'oauth2_authorization_tokens', 'auth.oauth2_authorization_tokens table exists');

SELECT has_column('auth', 'oauth2_authorization_tokens', 'id', 'id is a column in auth.oauth2_authorization_tokens');
SELECT has_column('auth', 'oauth2_authorization_tokens', 'token', 'token is a column in auth.oauth2_authorization_tokens');
SELECT has_column('auth', 'oauth2_authorization_tokens', 'user_id', 'user_id is a column in auth.oauth2_authorization_tokens');
SELECT has_column('auth', 'oauth2_authorization_tokens', 'app_id', 'app_id is a column in auth.oauth2_authorization_tokens');
SELECT has_column('auth', 'oauth2_authorization_tokens', 'created_at', 'created_at is a column in auth.oauth2_authorization_tokens');

SELECT col_is_pk('auth', 'oauth2_authorization_tokens', 'id', 'id is a primary key');

SELECT fk_ok('auth', 'oauth2_authorization_tokens', 'user_id', 'auth', 'users', 'id', 'user_id references to auth.users(id)');
SELECT fk_ok('auth', 'oauth2_authorization_tokens', 'app_id', 'public', 'oauth2_apps', 'id', 'app_id references to public.oauth2_apps(id)');

SELECT col_is_unique('auth', 'oauth2_authorization_tokens', 'token', 'token has a unique constraint');
SELECT col_is_unique('auth', 'oauth2_authorization_tokens', ARRAY['user_id', 'app_id'], 'user_id and app_id have a unique cosntraint');

SELECT col_type_is('auth', 'oauth2_authorization_tokens', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('auth', 'oauth2_authorization_tokens', 'token', 'uuid', 'token is of type uuid');
SELECT col_type_is('auth', 'oauth2_authorization_tokens', 'user_id', 'uuid', 'user_id is of type uuid');
SELECT col_type_is('auth', 'oauth2_authorization_tokens', 'app_id', 'integer', 'app_id is of type integer');
SELECT col_type_is('auth', 'oauth2_authorization_tokens', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');

SELECT col_default_is('auth', 'oauth2_authorization_tokens', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMP');

SELECT col_not_null('auth', 'oauth2_authorization_tokens', 'token', 'token has a NOT NULL constraint');
SELECT col_not_null('auth', 'oauth2_authorization_tokens', 'user_id', 'user_id has a NOT NULL constraint');
SELECT col_not_null('auth', 'oauth2_authorization_tokens', 'app_id', 'app_id has a NOT NULL constraint');

ROLLBACK;
