BEGIN;

SELECT plan(22);

SELECT has_table('auth', 'mfa', 'auth.mfa table exists');

SELECT has_column('auth', 'mfa', 'user_id', 'user_id is a column in auth.mfa');
SELECT has_column('auth', 'mfa', 'email', 'email is a column in auth.mfa');
SELECT has_column('auth', 'mfa', 'totp', 'totp is a column in auth.mfa');
SELECT has_column('auth', 'mfa', 'totp_secret', 'totp_secret is a column in auth.mfa');
SELECT has_column('auth', 'mfa', 'totp_verified_at', 'totp_verified_at is a column in auth.mfa');
SELECT has_column('auth', 'mfa', 'email_code', 'email_code is a column in auth.mfa');
SELECT has_column('auth', 'mfa', 'email_code_sent_at', 'email_code_sent_at is a column in auth.mfa');

SELECT fk_ok('auth', 'mfa', 'user_id', 'auth', 'users', 'id', 'user_id references to auth.users(id)');

SELECT col_type_is('auth', 'mfa', 'user_id', 'uuid', 'user_id is of type uuid');
SELECT col_type_is('auth', 'mfa', 'email', 'boolean', 'email is of type boolean');
SELECT col_type_is('auth', 'mfa', 'totp', 'boolean', 'totp is of type boolean');
SELECT col_type_is('auth', 'mfa', 'totp_secret', 'character varying(255)', 'totp_secret is of type varchar(255)');
SELECT col_type_is('auth', 'mfa', 'totp_verified_at', 'timestamp with time zone', 'totp_verified_at is of type timestamptz');
SELECT col_type_is('auth', 'mfa', 'email_code', 'character varying(8)', 'email_code is of type varchar(8)');
SELECT col_type_is('auth', 'mfa', 'email_code_sent_at', 'timestamp with time zone', 'email_code_sent_atis of type timestamptz');

SELECT col_default_is('auth', 'mfa', 'email', TRUE, 'email has default TRUE');
SELECT col_default_is('auth', 'mfa', 'totp', FALSE, 'totp has default FALSE');

SELECT col_is_null('auth', 'mfa', 'totp_secret', 'totp_secret has a NULL constraint');
SELECT col_is_null('auth', 'mfa', 'totp_verified_at', 'totp_verified_at has a NULL constraint');
SELECT col_is_null('auth', 'mfa', 'email_code', 'email_code has a NULL constraint');
SELECT col_is_null('auth', 'mfa', 'email_code_sent_at', 'email_code_sent_at has a NULL constraint');

ROLLBACK;
