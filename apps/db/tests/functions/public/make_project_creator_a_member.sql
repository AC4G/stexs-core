BEGIN;

SELECT plan(7);

SELECT has_function('make_project_creator_a_member', 'Function public.make_project_creator_a_member() should exist');

SELECT is_normal_function('make_project_creator_a_member', 'Function public.make_project_creator_a_member() is a normal function');

SELECT has_trigger('projects', 'make_project_creator_a_member_trigger', 'Table public.projects has a trigger make_project_creator_a_member_trigger');

SELECT trigger_is('projects', 'make_project_creator_a_member_trigger', 'make_project_creator_a_member', 'Trigger make_project_creator_a_member_trigger should call public.make_project_creator_a_member()');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test1@example.com', 'Test12345.', '{"username": "test1"}'::JSONB);

SELECT set_config('request.jwt.claim.grant_type', 'password', true);
SELECT set_config('request.jwt.claim.sub', 'bb753d90-a640-433b-b339-6632b57a0619', true);

INSERT INTO public.organizations (id, name) VALUES (1, 'test_organization');

INSERT INTO public.projects (id, name, organization_id) VALUES (1, 'test_project', 1);

SELECT ok(1 = (SELECT 1 FROM public.project_members WHERE project_id = 1 AND member_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID AND role = 'Owner'), 'The owner of the organization should be inserted as a member of the created project with a role Owner');

DELETE FROM public.projects WHERE id = 1;

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'test2@example.com', 'Test12345.', '{"username": "test2"}'::JSONB);

INSERT INTO public.organization_members (organization_id, member_id, role) VALUES (1, 'bb753d90-a640-433b-b339-6632b57a0620'::UUID, 'Admin');

SELECT set_config('request.jwt.claim.sub', 'bb753d90-a640-433b-b339-6632b57a0620', true);

INSERT INTO public.projects (id, name, organization_id) VALUES (1, 'test_project', 1);

SELECT ok(1 = (SELECT 1 FROM public.project_members WHERE project_id = 1 AND member_id = 'bb753d90-a640-433b-b339-6632b57a0620'::UUID AND role = 'Admin'), 'The creator of the project should be insterted as a member of this project with the same role as in organization');
SELECT ok(1 = (SELECT 1 FROM public.project_members WHERE project_id = 1 AND member_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID AND role = 'Owner'), 'The owner of the organization should also be inserted in the new project as a member');

ROLLBACK;
