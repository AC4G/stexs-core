BEGIN;

SELECT plan(5);

SELECT has_function('make_organization_creator_as_owner', 'Function public.make_organization_creator_as_owner() should exist');

SELECT is_normal_function('make_organization_creator_as_owner', 'Function public.make_organization_creator_as_owner() is a normal function');

SELECT has_trigger('organizations', 'make_organization_creator_as_owner_trigger', 'Table public.organizations has a trigger make_organization_creator_as_owner_trigger');

SELECT trigger_is('organizations', 'make_organization_creator_as_owner_trigger', 'make_organization_creator_as_owner', 'Trigger make_organization_creator_as_owner_trigger should call public.make_organization_creator_as_owner()');

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES ('bb753d90-a640-433b-b339-6632b57a0619'::UUID, 'test1@example.com', 'Test12345.', '{"username": "test1"}'::JSONB);

SELECT set_config('request.jwt.claim.grant_type', 'password', true);
SELECT set_config('request.jwt.claim.sub', 'bb753d90-a640-433b-b339-6632b57a0619', true);

INSERT INTO public.organizations (id, name) VALUES (1, 'test_organization');

SELECT ok(1 = (SELECT 1 FROM public.organization_members WHERE organization_id = 1 AND member_id = 'bb753d90-a640-433b-b339-6632b57a0619'::UUID AND role = 'Owner'), 'The creator of the organization should be insterted as a member of this organization and with a role Owner');

ROLLBACK;
