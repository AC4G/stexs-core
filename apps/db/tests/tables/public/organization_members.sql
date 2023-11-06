BEGIN;

SELECT plan(31);

SELECT has_table('organization_members', 'public.organization_members table exists');

SELECT has_column('organization_members', 'id', 'id is a column in public.organization_members');
SELECT has_column('organization_members', 'organization_id', 'organization_id is a column in public.organization_members');
SELECT has_column('organization_members', 'member_id', 'member_id is a column in public.organization_members');
SELECT has_column('organization_members', 'role', 'role is a column in public.organization_members');
SELECT has_column('organization_members', 'created_at', 'created_at is a column in public.organization_members');
SELECT has_column('organization_members', 'updated_at', 'updated_at is a column in public.organization_members');

SELECT has_check('organization_members', 'public.organization_members has a check constraint');

SELECT col_has_check('organization_members', 'role', 'role has a check constraint');

SELECT column_privs_are('organization_members', 'organization_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on organization_id');
SELECT column_privs_are('organization_members', 'member_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on member_id');
SELECT column_privs_are('organization_members', 'role', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on role');

SELECT table_privs_are('organization_members', 'anon', ARRAY['SELECT'], 'anon role has SELECT privilege on public.organization_members');
SELECT table_privs_are('organization_members', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT and DELETE privileges on public.organization_members');

SELECT col_is_pk('organization_members', 'id', 'id is a primary key');

SELECT fk_ok('organization_members', 'organization_id', 'organizations', 'id', 'organization_id referecnes to public.organizations(id)');
SELECT fk_ok('public', 'organization_members', 'member_id', 'auth', 'users', 'id', 'member_id references to auth.users(id)');

SELECT col_is_unique('organization_members', ARRAY['organization_id', 'member_id'], 'organization_id and member_id have a unique constraint');

SELECT col_type_is('organization_members', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('organization_members', 'organization_id', 'integer', 'organization_id is of type integer');
SELECT col_type_is('organization_members', 'member_id', 'uuid', 'member_id is of type uuid');
SELECT col_type_is('organization_members', 'role', 'character varying(255)', 'role is of type varchar(255)');
SELECT col_type_is('organization_members', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('organization_members', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('organization_members', 'role', 'Member', 'role has a default Member');
SELECT col_default_is('organization_members', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

SELECT col_not_null('organization_members', 'organization_id', 'organization_id has a NOT NULL constraint');
SELECT col_not_null('organization_members', 'member_id', 'member_id has a NOT NULL constraint');
SELECT col_not_null('organization_members', 'role', 'role has a NOT NULL constraint');
SELECT col_not_null('organization_members', 'created_at', 'created_at has a NOT NULL constraint');

SELECT col_is_null('organization_members', 'updated_at', 'updated_at has a NULL constraint');

ROLLBACK;
