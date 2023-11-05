BEGIN;

SELECT plan(16);

SELECT has_table('auth', 'oauth2_authorization_token_scopes', 'auth.oauth2_authorization_token_scopes table exists');

SELECT has_column('auth', 'oauth2_authorization_token_scopes', 'id', 'id is a column in auth.oauth2_authorization_token_scopes');
SELECT has_column('auth', 'oauth2_authorization_token_scopes', 'token_id', 'token_id is a column in auth.oauth2_authorization_token_scopes');
SELECT has_column('auth', 'oauth2_authorization_token_scopes', 'scope_id', 'scope_id is a column in auth.oauth2_authorization_token_scopes');
SELECT has_column('auth', 'oauth2_authorization_token_scopes', 'created_at', 'created_at is a column in auth.oauth2_authorization_token_scopes');

SELECT col_is_pk('auth', 'oauth2_authorization_token_scopes', 'id', 'id is a primary key');

SELECT fk_ok('auth', 'oauth2_authorization_token_scopes', 'token_id', 'auth', 'oauth2_authorization_tokens', 'id', 'token_id references to auth.oauth2_authorization_tokens(id)');
SELECT fk_ok('auth', 'oauth2_authorization_token_scopes', 'scope_id', 'public', 'scopes', 'id', 'scope_id references to public.scopes(id)');

SELECT col_is_unique('auth', 'oauth2_authorization_token_scopes', ARRAY['token_id', 'scope_id'], 'token_id and scope_id have a unique constraint');

SELECT col_type_is('auth', 'oauth2_authorization_token_scopes', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('auth', 'oauth2_authorization_token_scopes', 'token_id', 'integer', 'token_id is of type integer');
SELECT col_type_is('auth', 'oauth2_authorization_token_scopes', 'scope_id', 'integer', 'scope_id is of type integer');
SELECT col_type_is('auth', 'oauth2_authorization_token_scopes', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');

SELECT col_default_is('auth', 'oauth2_authorization_token_scopes', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMP');

SELECT col_not_null('auth', 'oauth2_authorization_token_scopes', 'token_id', 'token_id has a NOT NULL constraint');
SELECT col_not_null('auth', 'oauth2_authorization_token_scopes', 'scope_id', 'scope_id has a NOT NULL constraint');

ROLLBACK;
