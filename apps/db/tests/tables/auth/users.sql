BEGIN;

SELECT plan(55);

SELECT has_table('auth', 'users', 'auth.users table exists');

SELECT has_column('auth', 'users', 'id', 'id is a column in auth.users');
SELECT has_column('auth', 'users', 'email', 'email is a column in auth.users');
SELECT has_column('auth', 'users', 'encrypted_password', 'encrypted_password is a column in auth.users');
SELECT has_column('auth', 'users', 'email_verified_at', 'email_verified_at is a column in auth.users');
SELECT has_column('auth', 'users', 'verification_token', 'verification_token is a column in auth.users');
SELECT has_column('auth', 'users', 'verification_sent_at', 'verification_sent_at is a column in auth.users');
SELECT has_column('auth', 'users', 'raw_user_meta_data', 'raw_user_meta_data is a column in auth.users');
SELECT has_column('auth', 'users', 'is_super_admin', 'is_super_admin is a column in auth.users');
SELECT has_column('auth', 'users', 'banned_until', 'banned_until is a column in auth.users');
SELECT has_column('auth', 'users', 'email_change', 'email_change is a column in auth.users');
SELECT has_column('auth', 'users', 'email_change_sent_at', 'email_change_sent_at is a column in auth.users');
SELECT has_column('auth', 'users', 'email_change_token', 'email_change_token is a column in auth.users');
SELECT has_column('auth', 'users', 'recovery_token', 'recovery_token is a column in auth.users');
SELECT has_column('auth', 'users', 'recovery_sent_at', 'recovery_sent_at is a column in auth.users');
SELECT has_column('auth', 'users', 'created_at', 'created_at is a column in auth.users');
SELECT has_column('auth', 'users', 'updated_at', 'updated_at is a column in auth.users');

SELECT col_is_pk('auth', 'users', 'id', 'id is a primary key');

SELECT col_is_unique('auth', 'users', 'email', 'email has a unique constraint');
SELECT col_is_unique('auth', 'users', ARRAY['email_change', 'email_change_token'], 'email_change and email_change_token have a unique constraint');

SELECT col_type_is('auth', 'users', 'id', 'uuid', 'id is of type uuid');
SELECT col_type_is('auth', 'users', 'email', 'citext', 'email is of type citext');
SELECT col_type_is('auth', 'users', 'encrypted_password', 'character varying(255)', 'encrypted_password is of type varchar(255)');
SELECT col_type_is('auth', 'users', 'email_verified_at', 'timestamp with time zone', 'email_verified_at is of type timestamptz');
SELECT col_type_is('auth', 'users', 'verification_token', 'uuid', 'verification_token is of type uuid');
SELECT col_type_is('auth', 'users', 'verification_sent_at', 'timestamp with time zone', 'verification_sent_at is of type timestamptz');
SELECT col_type_is('auth', 'users', 'raw_user_meta_data', 'jsonb', 'raw_user_meta_data is of type jsonb');
SELECT col_type_is('auth', 'users', 'is_super_admin', 'boolean', 'is_super_admin is of type boolean');
SELECT col_type_is('auth', 'users', 'banned_until', 'timestamp with time zone', 'banned_until is of type timestamptz');
SELECT col_type_is('auth', 'users', 'email_change', 'character varying(255)', 'email_change is of type varchar(255)');
SELECT col_type_is('auth', 'users', 'email_change_sent_at', 'timestamp with time zone', 'email_change_sent_at is of type timestamptz');
SELECT col_type_is('auth', 'users', 'email_change_token', 'uuid', 'email_change_token is of type uuid');
SELECT col_type_is('auth', 'users', 'recovery_token', 'uuid', 'recovery_token is of type uuid');
SELECT col_type_is('auth', 'users', 'recovery_sent_at', 'timestamp with time zone', 'recovery_sent_at is of type timestamptz');
SELECT col_type_is('auth', 'users', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('auth', 'users', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('auth', 'users', 'id', 'uuid_generate_v4()', 'id has default uuid_generate_v4()');
SELECT col_default_is('auth', 'users', 'is_super_admin', FALSE, 'is_super_admin has default FALSE');
SELECT col_default_is('auth', 'users', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has default CURRENT_TIMESTAMP');
SELECT col_default_is('auth', 'users', 'raw_user_meta_data', '{}', 'raw_user_meta_data has default {}');

SELECT col_not_null('auth', 'users', 'email', 'email has a NOT NULL constraint');
SELECT col_not_null('auth', 'users', 'encrypted_password', 'encrypted_password has a NOT NULL constraint');
SELECT col_not_null('auth', 'users', 'raw_user_meta_data', 'raw_user_meta_data has a NOT NULL constraint');
SELECT col_not_null('auth', 'users', 'is_super_admin', 'is_super_admin has a NOT NULL constraint');
SELECT col_not_null('auth', 'users', 'created_at', 'created_at has a NOT NULL constraint');

SELECT col_is_null('auth', 'users', 'email_verified_at', 'email_verified_at has a NULL constraint');
SELECT col_is_null('auth', 'users', 'verification_token', 'verification_token has a NULL constraint');
SELECT col_is_null('auth', 'users', 'verification_sent_at', 'verification_sent_at has a NULL constraint');
SELECT col_is_null('auth', 'users', 'banned_until', 'banned_until has a NULL constraint');
SELECT col_is_null('auth', 'users', 'email_change', 'email_change has a NULL constraint');
SELECT col_is_null('auth', 'users', 'email_change_sent_at', 'email_change_sent_at has a NULL constraint');
SELECT col_is_null('auth', 'users', 'email_change_token', 'email_change_token has a NULL constraint');
SELECT col_is_null('auth', 'users', 'recovery_token', 'recovery_token has a NULL constraint');
SELECT col_is_null('auth', 'users', 'recovery_sent_at', 'recovery_sent_at has a NULL constraint');
SELECT col_is_null('auth', 'users', 'updated_at', 'updated_at has a NULL constraint');

ROLLBACK;
