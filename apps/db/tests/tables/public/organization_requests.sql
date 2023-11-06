BEGIN;

SELECT plan(35);

SELECT has_table('organization_requests', 'public.organization_requests table exists');

SELECT has_column('organization_requests', 'id', 'id is a column in public.organization_requests');
SELECT has_column('organization_requests', 'organization_id', 'organization_id is a column in public.organization_requests');
SELECT has_column('organization_requests', 'addressee_id', 'addressee_id is a column in public.organization_requests');
SELECT has_column('organization_requests', 'role', 'role is a column in public.organization_requests');
SELECT has_column('organization_requests', 'created_at', 'created_at is a column in public.organization_requests');
SELECT has_column('organization_requests', 'updated_at', 'updated_at is a column in public.organization_requests');

SELECT has_check('organization_requests', 'public.organization_requests has a check constraint');

SELECT col_has_check('organization_requests', 'role', 'role has a check constrain');

SELECT column_privs_are('organization_requests', 'organization_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on organization_id');
SELECT column_privs_are('organization_requests', 'addressee_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on addressee_id');
SELECT column_privs_are('organization_requests', 'role', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on role');

SELECT table_privs_are('organization_requests', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT and DELETE privileges on public.organization_requests');

SELECT col_is_pk('organization_requests', 'id', 'id is a primary key');

SELECT fk_ok('organization_requests', 'organization_id', 'organizations', 'id', 'organization_id references to public.organizations(id)');
SELECT fk_ok('public', 'organization_requests', 'addressee_id', 'auth', 'users', 'id', 'addressee_id references to auth.users(id)');

SELECT col_is_unique('organization_requests', ARRAY['organization_id', 'addressee_id'], 'organization_id and addressee_id have a unique constraint');

SELECT col_type_is('organization_requests', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('organization_requests', 'organization_id', 'integer', 'organization_id is of type integer');
SELECT col_type_is('organization_requests', 'addressee_id', 'uuid', 'addressee_id is of type uuid');
SELECT col_type_is('organization_requests', 'role', 'character varying(255)', 'role is of type varchar(255)');
SELECT col_type_is('organization_requests', 'created_at', 'timestamp with time zone', 'created_at is of type timestamptz');
SELECT col_type_is('organization_requests', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('organization_requests', 'role', 'Member', 'role has default Member');
SELECT col_default_is('organization_requests', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

SELECT col_not_null('organization_requests', 'organization_id', 'organization_id has a NOT NULL constraint');
SELECT col_not_null('organization_requests', 'addressee_id', 'addressee_id has a NOT NULL constraint');
SELECT col_not_null('organization_requests', 'role', 'role has a NOT NULL constraint');
SELECT col_not_null('organization_requests', 'created_at', 'created_at has a NOT NULL constraint');

SELECT col_is_null('organization_requests', 'updated_at', 'updated_at has a NOT NULL constraint');

PREPARE insert_member_role AS INSERT INTO public.organization_requests (organization_id, addressee_id, role) VALUES (1, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Member');
SELECT throws_ok('insert_member_role', '23503', 'insert or update on table "organization_requests" violates foreign key constraint "organization_requests_organization_id_fkey"', 'Should get an violation for foreign key constraint "organization_requests_organization_id_fkey" for valid role Member');

PREPARE insert_moderator_role AS INSERT INTO public.organization_requests (organization_id, addressee_id, role) VALUES (2, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Moderator');
SELECT throws_ok('insert_moderator_role', '23503', 'insert or update on table "organization_requests" violates foreign key constraint "organization_requests_organization_id_fkey"', 'Should get an violation for foreign key constraint "organization_requests_organization_id_fkey" for valid role Moderator');

PREPARE insert_admin_role AS INSERT INTO public.organization_requests (organization_id, addressee_id, role) VALUES (3, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Admin');
SELECT throws_ok('insert_admin_role', '23503', 'insert or update on table "organization_requests" violates foreign key constraint "organization_requests_organization_id_fkey"', 'Should get an violation for foreign key constraint "organization_requests_organization_id_fkey" for valid role Admin');

PREPARE insert_owner_role AS INSERT INTO public.organization_requests (organization_id, addressee_id, role) VALUES (4, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Owner');
SELECT throws_ok('insert_owner_role', '23503', 'insert or update on table "organization_requests" violates foreign key constraint "organization_requests_organization_id_fkey"', 'Should get an violation for foreign key constraint "organization_requests_organization_id_fkey" for valid role Owner');

PREPARE insert_invalid_role AS INSERT INTO public.organization_requests (organization_id, addressee_id, role) VALUES (5, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'InvalidRole');
SELECT throws_ok('insert_invalid_role', '23514', 'new row for relation "organization_requests" violates check constraint "organization_requests_role_check"', 'Should get a violation for check constraint "organization_requests_role_check" for invalid role');

ROLLBACK;
