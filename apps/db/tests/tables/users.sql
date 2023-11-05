BEGIN;

SELECT plan(1);

SELECT has_table('auth', 'users', 'auth.users table exists');

ROLLBACK;
