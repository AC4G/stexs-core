BEGIN;

SELECT plan(36);

SELECT has_table('project_requests', 'public.project_requests table exists');

SELECT has_column('project_requests', 'id', 'id is a column in public.project_requests');
SELECT has_column('project_requests', 'project_id', 'project_id is a column in public.project_requests');
SELECT has_column('project_requests', 'addressee_id', 'addressee_id is a column in public.project_requests');
SELECT has_column('project_requests', 'role', 'role is a column in public.project_requests');
SELECT has_column('project_requests', 'created_at', 'created_at is a column in public.project_requests');
SELECT has_column('project_requests', 'updated_at', 'updated_at is a column in public.project_requests');

SELECT has_check('project_requests', 'public.project_requests has a check constraint');

SELECT col_has_check('project_requests', 'role', 'role has a check constraint');

SELECT column_privs_are('project_requests', 'project_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on project_id');
SELECT column_privs_are('project_requests', 'addressee_id', 'authenticated', ARRAY['SELECT', 'INSERT'], 'authenticated role has SELECT and INSERT privileges on addressee_id');
SELECT column_privs_are('project_requests', 'role', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE'], 'authenticated role has SELECT, INSERT and UPDATE privileges on role');

SELECT table_privs_are('project_requests', 'authenticated', ARRAY['SELECT', 'DELETE'], 'authenticated role has SELECT and DELETE privileges on public.project_requests');

SELECT col_is_pk('project_requests', 'id', 'id is a primary key');

SELECT fk_ok('project_requests', 'project_id', 'projects', 'id', 'id references to public.projects(id)');
SELECT fk_ok('public', 'project_requests', 'addressee_id', 'auth', 'users', 'id', 'addressee_id references to auth.users(id)');

SELECT col_is_unique('project_requests', ARRAY['project_id', 'addressee_id'], 'project_id and addressee_id have a unique constraint');

SELECT col_type_is('project_requests', 'id', 'integer', 'id is of type integer');
SELECT col_type_is('project_requests', 'project_id', 'integer', 'project_id is of type integer');
SELECT col_type_is('project_requests', 'addressee_id', 'uuid', 'addressee_id is of type uuid');
SELECT col_type_is('project_requests', 'role', 'character varying(255)', 'role is of type varchar(255)');
SELECT col_type_is('project_requests', 'created_at', 'timestamp with time zone', 'created_ata is of type timestamptz');
SELECT col_type_is('project_requests', 'updated_at', 'timestamp with time zone', 'updated_at is of type timestamptz');

SELECT col_default_is('project_requests', 'role', 'Member', 'role has a default Member');
SELECT col_default_is('project_requests', 'created_at', 'CURRENT_TIMESTAMP', 'created_at has a default CURRENT_TIMESTAMP');

SELECT col_not_null('project_requests', 'project_id', 'project_id has a NOT NULL constraint');
SELECT col_not_null('project_requests', 'addressee_id', 'addressee_id has a NOT NULL constraint');
SELECT col_not_null('project_requests', 'role', 'role has a NOT NULL constraint');
SELECT col_not_null('project_requests', 'created_at', 'created_at has a NOT NULL constraint');

SELECT col_is_null('project_requests', 'updated_at', 'updated_at has a NULL constraint');

PREPARE insert_member_role AS INSERT INTO public.project_requests (project_id, addressee_id, role) VALUES (1, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Member');
SELECT throws_ok('insert_member_role', '23503', 'insert or update on table "project_requests" violates foreign key constraint "project_requests_project_id_fkey"', 'Should get an violation for foreign key constraint "project_requests_project_id_fkey" for valid role Member');

PREPARE insert_editor_role AS INSERT INTO public.project_requests (project_id, addressee_id, role) VALUES (1, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Editor');
SELECT throws_ok('insert_editor_role', '23503', 'insert or update on table "project_requests" violates foreign key constraint "project_requests_project_id_fkey"', 'Should get an violation for foreign key constraint "project_requests_project_id_fkey" for valid role Editor');

PREPARE insert_moderator_role AS INSERT INTO public.project_requests (project_id, addressee_id, role) VALUES (2, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Moderator');
SELECT throws_ok('insert_moderator_role', '23503', 'insert or update on table "project_requests" violates foreign key constraint "project_requests_project_id_fkey"', 'Should get an violation for foreign key constraint "project_requests_project_id_fkey" for valid role Moderator');

PREPARE insert_admin_role AS INSERT INTO public.project_requests (project_id, addressee_id, role) VALUES (3, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Admin');
SELECT throws_ok('insert_admin_role', '23503', 'insert or update on table "project_requests" violates foreign key constraint "project_requests_project_id_fkey"', 'Should get an violation for foreign key constraint "project_requests_project_id_fkey" for valid role Admin');

PREPARE insert_owner_role AS INSERT INTO public.project_requests (project_id, addressee_id, role) VALUES (4, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'Owner');
SELECT throws_ok('insert_owner_role', '23503', 'insert or update on table "project_requests" violates foreign key constraint "project_requests_project_id_fkey"', 'Should get an violation for foreign key constraint "project_requests_project_id_fkey" for valid role Owner');

PREPARE insert_invalid_role AS INSERT INTO public.project_requests (project_id, addressee_id, role) VALUES (5, '75336027-7f85-494b-8f25-910e41c9af73'::UUID, 'InvalidRole');
SELECT throws_ok('insert_invalid_role', '23514', 'new row for relation "project_requests" violates check constraint "project_requests_role_check"', 'Should get a violation for check constraint "project_requests_role_check" for invalid role');

ROLLBACK;
